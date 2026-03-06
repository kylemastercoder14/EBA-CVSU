"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTransitionNav } from "@/components/kiosk/PageTransitionProvider";
import {
  ShoppingCart,
  ShoppingBag,
  ArrowLeft,
  Mic,
  MicOff,
  Loader2,
  Plus,
  Minus,
  Trash2,
  Volume2,
} from "lucide-react";
import Image from "next/image";
import { type Product, PRODUCTS } from "@/lib/product";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";
import { NO_VARIANT_SIZE } from "@/validators/products";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type UserType = "student" | "visitor";
type DisplayProduct = Product & { stockCount?: number; backendId: string };
const kioskUserTypeStorageKey = "kiosk-user-type";
const kioskSignInStorageKey = "kiosk-sign-in";
const kioskAutoRefreshMs = 10_000;
const kioskVoiceTimeoutMs = 25_000;
const kioskVoiceLogStorageKey = "kiosk-voice-order-logs";

type SpeechRecognitionResultEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

type SpeechCapableWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

type ParsedVoiceOrder = {
  quantity: number;
  product: DisplayProduct | null;
  requestedSize: string | null;
  transcript: string;
};

type VoiceOrderDraft = {
  transcript: string;
  quantity: number;
  product: DisplayProduct | null;
  requestedSize: string | null;
  resolvedVariant: string;
  availableSizes: string[];
  canConfirm: boolean;
  message: string;
};

type VoiceOrderLog = {
  id: string;
  timestamp: string;
  transcript: string;
  status: "parsed" | "confirmed" | "error";
  itemCount: number;
};

type VoiceInterpretCatalogProduct = {
  name: string;
  category: string;
  sizes: string[];
};

type VoiceInterpretResponse = {
  normalizedTranscript?: string;
  usedAi?: boolean;
  provider?: string;
};

const splitByQuantityCues = (transcript: string) => {
  // Fallback splitter when speech recognition drops commas/"and" in long commands.
  const tokens = tokenizeVoiceText(transcript);
  const quantityCues = new Set([
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "to",
    "too",
    "for",
    "isa",
    "isang",
    "dalawa",
    "tatlo",
    "apat",
    "lima",
    "anim",
    "pito",
    "walo",
    "siyam",
    "sampu",
  ]);

  const segments: string[] = [];
  let current: string[] = [];
  let seenQuantityCue = false;
  let hasMeaningfulAfterQuantity = false;

  for (const token of tokens) {
    const isQuantityCue = /^\d{1,2}$/.test(token) || quantityCues.has(token);

    if (isQuantityCue && seenQuantityCue && hasMeaningfulAfterQuantity) {
      segments.push(current.join(" ").trim());
      current = [];
      seenQuantityCue = false;
      hasMeaningfulAfterQuantity = false;
    }

    current.push(token);

    if (isQuantityCue) {
      seenQuantityCue = true;
      hasMeaningfulAfterQuantity = false;
      continue;
    }

    if (seenQuantityCue && !fillerTokens.has(token)) {
      hasMeaningfulAfterQuantity = true;
    }
  }

  if (current.length > 0) {
    segments.push(current.join(" ").trim());
  }

  return segments.filter(Boolean);
};

const splitVoiceCommandIntoSegments = (transcript: string) => {
  const primarySegments = transcript
    .split(/\s*,\s*|\b(?:and then|then|and|at|tsaka)\b/gi)
    .map((segment) => segment.trim())
    .filter(Boolean);

  // Always run sub-splitting per segment to recover missing commas between items.
  return primarySegments
    .flatMap((segment) => splitByQuantityCues(segment))
    .filter(Boolean);
};

const normalizeVoiceText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\b(p)\s+(e)\b/g, "pe")
    .replace(/\bsize\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();

const numberWordMap: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  isa: 1,
  isang: 1,
  dalawa: 2,
  tatlo: 3,
  apat: 4,
  lima: 5,
  anim: 6,
  pito: 7,
  walo: 8,
  siyam: 9,
  sampu: 10,
};

const parseVoiceQuantity = (normalizedTranscript: string) => {
  const tokens = tokenizeVoiceText(normalizedTranscript);
  const quantityAliases: Record<string, number> = {
    ...numberWordMap,
    to: 2,
    too: 2,
    won: 1,
    for: 4,
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const nextToken = tokens[index + 1] ?? "";
    const previousToken = tokens[index - 1] ?? "";

    // "want to order" / "go to" style "to" should not count as quantity.
    if (
      (token === "to" || token === "too") &&
      (nextToken === "order" || previousToken === "want")
    ) {
      continue;
    }

    if (/^\d{1,2}$/.test(token)) {
      const nextIsSizeToken = /^(xl|xxl|xxxl|\dxl|2xl|3xl|4xl|5xl)$/i.test(
        nextToken,
      );
      if (nextIsSizeToken) {
        // "2 xl" is probably a size, not quantity.
        continue;
      }
      return Math.max(1, Math.min(99, Number(token)));
    }
    if (quantityAliases[token] != null) {
      return quantityAliases[token];
    }
    if (fillerTokens.has(token)) continue;
    // If the first meaningful token is not a quantity (e.g., "booklet"), default to 1.
    break;
  }

  return 1;
};

const fillerTokens = new Set([
  "i",
  "want",
  "to",
  "order",
  "gusto",
  "ko",
  "umorder",
  "um-order",
  "bumili",
  "pabili",
  "paki",
  "pakilagay",
  "please",
  "pa",
  "po",
  "the",
  "a",
  "an",
  "me",
  "for",
  "and",
  "size",
  "pcs",
  "pc",
  "piece",
  "pieces",
  "ng",
  "at",
  "tsaka",
]);

const genericProductTokens = new Set(["school", "official", "item"]);

const tokenizeVoiceText = (value: string) =>
  normalizeVoiceText(value).split(" ").filter(Boolean);

