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
} from "lucide-react";
import Image from "next/image";
import { type Product, PRODUCTS } from "@/lib/product";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";
import { NO_VARIANT_SIZE } from "@/validators/products";
import { Button } from "@/components/ui/button";
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
const kioskVoiceTimeoutMs = 8_000;

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
};

const parseVoiceQuantity = (normalizedTranscript: string) => {
  const numericMatch = normalizedTranscript.match(/\b(\d{1,2})\b/);
  if (numericMatch) return Math.max(1, Math.min(99, Number(numericMatch[1])));

  for (const [word, value] of Object.entries(numberWordMap)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(normalizedTranscript)) {
      return value;
    }
  }

  return 1;
};

const fillerTokens = new Set([
  "i",
  "want",
  "to",
  "order",
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
]);

const genericProductTokens = new Set(["school", "official", "item"]);

const tokenizeVoiceText = (value: string) =>
  normalizeVoiceText(value)
    .split(" ")
    .filter(Boolean);

const extractRequestedSizeFromTranscript = (normalizedTranscript: string) => {
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

  const compactMatch = compact.match(/\b([1-5]?x{0,4}l|[1-5]xl)\b/i);
  if (compactMatch) {
    const raw = compactMatch[1].toLowerCase();
    if (raw === "xl" || raw === "1xl") return "xl";
    if (raw === "xxl" || raw === "2xl") return "2xl";
    if (raw === "xxxl" || raw === "3xl") return "3xl";
    if (raw === "xxxxl" || raw === "4xl") return "4xl";
    if (raw === "xxxxxl" || raw === "5xl") return "5xl";
    return raw;
  }

  const shortMatch = normalizedTranscript.match(/\b(xs|sm|md|lg)\b/i)?.[1]?.toLowerCase();
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
  if (/\blarge\b/.test(normalized) && !/\bextra\b/.test(normalized)) aliases.add("large");

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

const resolveProductSizeFromTranscript = (product: DisplayProduct, normalizedTranscript: string) => {
  const availableSizes = (product.sizes ?? []).filter((size) => size !== NO_VARIANT_SIZE);
  if (availableSizes.length === 0) {
    return {
      requestedSize: null as string | null,
      resolvedVariant: NO_VARIANT_SIZE,
      availableSizes,
    };
  }

  const requestedSize = extractRequestedSizeFromTranscript(normalizedTranscript);
  if (!requestedSize) {
    return {
      requestedSize: null,
      resolvedVariant: "",
      availableSizes,
    };
  }

  const matchedSize = availableSizes.find((size) => buildSizeAliasKeys(size).has(requestedSize));
  return {
    requestedSize,
    resolvedVariant: matchedSize ?? "",
    availableSizes,
  };
};

const scoreProductMatch = (product: DisplayProduct, normalizedTranscript: string) => {
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
    [...tokenizeVoiceText(product.name), ...tokenizeVoiceText(product.category)].filter(
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
  const hasPoloHint = productTokens.has("polo") && normalizedTranscript.includes("polo");
  const hasCategoryHint = categoryNormalized && normalizedTranscript.includes(categoryNormalized);

  return overlap * 100 + Math.round((overlap / tokenCount) * 10) + (hasUniformHint ? 20 : 0) + (hasPoloHint ? 20 : 0) + (hasCategoryHint ? 10 : 0);
};

const parseVoiceOrder = (transcript: string, products: DisplayProduct[]): ParsedVoiceOrder => {
  const normalized = normalizeVoiceText(transcript);
  const quantity = parseVoiceQuantity(normalized);

  const scored = products
    .map((product) => ({ product, score: scoreProductMatch(product, normalized) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const product = best && best.score > 0 ? best.product : null;
  const requestedSize = extractRequestedSizeFromTranscript(normalized);

  return { quantity, product, requestedSize, transcript };
};

// ── Product Card ──────────────────────────────────────────────────────────────
const ProductCard = ({
  product,
  onClick,
}: {
  product: DisplayProduct;
  onClick: () => void;
}) => {
  const isUnavailableOnly = !product.available && !product.preOrder;

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
          <Image src={product.image} alt={product.name} fill className="object-contain p-3" />
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
        {product.preOrder ? (
          <span className="mt-1.5 rounded-lg bg-[#07484A] py-3 text-center font-serif text-[0.6rem] font-bold uppercase tracking-wider text-white">
            Pre-Order Available
          </span>
        ) : (
          <span className="mt-1.5 rounded-lg bg-[#07484A] py-3 text-center font-serif text-[0.6rem] font-bold uppercase tracking-wider text-white">
            Order Now
          </span>
        )}
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
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "processing">("idle");
  const [lastTranscript, setLastTranscript] = useState("");
  const [lastVoiceResult, setLastVoiceResult] = useState("");
  const [voiceDraft, setVoiceDraft] = useState<VoiceOrderDraft | null>(null);
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
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
      recognitionRef.current?.stop();
    },
    [],
  );

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
      PRODUCTS.map((p) => [`${p.name.toLowerCase()}::${p.category.toLowerCase()}`, p.id]),
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
          preOrder: stock <= 0,
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
        message: "I couldn't match a product. Try saying the item name clearly.",
      };
    }

    const product = parsed.product;
    const sizeResolution = resolveProductSizeFromTranscript(
      product,
      normalizeVoiceText(parsed.transcript),
    );

    if (!product.available && !product.preOrder) {
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

    if (sizeResolution.availableSizes.length > 0 && !sizeResolution.requestedSize) {
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

    if (sizeResolution.availableSizes.length > 0 && !sizeResolution.resolvedVariant) {
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

  const confirmVoiceDraftAddToCart = () => {
    if (!voiceDraft || !voiceDraft.product || !voiceDraft.canConfirm) return;

    addCartItem({
      productId: voiceDraft.product.backendId,
      productName: voiceDraft.product.name,
      variant: voiceDraft.resolvedVariant || NO_VARIANT_SIZE,
      pickupDate: new Date().toISOString().slice(0, 10),
      quantity: voiceDraft.quantity,
    });

    const sizeLabel =
      voiceDraft.resolvedVariant && voiceDraft.resolvedVariant !== NO_VARIANT_SIZE
        ? ` (${voiceDraft.resolvedVariant})`
        : "";
    const message = `Added ${voiceDraft.quantity} ${voiceDraft.product.name}${sizeLabel} to cart.`;
    setLastVoiceResult(message);
    toast.success(message);
    setIsVoiceDialogOpen(false);
  };

  const handleVoiceOrderClick = () => {
    if (voiceState === "listening") {
      recognitionRef.current?.stop();
      return;
    }

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
        setVoiceState("listening");
        setLastVoiceResult("Listening... Say an order like '2 test booklet'.");
      };

      recognition.onerror = (event) => {
        setVoiceState("idle");
        if (event.error === "not-allowed") {
          setLastVoiceResult("Microphone permission denied. Please allow microphone access.");
          toast.error("Allow microphone permission for voice order");
          return;
        }
        if (event.error === "no-speech") {
          setLastVoiceResult("No speech detected. Please try again.");
          return;
        }
        setLastVoiceResult(`Voice recognition error: ${event.error}`);
        toast.error(`Voice recognition error: ${event.error}`);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ")
          .trim();

        setLastTranscript(transcript);
        setVoiceState("processing");
        const parsed = parseVoiceOrder(transcript, products);
        const draft = buildVoiceDraft(parsed);
        setVoiceDraft(draft);
        setLastVoiceResult(draft.message);
        setIsVoiceDialogOpen(true);
        setVoiceState("idle");
      };

      recognition.onend = () => {
        if (recognitionTimeoutRef.current != null) {
          window.clearTimeout(recognitionTimeoutRef.current);
          recognitionTimeoutRef.current = null;
        }
        setVoiceState((current) => (current === "processing" ? current : "idle"));
      };

      setLastTranscript("");
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
          <div className="mt-3 space-y-1">
            <p className="font-serif text-xs uppercase tracking-[0.16em] text-[#07484A]/60">
              Voice Order
            </p>
            <p className="font-serif text-sm text-[#07484A]/75">
              Tap the mic and say: <span className="font-bold">2 test booklet</span> or{" "}
              <span className="font-bold">1 PE uniform medium</span>
            </p>
            {(lastTranscript || lastVoiceResult) && (
              <div className="rounded-xl border border-white/35 bg-white/35 px-3 py-2 shadow-[0_4px_14px_rgba(0,0,0,0.06)]">
                {lastTranscript && (
                  <p className="font-serif text-xs uppercase tracking-[0.14em] text-[#07484A]/60">
                    Heard:{" "}
                    <span className="normal-case tracking-normal">{lastTranscript}</span>
                  </p>
                )}
                {lastVoiceResult && (
                  <p className="mt-1 font-serif text-sm font-semibold text-[#07484A]">
                    {lastVoiceResult}
                  </p>
                )}
              </div>
            )}
          </div>
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

      <Dialog open={isVoiceDialogOpen} onOpenChange={setIsVoiceDialogOpen}>
        <DialogContent className="max-w-md border-[#07484A]/20 bg-[#F3FAFA]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-[#07484A]">
              Voice Order Review
            </DialogTitle>
            <DialogDescription className="text-[#07484A]/70">
              Check what the kiosk heard before adding to cart.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl border border-[#07484A]/10 bg-white px-3 py-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[#07484A]/55">Heard</p>
              <p className="mt-1 font-serif text-sm font-semibold text-[#07484A]">
                {voiceDraft?.transcript || lastTranscript || "-"}
              </p>
            </div>

            <div className="rounded-xl border border-[#07484A]/10 bg-white px-3 py-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[#07484A]/55">Parsed Order</p>
              <div className="mt-2 space-y-1 text-sm text-[#07484A]">
                <p>
                  <span className="font-semibold">Product:</span>{" "}
                  {voiceDraft?.product?.name ?? "Not recognized"}
                </p>
                <p>
                  <span className="font-semibold">Quantity:</span> {voiceDraft?.quantity ?? 1}
                </p>
                <p>
                  <span className="font-semibold">Requested size:</span>{" "}
                  {voiceDraft?.requestedSize ?? "None"}
                </p>
                <p>
                  <span className="font-semibold">Matched size:</span>{" "}
                  {voiceDraft?.resolvedVariant || "Not matched"}
                </p>
                {voiceDraft?.availableSizes && voiceDraft.availableSizes.length > 0 && (
                  <p>
                    <span className="font-semibold">Available sizes:</span>{" "}
                    {voiceDraft.availableSizes.join(", ")}
                  </p>
                )}
              </div>
            </div>

            <div
              className={`rounded-xl border px-3 py-2 text-sm ${
                voiceDraft?.canConfirm
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {voiceDraft?.message ?? "Waiting for voice input..."}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsVoiceDialogOpen(false)}
              className="border-[#07484A]/25 text-[#07484A]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmVoiceDraftAddToCart}
              disabled={!voiceDraft?.canConfirm}
              className="bg-[#07484A] text-white hover:bg-[#07484A]/90"
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
