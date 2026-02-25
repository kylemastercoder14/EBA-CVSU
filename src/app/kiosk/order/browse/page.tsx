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
  size: string | null;
  product: DisplayProduct | null;
  transcript: string;
};

const normalizeVoiceText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\b(p)\s+(e)\b/g, "pe")
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

const sizeAliasMap: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: "Small", aliases: ["small", "sm"] },
  { canonical: "Medium", aliases: ["medium", "med", "md"] },
  { canonical: "Large", aliases: ["large", "lg"] },
  { canonical: "X-Large", aliases: ["x large", "xl", "extra large", "x-large"] },
  {
    canonical: "XX-Large",
    aliases: ["xx large", "2xl", "double extra large", "xxl", "xx-large"],
  },
];

const parseVoiceSize = (normalizedTranscript: string) => {
  for (const option of sizeAliasMap) {
    if (option.aliases.some((alias) => normalizedTranscript.includes(alias))) {
      return option.canonical;
    }
  }
  return null;
};

const buildProductVoiceAliases = (product: DisplayProduct) => {
  const normalizedName = normalizeVoiceText(product.name);
  const aliases = new Set<string>([normalizedName]);
  const withoutSchool = normalizedName.replace(/\bschool\b/g, "").replace(/\s+/g, " ").trim();
  if (withoutSchool) aliases.add(withoutSchool);

  if (/booklet/i.test(product.name)) aliases.add("booklet");
  if (/id lace/i.test(product.name)) {
    aliases.add("id lace");
    aliases.add("lace");
    aliases.add("lanyard");
  }
  if (/p\.?e/i.test(product.name)) {
    aliases.add("pe uniform");
    aliases.add("p e uniform");
    aliases.add("pe uniform set");
  }
  if (/school uniform set/i.test(product.name)) {
    aliases.add("school uniform");
    aliases.add("uniform set");
  }
  if (/rotc/i.test(product.name)) {
    aliases.add("rotc uniform");
    aliases.add("nstp rotc");
  }
  if (/cwts/i.test(product.name)) {
    aliases.add("cwts uniform");
    aliases.add("nstp cwts");
  }

  return Array.from(aliases);
};

const parseVoiceOrder = (transcript: string, products: DisplayProduct[]): ParsedVoiceOrder => {
  const normalized = normalizeVoiceText(transcript);
  const quantity = parseVoiceQuantity(normalized);
  const size = parseVoiceSize(normalized);
  const product =
    products.find((candidate) =>
      buildProductVoiceAliases(candidate).some(
        (alias) => alias && normalized.includes(alias),
      ),
    ) ?? null;

  return { quantity, size, product, transcript };
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

  const addVoiceParsedOrderToCart = (parsed: ParsedVoiceOrder) => {
    if (!parsed.product) {
      setLastVoiceResult("I couldn't match a product. Try saying the item name clearly.");
      toast.error("Voice order failed: product not recognized");
      return;
    }

    const product = parsed.product;
    const availableSizes = product.sizes?.filter((size) => size !== NO_VARIANT_SIZE) ?? [];
    let selectedVariant = NO_VARIANT_SIZE;

    if (availableSizes.length > 0) {
      if (!parsed.size) {
        setLastVoiceResult(`Heard ${product.name}. Please include a size (small, medium, large).`);
        toast.error(`Please say a size for ${product.name}`);
        return;
      }

      const sizeMatch = availableSizes.find(
        (size) => normalizeVoiceText(size) === normalizeVoiceText(parsed.size ?? ""),
      );
      if (!sizeMatch) {
        setLastVoiceResult(
          `${product.name} has sizes: ${availableSizes.join(", ")}. Please try again.`,
        );
        toast.error(`Invalid size for ${product.name}`);
        return;
      }

      selectedVariant = sizeMatch;
    }

    if (!product.available && !product.preOrder) {
      setLastVoiceResult(`${product.name} is not available right now.`);
      toast.error(`${product.name} is unavailable`);
      return;
    }

    addCartItem({
      productId: product.backendId,
      productName: product.name,
      variant: selectedVariant,
      pickupDate: new Date().toISOString().slice(0, 10),
      quantity: parsed.quantity,
    });

    const sizeLabel = selectedVariant !== NO_VARIANT_SIZE ? ` (${selectedVariant})` : "";
    setLastVoiceResult(`Added ${parsed.quantity} ${product.name}${sizeLabel} to cart.`);
    toast.success(`Added ${parsed.quantity} ${product.name}${sizeLabel} to cart`);
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
        addVoiceParsedOrderToCart(parseVoiceOrder(transcript, products));
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