const extractRequestedSizeFromTranscript = (normalizedTranscript: string) => {
  const spacedNumericXl = normalizedTranscript.match(/\b([2-5])\s+xl\b/i)?.[1];
  if (spacedNumericXl) {
    return `${spacedNumericXl}xl`;
  }
  if (/\b(to|too)\s+xl\b/i.test(normalizedTranscript)) {
    return "2xl";
  }

  const tokenMatch = normalizedTranscript
    .match(
      /\b(5xl|4xl|3xl|2xl|xxxl|xxl|xl|small|medium|large|sm|md|lg)\b/i,
    )?.[1]
    ?.toLowerCase();
  if (tokenMatch) {
    if (tokenMatch === "sm") return "small";
    if (tokenMatch === "md") return "medium";
    if (tokenMatch === "lg") return "large";
    if (tokenMatch === "xxl") return "2xl";
    if (tokenMatch === "xxxl") return "3xl";
    return tokenMatch;
  }

  const compact = normalizedTranscript.replace(/[\s-]/g, "");
  const phrasePatterns: Array<[RegExp, string]> = [
    [/\bsmall\b/, "small"],
    [/\bmedium\b/, "medium"],
    [/\blarge\b/, "large"],
    [/\bextra large\b/, "xl"],
    [/\bx ?large\b/, "xl"],
    [/\bdouble extra large\b/, "2xl"],
    [/\btriple extra large\b/, "3xl"],
  ];

  for (const [pattern, key] of phrasePatterns) {
    if (pattern.test(normalizedTranscript)) return key;
  }

  const compactMatch = compact.match(/([1-5]?x{1,5}l|[1-5]xl)/i);
  if (compactMatch) {
    const raw = compactMatch[1].toLowerCase();
    if (raw === "xl" || raw === "1xl") return "xl";
    if (raw === "xxl" || raw === "2xl") return "2xl";
    if (raw === "xxxl" || raw === "3xl") return "3xl";
    if (raw === "xxxxl" || raw === "4xl") return "4xl";
    if (raw === "xxxxxl" || raw === "5xl") return "5xl";
    return raw;
  }

  const shortMatch = normalizedTranscript
    .match(/\b(xs|sm|md|lg)\b/i)?.[1]
    ?.toLowerCase();
  if (shortMatch) {
    if (shortMatch === "sm") return "small";
    if (shortMatch === "md") return "medium";
    if (shortMatch === "lg") return "large";
    return shortMatch;
  }

  return null;
};

const buildSizeAliasKeys = (size: string) => {
  const normalized = normalizeVoiceText(size);
  const aliases = new Set<string>([normalized, normalized.replace(/\s+/g, "")]);

  if (/\bsmall\b/.test(normalized)) aliases.add("small");
  if (/\bmedium\b/.test(normalized)) aliases.add("medium");
  if (/\blarge\b/.test(normalized) && !/\bextra\b/.test(normalized))
    aliases.add("large");

  const compact = normalized.replace(/[\s-]/g, "");
  const compactToKey: Record<string, string> = {
    xl: "xl",
    xxl: "2xl",
    xxxl: "3xl",
    xxxxl: "4xl",
    xxxxxl: "5xl",
    "1xl": "xl",
    "2xl": "2xl",
    "3xl": "3xl",
    "4xl": "4xl",
    "5xl": "5xl",
  };

  if (compactToKey[compact]) aliases.add(compactToKey[compact]);
  if (compact === "m") aliases.add("medium");
  if (compact === "s") aliases.add("small");
  if (compact === "l") aliases.add("large");

  return aliases;
};

const resolveProductSizeFromTranscript = (
  product: DisplayProduct,
  normalizedTranscript: string,
) => {
  const availableSizes = (product.sizes ?? []).filter(
    (size) => size !== NO_VARIANT_SIZE,
  );
  if (availableSizes.length === 0) {
    return {
      requestedSize: null as string | null,
      resolvedVariant: NO_VARIANT_SIZE,
      availableSizes,
    };
  }

  const requestedSize =
    extractRequestedSizeFromTranscript(normalizedTranscript);
  if (!requestedSize) {
    return {
      requestedSize: null,
      resolvedVariant: "",
      availableSizes,
    };
  }

  const matchedSize = availableSizes.find((size) =>
    buildSizeAliasKeys(size).has(requestedSize),
  );
  return {
    requestedSize,
    resolvedVariant: matchedSize ?? "",
    availableSizes,
  };
};

const scoreProductMatch = (
  product: DisplayProduct,
  normalizedTranscript: string,
) => {
  const transcriptTokens = tokenizeVoiceText(normalizedTranscript).filter(
    (token) =>
      !fillerTokens.has(token) &&
      !Object.prototype.hasOwnProperty.call(numberWordMap, token) &&
      !/^\d+$/.test(token),
  );

  const transcriptTokenSet = new Set(transcriptTokens);
  const productNameNormalized = normalizeVoiceText(product.name);
  const categoryNormalized = normalizeVoiceText(product.category);

  if (normalizedTranscript.includes(productNameNormalized)) {
    return 1000 + productNameNormalized.length;
  }

  const trimmedName = productNameNormalized
    .split(" ")
    .filter((token) => !genericProductTokens.has(token))
    .join(" ");
  if (trimmedName && normalizedTranscript.includes(trimmedName)) {
    return 800 + trimmedName.length;
  }

  const productTokens = new Set(
    [
      ...tokenizeVoiceText(product.name),
      ...tokenizeVoiceText(product.category),
    ].filter(
      (token) => !fillerTokens.has(token) && !genericProductTokens.has(token),
    ),
  );

  let overlap = 0;
  for (const token of productTokens) {
    if (transcriptTokenSet.has(token)) overlap += 1;
  }

  if (overlap === 0) return 0;

  const tokenCount = productTokens.size || 1;
  const hasUniformHint =
    productTokens.has("uniform") && normalizedTranscript.includes("uniform");
  const hasPoloHint =
    productTokens.has("polo") && normalizedTranscript.includes("polo");
  const hasCategoryHint =
    categoryNormalized && normalizedTranscript.includes(categoryNormalized);

  return (
    overlap * 100 +
    Math.round((overlap / tokenCount) * 10) +
    (hasUniformHint ? 20 : 0) +
    (hasPoloHint ? 20 : 0) +
    (hasCategoryHint ? 10 : 0)
  );
};

const parseVoiceOrder = (
  transcript: string,
  products: DisplayProduct[],
): ParsedVoiceOrder => {
  const normalized = normalizeVoiceText(transcript);
  const quantity = parseVoiceQuantity(normalized);

  const scored = products
    .map((product) => ({
      product,
      score: scoreProductMatch(product, normalized),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const product = best && best.score > 0 ? best.product : null;
  const requestedSize = extractRequestedSizeFromTranscript(normalized);

  return { quantity, product, requestedSize, transcript };
};

const parseVoiceOrders = (transcript: string, products: DisplayProduct[]) => {
  const segments = splitVoiceCommandIntoSegments(transcript);
  if (segments.length === 0) return [parseVoiceOrder(transcript, products)];
  return segments.map((segment) => parseVoiceOrder(segment, products));
};

// ── Product Card ──────────────────────────────────────────────────────────────
const ProductCard = ({
  product,
  onClick,
}: {
  product: DisplayProduct;
  onClick: () => void;
}) => {
  const isUnavailableOnly = !product.available;

  return (
    <button
      onClick={onClick}
      disabled={isUnavailableOnly}
      className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-white/30 bg-white/25 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all duration-200 hover:bg-white/40 hover:shadow-[0_8px_28px_rgba(0,0,0,0.15)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed text-left"
    >
      {/* Unavailable badge */}
      {!product.available ? (
        <span className="absolute top-2.5 right-2.5 z-10 rounded-full bg-red-500 px-2.5 py-0.5 font-serif text-[0.6rem] font-bold uppercase tracking-wider text-white shadow">
          Out of Stock
        </span>
      ) : (
        <span className="absolute top-2.5 right-2.5 z-10 rounded-full bg-green-500 px-2.5 py-0.5 font-serif text-[0.6rem] font-bold uppercase tracking-wider text-white shadow">
          In stock
        </span>
      )}

      {/* Image */}
      <div className="relative h-65 w-full overflow-hidden bg-white/40">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain p-3"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ShoppingBag className="size-12 text-[#07484A]/20" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5 p-3">
        <span className="font-serif text-[0.65rem] uppercase tracking-[0.15em] text-[#07484A]/55">
          {product.category}
        </span>
        <span className="font-serif text-sm font-bold leading-tight text-[#07484A]">
          {product.name}
        </span>
        <span className="mt-1 font-serif text-sm font-semibold text-[#07484A]/80">
          ₱{product.price.toFixed(2)}
        </span>
        <span className="mt-1.5 rounded-lg bg-[#07484A] py-3 text-center font-serif text-[0.6rem] font-bold uppercase tracking-wider text-white">
          Order Now
        </span>
      </div>
    </button>
  );
};

// ── Browse Page ───────────────────────────────────────────────────────────────
const ProductCardSkeleton = () => (
  <div className="flex flex-col overflow-hidden rounded-2xl border-2 border-white/30 bg-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm">
    <div className="h-65 w-full animate-pulse bg-white/45" />
    <div className="space-y-2 p-3">
      <div className="h-3 w-20 animate-pulse rounded bg-white/50" />
      <div className="h-4 w-32 animate-pulse rounded bg-white/60" />
      <div className="h-4 w-24 animate-pulse rounded bg-white/55" />
      <div className="mt-1.5 h-8 w-full animate-pulse rounded-lg bg-[#07484A]/35" />
    </div>
  </div>
);

const BrowsePage = () => {
  const { navigate } = useTransitionNav();
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recognitionTimeoutRef = useRef<number | null>(null);
  const summaryAudioRef = useRef<HTMLAudioElement | null>(null);
  const summaryAudioUrlRef = useRef<string | null>(null);
  const voiceParseRequestRef = useRef(0);
  const [type] = useState<UserType>(() => {
    if (typeof window === "undefined") return "student";

    const fromQuery = new URLSearchParams(window.location.search).get("type");
    if (fromQuery === "visitor") return "visitor";
    if (fromQuery === "student") return "student";

    const fromStorage =
      localStorage.getItem(kioskUserTypeStorageKey) ??
      sessionStorage.getItem(kioskUserTypeStorageKey);
    return fromStorage === "visitor" ? "visitor" : "student";
  });
  const [voiceState, setVoiceState] = useState<
    "idle" | "listening" | "processing"
  >("idle");
  const [lastTranscript, setLastTranscript] = useState("");
  const [lastAiInterpretedTranscript, setLastAiInterpretedTranscript] =
    useState("");
  const [lastVoiceResult, setLastVoiceResult] = useState("");
  const [voiceDrafts, setVoiceDrafts] = useState<VoiceOrderDraft[]>([]);
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
  const [voiceSummaryState, setVoiceSummaryState] = useState<
    "idle" | "loading" | "playing"
  >("idle");
  const [voiceLogs, setVoiceLogs] = useState<VoiceOrderLog[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(kioskVoiceLogStorageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as VoiceOrderLog[];
      return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
    } catch {
      return [];
    }
  });
  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    ...orpc.product.list.queryOptions(),
    refetchInterval: kioskAutoRefreshMs,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const { data: stocksData } = useQuery({
    ...orpc.stock.list.queryOptions(),
    refetchInterval: kioskAutoRefreshMs,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    sessionStorage.setItem(kioskUserTypeStorageKey, type);
    localStorage.setItem(kioskUserTypeStorageKey, type);

    const rawSignIn = localStorage.getItem(kioskSignInStorageKey);
    if (!rawSignIn) return;

    try {
      const signIn = JSON.parse(rawSignIn) as Record<string, unknown>;
      localStorage.setItem(
        kioskSignInStorageKey,
        JSON.stringify({
          ...signIn,
          userType: type,
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // Ignore malformed local storage payload.
    }
  }, [type]);

  useEffect(
    () => () => {
      if (recognitionTimeoutRef.current != null) {
        window.clearTimeout(recognitionTimeoutRef.current);
      }
      if (summaryAudioRef.current) {
        summaryAudioRef.current.pause();
        summaryAudioRef.current = null;
      }
      if (summaryAudioUrlRef.current) {
        URL.revokeObjectURL(summaryAudioUrlRef.current);
        summaryAudioUrlRef.current = null;
      }
      recognitionRef.current?.stop();
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      kioskVoiceLogStorageKey,
      JSON.stringify(voiceLogs.slice(0, 10)),
    );
  }, [voiceLogs]);

  const cartQty = useCart((state) => state.getItemCount());
  const addCartItem = useCart((state) => state.addItem);

  const stockByProductId = useMemo<Map<string, number>>(() => {
    const entries: Array<[string, number]> = (stocksData?.stocks ?? []).map(
      (stock) => [stock.productId, Number(stock.currentStock ?? 0)],
    );
    return new Map<string, number>(entries);
  }, [stocksData]);

  const backendProducts = useMemo<DisplayProduct[]>(() => {
    const rows = productsData?.products ?? [];
    const staticIdByNameCategory = new Map(
      PRODUCTS.map((p) => [
        `${p.name.toLowerCase()}::${p.category.toLowerCase()}`,
        p.id,
      ]),
    );

    return rows
      .filter((product) => product.isActive)
      .map((product) => {
        const stock = stockByProductId.get(product.id) ?? 0;
        const minPrice =
          product.variants.length > 0
            ? Math.min(...product.variants.map((variant) => variant.price))
            : 0;

        const staticId =
          staticIdByNameCategory.get(
            `${product.name.toLowerCase()}::${product.category.toLowerCase()}`,
          ) ?? product.id;

        return {
          id: staticId,
          backendId: product.id,
          name: product.name,
          category: product.category,
          price: minPrice,
          image: product.image || "",
          visitorAccess: product.isVisitorOrderable,
          available: stock > 0,
          preOrder: false,
          stockCount: stock,
          sizes: product.variants.map((variant) => variant.size),
        };
      });
  }, [productsData, stockByProductId]);

  const productsSource: DisplayProduct[] =
    backendProducts.length > 0
      ? backendProducts
      : isProductsLoading && !productsData
        ? []
        : PRODUCTS.map((product) => ({ ...product, backendId: product.id }));
  const products =
    type === "visitor"
      ? productsSource.filter((p) => p.visitorAccess)
      : productsSource;
  const showSkeleton = isProductsLoading && products.length === 0;
  const isVoiceSupported =
    typeof window !== "undefined" &&
    Boolean(
      (window as SpeechCapableWindow).SpeechRecognition ||
        (window as SpeechCapableWindow).webkitSpeechRecognition,
    );
  const interpretedVoiceSummary = useMemo(() => {
    if (voiceDrafts.length === 0) return "";
    return voiceDrafts
      .map((draft) => {
        const productName = draft.product?.name ?? "Unknown item";
        const size =
          draft.resolvedVariant && draft.resolvedVariant !== NO_VARIANT_SIZE
            ? ` (${draft.resolvedVariant})`
            : "";
        return `${draft.quantity} x ${productName}${size}`;
      })
      .join(", ");
  }, [voiceDrafts]);

  const voiceInterpretCatalog = useMemo<VoiceInterpretCatalogProduct[]>(
    () =>
      products.map((product) => ({
        name: product.name,
        category: product.category,
        sizes: (product.sizes ?? []).filter((size) => size !== NO_VARIANT_SIZE),
      })),
    [products],
  );

  const cleanupSummaryAudio = () => {
    if (summaryAudioRef.current) {
      summaryAudioRef.current.pause();
      summaryAudioRef.current = null;
    }
    setVoiceSummaryState("idle");
    if (summaryAudioUrlRef.current) {
      const staleUrl = summaryAudioUrlRef.current;
      summaryAudioUrlRef.current = null;
      // Delay revocation slightly to avoid blob:// ERR_FILE_NOT_FOUND in some browsers.
      window.setTimeout(() => URL.revokeObjectURL(staleUrl), 2_000);
    }
  };

  const speakVoiceDraftSummaryFallback = (summary: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(`I heard: ${summary}.`);
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const interpretVoiceTranscriptWithAi = async (transcript: string) => {
    const trimmedTranscript = transcript.trim();
    if (!trimmedTranscript) {
      return {
        normalizedTranscript: "",
        usedAi: false,
        provider: "local",
      } as const;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5_500);

    try {
      const response = await fetch("/api/kiosk/voice/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: trimmedTranscript,
          products: voiceInterpretCatalog,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Interpret route failed (${response.status})`);
      }

      const payload = (await response.json()) as VoiceInterpretResponse;
      const normalizedTranscript =
        typeof payload.normalizedTranscript === "string" &&
        payload.normalizedTranscript.trim()
          ? payload.normalizedTranscript.trim()
          : trimmedTranscript;

      return {
        normalizedTranscript,
        usedAi: Boolean(payload.usedAi),
        provider: payload.provider ?? "local",
      } as const;
    } catch {
      return {
        normalizedTranscript: trimmedTranscript,
        usedAi: false,
        provider: "local",
      } as const;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const buildVoiceDraft = (parsed: ParsedVoiceOrder): VoiceOrderDraft => {
    if (!parsed.product) {
      return {
        transcript: parsed.transcript,
        quantity: parsed.quantity,
        product: null,
        requestedSize: parsed.requestedSize,
        resolvedVariant: "",
        availableSizes: [],
        canConfirm: false,
        message:
          "I couldn't match a product. Try saying the item name clearly.",
      };
    }

    const product = parsed.product;
    const sizeResolution = resolveProductSizeFromTranscript(
      product,
      normalizeVoiceText(parsed.transcript),
    );

    if (!product.available) {
      return {
        transcript: parsed.transcript,
        quantity: parsed.quantity,
        product,
        requestedSize: sizeResolution.requestedSize,
        resolvedVariant: sizeResolution.resolvedVariant,
        availableSizes: sizeResolution.availableSizes,
        canConfirm: false,
        message: `${product.name} is not available right now.`,
      };
    }

    if (
      sizeResolution.availableSizes.length > 0 &&
      !sizeResolution.requestedSize
    ) {
      return {
        transcript: parsed.transcript,
        quantity: parsed.quantity,
        product,
        requestedSize: null,
        resolvedVariant: "",
        availableSizes: sizeResolution.availableSizes,
        canConfirm: false,
        message: `Please include a size for ${product.name}.`,
      };
    }

    if (
      sizeResolution.availableSizes.length > 0 &&
      !sizeResolution.resolvedVariant
    ) {
      return {
        transcript: parsed.transcript,
        quantity: parsed.quantity,
        product,
        requestedSize: sizeResolution.requestedSize,
        resolvedVariant: "",
        availableSizes: sizeResolution.availableSizes,
        canConfirm: false,
        message: `Invalid size. Available sizes: ${sizeResolution.availableSizes.join(", ")}.`,
      };
    }

    return {
      transcript: parsed.transcript,
      quantity: parsed.quantity,
      product,
      requestedSize: sizeResolution.requestedSize,
      resolvedVariant: sizeResolution.resolvedVariant,
      availableSizes: sizeResolution.availableSizes,
      canConfirm: true,
      message: "Review the parsed order, then confirm to add it to cart.",
    };
  };

  const revalidateVoiceDraft = (draft: VoiceOrderDraft): VoiceOrderDraft => {
    if (!draft.product) {
      return {
        ...draft,
        availableSizes: [],
        resolvedVariant: "",
        canConfirm: false,
        message: "Select a product to continue.",
      };
    }

    const product = draft.product;
    const availableSizes = (product.sizes ?? []).filter(
      (size) => size !== NO_VARIANT_SIZE,
    );

    if (!product.available) {
      return {
        ...draft,
        availableSizes,
        canConfirm: false,
        message: `${product.name} is not available right now.`,
      };
    }

    if (availableSizes.length === 0) {
      return {
        ...draft,
        availableSizes: [],
        resolvedVariant: NO_VARIANT_SIZE,
        canConfirm: draft.quantity > 0,
        message: "Ready to add to cart.",
      };
    }

    const variantIsValid = availableSizes.includes(draft.resolvedVariant);
    if (!variantIsValid) {
      return {
        ...draft,
        availableSizes,
        canConfirm: false,
        message: `Select a valid size for ${product.name}.`,
      };
    }

    return {
      ...draft,
      availableSizes,
      canConfirm: draft.quantity > 0,
      message: "Ready to add to cart.",
    };
  };

  const buildVoiceDrafts = (transcript: string) => {
    return parseVoiceOrders(transcript, products)
      .map((parsed) => buildVoiceDraft(parsed))
      .map((draft) => revalidateVoiceDraft(draft));
  };

  const appendVoiceLog = (entry: Omit<VoiceOrderLog, "id" | "timestamp">) => {
    setVoiceLogs((current) =>
      [
        {
          ...entry,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 10),
    );
  };

  const updateVoiceDraftAt = (
    index: number,
    updater: (draft: VoiceOrderDraft) => VoiceOrderDraft,
  ) => {
    setVoiceDrafts((current) =>
      current.map((draft, draftIndex) =>
        draftIndex === index ? revalidateVoiceDraft(updater(draft)) : draft,
      ),
    );
  };

  const handleVoiceDraftQuantityChange = (
    index: number,
    nextQuantity: number,
  ) => {
    updateVoiceDraftAt(index, (draft) => ({
      ...draft,
      quantity: Math.max(1, Math.min(99, nextQuantity)),
    }));
  };

  const handleVoiceDraftProductChange = (index: number, backendId: string) => {
    const selectedProduct =
      products.find((product) => product.backendId === backendId) ?? null;
    updateVoiceDraftAt(index, (draft) => {
      if (!selectedProduct) {
        return {
          ...draft,
          product: null,
          resolvedVariant: "",
          availableSizes: [],
        };
      }
      const availableSizes = (selectedProduct.sizes ?? []).filter(
        (size) => size !== NO_VARIANT_SIZE,
      );
      let resolvedVariant = draft.resolvedVariant;
      if (availableSizes.length === 0) {
        resolvedVariant = NO_VARIANT_SIZE;
      } else if (!availableSizes.includes(resolvedVariant)) {
        const requestedMatch = draft.requestedSize
          ? availableSizes.find((size) =>
              buildSizeAliasKeys(size).has(draft.requestedSize ?? ""),
            )
          : undefined;
        resolvedVariant = requestedMatch ?? availableSizes[0] ?? "";
      }

      return {
        ...draft,
        product: selectedProduct,
        availableSizes,
        resolvedVariant,
      };
    });
  };

  const handleVoiceDraftSizeChange = (index: number, nextSize: string) => {
    updateVoiceDraftAt(index, (draft) => ({
      ...draft,
      resolvedVariant: nextSize,
    }));
  };

  const removeVoiceDraftAt = (index: number) => {
    setVoiceDrafts((current) =>
      current.filter((_, draftIndex) => draftIndex !== index),
    );
  };

  const speakVoiceDraftSummary = async () => {
    if (voiceSummaryState !== "idle") return;
    if (voiceDrafts.length === 0) return;

    const summary = voiceDrafts
      .map((draft) => {
        const productName = draft.product?.name ?? "unknown item";
        const size =
          draft.resolvedVariant && draft.resolvedVariant !== NO_VARIANT_SIZE
            ? ` size ${draft.resolvedVariant}`
            : "";
        return `${draft.quantity} ${productName}${size}`;
      })
      .join(", ");

    const summaryText = `I heard: ${summary}. Please review before confirming.`;

    try {
      setVoiceSummaryState("loading");
      cleanupSummaryAudio();
      setVoiceSummaryState("loading");

      const response = await fetch("/api/queue/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summaryText }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs summary failed (${response.status})`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      summaryAudioRef.current = audio;
      summaryAudioUrlRef.current = audioUrl;
      audio.onended = () => {
        setVoiceSummaryState("idle");
        if (summaryAudioRef.current === audio) {
          summaryAudioRef.current = null;
        }
        if (summaryAudioUrlRef.current === audioUrl) {
          const endedUrl = summaryAudioUrlRef.current;
          summaryAudioUrlRef.current = null;
          if (endedUrl) {
            window.setTimeout(() => URL.revokeObjectURL(endedUrl), 2_000);
          }
        }
      };
      audio.onerror = () => {
        setVoiceSummaryState("idle");
      };
      setVoiceSummaryState("playing");
      await audio.play();
    } catch {
      setVoiceSummaryState("idle");
      speakVoiceDraftSummaryFallback(summary);
    }
  };

  const confirmVoiceDraftAddToCart = () => {
    if (
      voiceDrafts.length === 0 ||
      voiceDrafts.some((draft) => !draft.canConfirm || !draft.product)
    ) {
      return;
    }

    for (const draft of voiceDrafts) {
      if (!draft.product) continue;
      addCartItem({
        productId: draft.product.backendId,
        productName: draft.product.name,
        variant: draft.resolvedVariant || NO_VARIANT_SIZE,
        pickupDate: new Date().toISOString().slice(0, 10),
        quantity: draft.quantity,
      });
    }

    const message =
      voiceDrafts.length === 1
        ? "Voice order added to cart."
        : `${voiceDrafts.length} voice-ordered items added to cart.`;
    appendVoiceLog({
      transcript: lastTranscript,
      status: "confirmed",
      itemCount: voiceDrafts.length,
    });
    setLastVoiceResult(message);
    setVoiceDrafts([]);
    setLastTranscript("");
    setLastAiInterpretedTranscript("");
    toast.success(message);
    setIsVoiceDialogOpen(false);
  };

  const handleVoiceOrderClick = () => {
    if (voiceState === "listening") {
      recognitionRef.current?.stop();
      return;
    }

    cleanupSummaryAudio();

    const voiceWindow = window as SpeechCapableWindow;
    const RecognitionCtor =
      voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      toast.error("Voice ordering is not supported on this browser.");
      return;
    }

    try {
      const recognition = new RecognitionCtor();
      recognitionRef.current = recognition;
      recognition.lang = "en-PH";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        voiceParseRequestRef.current += 1;
        setVoiceState("listening");
        setIsVoiceDialogOpen(true);
        setLastVoiceResult("Listening... Speak your order, then stop or wait.");
        setLastAiInterpretedTranscript("");
        setVoiceDrafts([]);
      };

      recognition.onerror = (event) => {
        setVoiceState("idle");
        setIsVoiceDialogOpen(true);
        if (event.error === "not-allowed") {
          setLastVoiceResult(
            "Microphone permission denied. Please allow microphone access.",
          );
          appendVoiceLog({
            transcript: lastTranscript,
            status: "error",
            itemCount: 0,
          });
          toast.error("Allow microphone permission for voice order");
          return;
        }
        if (event.error === "no-speech") {
          setLastVoiceResult("No speech detected. Please try again.");
          appendVoiceLog({
            transcript: "",
            status: "error",
            itemCount: 0,
          });
          return;
        }
        setLastVoiceResult(`Voice recognition error: ${event.error}`);
        appendVoiceLog({
          transcript: lastTranscript,
          status: "error",
          itemCount: 0,
        });
        toast.error(`Voice recognition error: ${event.error}`);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ")
          .trim();

        setLastTranscript(transcript);
        setLastAiInterpretedTranscript("");
        setVoiceState("processing");
        setLastVoiceResult("Interpreting your voice order...");
        const parseRequestId = ++voiceParseRequestRef.current;
        void (async () => {
          const interpreted = await interpretVoiceTranscriptWithAi(transcript);
          if (voiceParseRequestRef.current !== parseRequestId) return;

          const transcriptForParsing = interpreted.normalizedTranscript || transcript;
          const drafts = buildVoiceDrafts(transcriptForParsing);
          setVoiceDrafts(drafts);
          setLastAiInterpretedTranscript(
            interpreted.usedAi && transcriptForParsing !== transcript
              ? transcriptForParsing
              : "",
          );
          appendVoiceLog({
            transcript,
            status:
              drafts.length > 0 && drafts.every((draft) => draft.canConfirm)
                ? "parsed"
                : "error",
            itemCount: drafts.length,
          });
          const allValid =
            drafts.length > 0 && drafts.every((draft) => draft.canConfirm);
          const aiNote =
            interpreted.usedAi && interpreted.provider !== "local"
              ? " (AI-assisted)"
              : "";
          setLastVoiceResult(
            allValid
              ? `Review the parsed voice order${aiNote} and confirm to add to cart.`
              : `Please review the parsed voice order${aiNote} and fix the invalid item(s) by editing or speaking again.`,
          );
          setIsVoiceDialogOpen(true);
          setVoiceState("idle");
        })();
      };

      recognition.onend = () => {
        if (recognitionTimeoutRef.current != null) {
          window.clearTimeout(recognitionTimeoutRef.current);
          recognitionTimeoutRef.current = null;
        }
        setVoiceState((current) =>
          current === "processing" ? current : "idle",
        );
      };

      setLastTranscript("");
      setLastAiInterpretedTranscript("");
      setVoiceDrafts([]);
      setIsVoiceDialogOpen(true);
      setLastVoiceResult("Preparing microphone...");
      recognition.start();

      recognitionTimeoutRef.current = window.setTimeout(() => {
        recognition.stop();
      }, kioskVoiceTimeoutMs);
    } catch {
      setVoiceState("idle");
      toast.error("Unable to start voice recognition.");
    }
  };

  return (
    <>
      <main className="relative z-10 flex h-full flex-col overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-8 pt-6 pb-4 animate-[fadeUp_0.5s_ease_both]">
          {/* Back */}
          <button
            onClick={() => navigate("/kiosk/order")}
            className="flex items-center gap-2 rounded-xl border border-white/30 bg-black/50 px-5 py-2.5 font-serif text-sm font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-sm transition-all hover:bg-white/35 active:scale-95"
          >
            <ArrowLeft className="size-4" /> Back
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleVoiceOrderClick}
              disabled={!isVoiceSupported || isProductsLoading}
              className={`relative flex h-11 items-center gap-2 rounded-full border px-3 backdrop-blur-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                voiceState === "listening"
                  ? "border-red-300/40 bg-red-500/80 text-white animate-pulse"
                  : "border-white/30 bg-black/50 text-white hover:bg-white/40"
              }`}
              title={
                isVoiceSupported
                  ? "Voice order (example: 2 test booklet)"
                  : "Voice ordering not supported on this browser"
              }
            >
              {voiceState === "processing" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : voiceState === "listening" ? (
                <MicOff className="size-4" />
              ) : (
                <Mic className="size-4" />
              )}
              <span className="font-serif text-[0.65rem] font-semibold uppercase tracking-[0.15em]">
                {voiceState === "listening"
                  ? "Stop"
                  : voiceState === "processing"
                    ? "Parsing"
                    : "Voice"}
              </span>
            </button>

            <button
              onClick={() => navigate("/kiosk/order/cart")}
              className="relative flex size-11 items-center justify-center rounded-full border border-white/30 bg-black/50 backdrop-blur-sm hover:bg-white/40 transition-all active:scale-95"
            >
              <ShoppingCart className="size-5 text-white" />
              {cartQty > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-emerald-500 font-serif text-[0.6rem] font-bold text-white shadow">
                  {cartQty}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Title ── */}
        <div className="px-8 pb-4 animate-[fadeUp_0.6s_ease_0.1s_both]">
          <h1 className="font-serif text-4xl font-extrabold tracking-tight text-[#07484A] drop-shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
            Select a Product
          </h1>
          {type === "visitor" && (
            <p className="mt-1 font-serif text-sm italic text-[#07484A]/55">
              Showing items available for visitors
            </p>
          )}
        </div>

        {/* ── Product grid ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-8 animate-[fadeUp_0.7s_ease_0.2s_both]">
          {showSkeleton ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <ProductCardSkeleton key={`product-skeleton-${index}`} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  // Navigate to the dedicated product detail page
                  onClick={() =>
                    navigate(
                      `/kiosk/order/browse/${p.id}?type=${type}&backendId=${encodeURIComponent(
                        p.backendId,
                      )}`,
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className="mt-24 flex flex-col items-center gap-3 text-center">
              <ShoppingBag className="size-16 text-[#07484A]/20" />
              <p className="font-serif text-lg italic text-[#07484A]/40">
                No products available
              </p>
            </div>
          )}
        </div>
      </main>

      <Dialog
        open={isVoiceDialogOpen}
        onOpenChange={(open) => {
          setIsVoiceDialogOpen(open);
          if (!open) cleanupSummaryAudio();
        }}
      >
        <DialogContent className="max-w-3xl! overflow-hidden border-2 border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(240,250,250,0.84))] p-0 shadow-[0_20px_55px_rgba(7,72,74,0.22)] backdrop-blur-xl">
          <DialogHeader className="border-b border-white/40 bg-white/35 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-white/40 bg-black/45 text-white shadow-[0_4px_14px_rgba(0,0,0,0.12)]">
                {voiceState === "listening" ? (
                  <Mic className="size-5 animate-pulse" />
                ) : voiceState === "processing" ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Mic className="size-5" />
                )}
              </div>
              <div className="min-w-0">
                <DialogTitle className="font-serif text-3xl font-extrabold tracking-tight text-[#07484A]">
                  Voice Order Review
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-[#07484A]/70">
                  Speak your order, review what was detected, then confirm to
                  add it to cart.
                </DialogDescription>
                {voiceSummaryState !== "idle" && (
                  <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 font-serif text-xs font-semibold uppercase tracking-[0.12em] text-cyan-900">
                    <Loader2 className="size-3.5 animate-spin" />
                    {voiceSummaryState === "loading"
                      ? "Generating Summary Voice..."
                      : "Playing Summary Voice..."}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-6">
            <div
              className={`rounded-2xl border px-4 py-3 font-serif text-sm shadow-[0_4px_12px_rgba(0,0,0,0.04)] ${
                voiceState === "listening"
                  ? "border-red-200 bg-red-50/95 text-red-900"
                  : voiceState === "processing"
                    ? "border-cyan-200 bg-cyan-50/95 text-cyan-900"
                    : voiceDrafts.length > 0 &&
                        voiceDrafts.every((draft) => draft.canConfirm)
                      ? "border-emerald-200 bg-emerald-50/95 text-emerald-900"
                      : "border-amber-200 bg-amber-50/95 text-amber-900"
              }`}
            >
              {lastVoiceResult || "Tap the voice button to start speaking."}
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              {voiceState === "listening" && (
                <Button
                  type="button"
                  onClick={() => recognitionRef.current?.stop()}
                  className="h-11 rounded-2xl border-0 bg-red-500 px-4 font-serif text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_20px_rgba(239,68,68,0.28)] hover:bg-red-600"
                >
                  <MicOff className="mr-2 size-4" />
                  Stop Voice Recognition
                </Button>
              )}
              {voiceState === "idle" && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleVoiceOrderClick}
                    className="h-11 rounded-2xl border-0 bg-[#07484A] px-4 font-serif text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_20px_rgba(7,72,74,0.25)] hover:bg-[#0a5e60]"
                  >
                    <Mic className="mr-2 size-4" />
                    Listen Again
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={speakVoiceDraftSummary}
                    disabled={
                      voiceDrafts.length === 0 || voiceSummaryState !== "idle"
                    }
                    className="h-11 rounded-2xl border-[#07484A]/20 bg-white/70 px-4 font-serif text-sm font-bold uppercase tracking-[0.12em] text-[#07484A] hover:bg-white"
                  >
                    {voiceSummaryState !== "idle" ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Volume2 className="mr-2 size-4" />
                    )}
                    {voiceSummaryState === "loading"
                      ? "Generating..."
                      : voiceSummaryState === "playing"
                        ? "Playing..."
                        : "Speak Summary"}
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/40 bg-white/55 px-4 py-3 shadow-[0_4px_14px_rgba(0,0,0,0.04)] backdrop-blur-sm">
              <p className="font-serif text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#07484A]/55">
                Heard (Raw Speech Transcript)
              </p>
              <p className="mt-1 font-serif text-base font-semibold text-[#07484A]">
                {lastTranscript || "-"}
              </p>
              {lastAiInterpretedTranscript && (
                <>
                  <p className="mt-2 font-serif text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#07484A]/55">
                    AI Interpreted Transcript
                  </p>
                  <p className="mt-1 font-serif text-sm font-semibold text-[#07484A]/85">
                    {lastAiInterpretedTranscript}
                  </p>
                </>
              )}
              {interpretedVoiceSummary && (
                <>
                  <p className="mt-2 font-serif text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#07484A]/55">
                    Interpreted Order
                  </p>
                  <p className="mt-1 font-serif text-sm font-semibold text-[#07484A]/85">
                    {interpretedVoiceSummary}
                  </p>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-white/40 bg-white/55 px-4 py-3 shadow-[0_4px_14px_rgba(0,0,0,0.04)] backdrop-blur-sm">
              <p className="font-serif text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#07484A]/55">
                Parsed Item{voiceDrafts.length > 1 ? "s" : ""}
              </p>

              {voiceDrafts.length === 0 ? (
                <p className="mt-2 font-serif text-sm italic text-[#07484A]/60">
                  {voiceState === "listening"
                    ? "Listening for your order..."
                    : "No parsed items yet."}
                </p>
              ) : (
                <ScrollArea className="mt-3 h-100 min-h-70 rounded-2xl border border-white/35 bg-white/25 p-2">
                  <div className="space-y-3 pr-2">
                    {voiceDrafts.map((draft, index) => (
                    <div
                      key={`${draft.transcript}-${index}`}
                      className={`rounded-2xl border p-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)] ${
                        draft.canConfirm
                          ? "border-emerald-200 bg-emerald-50/80"
                          : "border-amber-200 bg-amber-50/85"
                      }`}
                    >
                      <div className="grid grid-cols-[72px_1fr] gap-3">
                        <div className="relative h-18 w-18 overflow-hidden rounded-xl border border-white/50 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.04)]">
                          {draft.product?.image ? (
                            <Image
                              src={draft.product.image}
                              alt={draft.product.name}
                              fill
                              className="object-contain p-1"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-[#07484A]/45">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 text-sm text-[#07484A]">
                          <p className="font-serif text-lg font-bold leading-tight">
                            {draft.product?.name ?? "Not recognized"}
                          </p>
                          <p className="mt-0.5 rounded-lg bg-white/70 px-2 py-1 text-xs text-[#07484A]/70">
                            Segment heard: {draft.transcript}
                          </p>
                          <div className="mt-2 grid gap-2 md:grid-cols-[1.2fr_auto_auto]">
                            <label className="flex flex-col gap-1 text-xs">
                              <span className="font-semibold uppercase tracking-[0.12em] text-[#07484A]/60">
                                Product
                              </span>
                              <select
                                value={draft.product?.backendId ?? ""}
                                onChange={(event) =>
                                  handleVoiceDraftProductChange(
                                    index,
                                    event.target.value,
                                  )
                                }
                                className="h-9 rounded-lg border border-[#07484A]/15 bg-white px-2 text-sm text-[#07484A] outline-none ring-0"
                              >
                                <option value="">Select product...</option>
                                {products.map((product) => (
                                  <option
                                    key={product.backendId}
                                    value={product.backendId}
                                  >
                                    {product.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <div className="flex flex-col gap-1 text-xs">
                              <span className="font-semibold uppercase tracking-[0.12em] text-[#07484A]/60">
                                Quantity
                              </span>
                              <div className="flex h-9 items-center gap-1 rounded-lg border border-[#07484A]/15 bg-white px-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleVoiceDraftQuantityChange(
                                      index,
                                      draft.quantity - 1,
                                    )
                                  }
                                  className="flex size-7 items-center justify-center rounded-md bg-[#EEF6F6] text-[#07484A] hover:bg-[#E4F0F0]"
                                >
                                  <Minus className="size-4" />
                                </button>
                                <span className="w-8 text-center font-serif text-sm font-bold">
                                  {draft.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleVoiceDraftQuantityChange(
                                      index,
                                      draft.quantity + 1,
                                    )
                                  }
                                  className="flex size-7 items-center justify-center rounded-md bg-[#EEF6F6] text-[#07484A] hover:bg-[#E4F0F0]"
                                >
                                  <Plus className="size-4" />
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1 text-xs">
                              <span className="font-semibold uppercase tracking-[0.12em] text-[#07484A]/60">
                                Size
                              </span>
                              {draft.availableSizes.length > 0 ? (
                                <select
                                  value={draft.resolvedVariant || ""}
                                  onChange={(event) =>
                                    handleVoiceDraftSizeChange(
                                      index,
                                      event.target.value,
                                    )
                                  }
                                  className="h-9 min-w-30 rounded-lg border border-[#07484A]/15 bg-white px-2 text-sm text-[#07484A] outline-none ring-0"
                                >
                                  <option value="">Select size...</option>
                                  {draft.availableSizes.map((size) => (
                                    <option key={size} value={size}>
                                      {size}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className="flex h-9 items-center rounded-lg border border-[#07484A]/15 bg-white px-2 text-sm text-[#07484A]/70">
                                  N/A
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                            <p className="rounded-lg bg-white/65 px-2 py-1">
                              <span className="font-semibold">Qty:</span>{" "}
                              {draft.quantity}
                            </p>
                            <p className="rounded-lg bg-white/65 px-2 py-1">
                              <span className="font-semibold">Requested:</span>{" "}
                              {draft.requestedSize ?? "None"}
                            </p>
                            <p className="rounded-lg bg-white/65 px-2 py-1">
                              <span className="font-semibold">Matched:</span>{" "}
                              {draft.resolvedVariant || "Not matched"}
                            </p>
                            <p className="truncate rounded-lg bg-white/65 px-2 py-1">
                              <span className="font-semibold">Sizes:</span>{" "}
                              {draft.availableSizes.length > 0
                                ? draft.availableSizes.join(", ")
                                : "N/A"}
                            </p>
                          </div>
                          <p
                            className={`mt-2 rounded-lg px-2 py-1 text-xs font-semibold ${
                              draft.canConfirm
                                ? "bg-emerald-100 text-emerald-900"
                                : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            {draft.message}
                          </p>
                          <div className="mt-2 flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => removeVoiceDraftAt(index)}
                              className="h-8 rounded-xl border-red-200 bg-white/80 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="mr-1 size-3.5" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-white/40 bg-white/35 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsVoiceDialogOpen(false)}
              className="h-11 rounded-2xl border-[#07484A]/25 bg-white/70 px-4 font-serif text-sm font-bold uppercase tracking-[0.12em] text-[#07484A] hover:bg-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmVoiceDraftAddToCart}
              disabled={
                voiceState !== "idle" ||
                voiceDrafts.length === 0 ||
                voiceDrafts.some((draft) => !draft.canConfirm)
              }
              className="h-11 rounded-2xl border-0 bg-[#07484A] px-4 font-serif text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_20px_rgba(7,72,74,0.25)] hover:bg-[#0a5e60]"
            >
              Confirm Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default BrowsePage;
