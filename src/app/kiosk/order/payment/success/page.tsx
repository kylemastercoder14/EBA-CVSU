"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";

import { useTransitionNav } from "@/components/kiosk/PageTransitionProvider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { printReceiptViaQz } from "@/lib/qz-print";
import { orpc } from "@/lib/orpc";
import type { KioskPaymentMethod, KioskReceiptPayload } from "@/types/kiosk-receipt";

type Stage = "success" | "print-prompt" | "order-confirmed" | "receipt-printed";
type PrintDecision = "yes" | "no";
type PrintChannel = "qz" | "browser" | "failed" | null;

type ReceiptMeta = {
  decision: PrintDecision;
  printed: boolean;
  decidedAt: string;
};

type SignInData = {
  fullName?: string;
  mobileNumber?: string;
  studentNumber?: string | null;
  userType?: "student" | "visitor";
};

type PaymentReferenceData = {
  referenceNumber?: string;
};

const kioskSignInStorageKey = "kiosk-sign-in";
const kioskPaymentMethodStorageKey = "kiosk-payment-method";
const kioskPaymentReferenceStorageKey = "kiosk-payment-reference";
const kioskReceiptLatestStorageKey = "kiosk-latest-receipt";
const kioskReceiptHistoryStorageKey = "kiosk-receipt-history";
const kioskReceiptMetaStorageKey = "kiosk-latest-receipt-meta";
const kioskOrderNumberStorageKey = "kiosk-order-number";
const kioskUserTypeStorageKey = "kiosk-user-type";
const kioskCreatedOrderStorageKey = "kiosk-created-order";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatPickupDate = (dateText: string) => {
  if (!dateText) return "-";
  const parsed = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateText;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
};

const parseJson = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const getOrCreateOrderNumber = () => {
  const existing = localStorage.getItem(kioskOrderNumberStorageKey);
  if (existing) return existing;
  const next = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  localStorage.setItem(kioskOrderNumberStorageKey, next);
  return next;
};

const printReceiptWithBrowser = (receipt: KioskReceiptPayload) => {
  const receiptWindow = window.open(window.location.href, "_blank", "width=900,height=1100");
  if (!receiptWindow) return false;

  const issuedAtShort = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(receipt.issuedAt));

  const itemRows = receipt.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.productName)}</td>
          <td>${escapeHtml(item.variant)}</td>
          <td>${item.quantity}</td>
          <td>PHP ${formatMoney(item.unitPrice)}</td>
          <td>PHP ${formatMoney(item.lineTotal)}</td>
        </tr>
      `,
    )
    .join("");

  const firstPickup = receipt.items[0]?.pickupDate
    ? formatPickupDate(receipt.items[0].pickupDate)
    : "-";

  receiptWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt ${escapeHtml(receipt.orderNumber)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 24px;
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            background: #fff;
          }
          .receipt {
            max-width: 820px;
            margin: 0 auto;
            border: 2px solid #000;
            padding: 24px;
          }
          .header {
            border-bottom: 1px solid #000;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .title {
            font-size: 26px;
            font-weight: 700;
            margin: 0;
          }
          .subtitle {
            margin: 4px 0 0;
            font-size: 14px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 18px;
            margin: 14px 0;
            font-size: 14px;
          }
          .label { font-weight: 700; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 13px;
          }
          th { font-weight: 700; background: #fff; }
          .totals {
            margin-top: 14px;
            border-top: 1px solid #000;
            padding-top: 10px;
            text-align: right;
            font-size: 16px;
            font-weight: 700;
          }
          .footer {
            margin-top: 18px;
            border-top: 1px solid #000;
            padding-top: 10px;
            font-size: 12px;
          }
          @media print {
            body { padding: 0; }
            .receipt {
              max-width: 100%;
              border: none;
              padding: 16px;
            }
          }
        </style>
      </head>
      <body>
        <section class="receipt">
          <header class="header">
            <div style="display:flex;justify-content:space-between;gap:12px;font-size:14px;margin-bottom:8px;">
              <span>${escapeHtml(issuedAtShort)}</span>
              <span>Receipt ${escapeHtml(receipt.orderNumber)}</span>
            </div>
            <h1 class="title">EBA ORDER RECEIPT</h1>
            <p class="subtitle">External and Business Affair Ordering System</p>
          </header>

          <div class="grid">
            <div><span class="label">Order Number:</span> ${escapeHtml(receipt.orderNumber)}</div>
            <div><span class="label">Customer:</span> ${escapeHtml(receipt.customerName)}</div>
            <div><span class="label">Mobile:</span> ${escapeHtml(receipt.mobileNumber)}</div>
            <div><span class="label">Payment Method:</span> ${escapeHtml(receipt.paymentMethod.toUpperCase())}</div>
            <div><span class="label">Pickup Date:</span> ${escapeHtml(firstPickup)}</div>
            <div><span class="label">Reference:</span> ${escapeHtml(receipt.paymentReference ?? "-")}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Variant</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <div class="totals">TOTAL: PHP ${formatMoney(receipt.total)}</div>
          <div class="footer">This receipt serves as proof of order and payment confirmation.</div>
        </section>
      </body>
    </html>
  `);

  receiptWindow.document.close();
  receiptWindow.focus();
  window.setTimeout(() => receiptWindow.print(), 250);
  return true;
};

const PrintReceiptDialog = ({
  open,
  onYes,
  onNo,
  isPrinting,
  statusText,
}: {
  open: boolean;
  onYes: () => void;
  onNo: () => void;
  isPrinting: boolean;
  statusText: string | null;
}) => (
  <Dialog open={open}>
    <DialogContent className="w-[80vw] max-w-sm rounded-3xl border border-white/20 bg-[#1c1c1e]/95 p-7 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-md gap-0">
      <p className="mb-6 text-center font-serif text-xl font-bold leading-snug text-white">
        Do you want to print a receipt?
      </p>
      {statusText && (
        <p className="mb-4 text-center font-serif text-sm text-emerald-300">{statusText}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={onNo}
          disabled={isPrinting}
          className="h-13 flex-1 rounded-2xl bg-white/20 font-serif text-base font-bold uppercase tracking-[0.14em] text-white/70 transition-all hover:bg-white/30 active:scale-95"
        >
          NO
        </button>
        <button
          onClick={onYes}
          disabled={isPrinting}
          className="h-13 flex-1 rounded-2xl bg-emerald-500 font-serif text-base font-bold uppercase tracking-[0.14em] text-white shadow-[0_4px_16px_rgba(16,185,129,0.4)] transition-all hover:bg-emerald-400 active:scale-95"
        >
          {isPrinting ? "PRINTING..." : "YES"}
        </button>
      </div>
    </DialogContent>
  </Dialog>
);

const OrderConfirmedDialog = ({
  open,
  onDone,
  receipt,
  printChannel,
}: {
  open: boolean;
  onDone: () => void;
  receipt: KioskReceiptPayload | null;
  printChannel: PrintChannel;
}) => {
  const itemsText = receipt?.items.map((item) => item.productName).join(", ") || "-";

  return (
    <Dialog open={open}>
      <DialogContent className="w-[85vw]! max-w-xl! overflow-hidden rounded-3xl border border-white/15 bg-[#1c1c1e]/95 p-0 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-md gap-0">
        <div className="flex flex-col items-center border-b border-white/10 px-7 pt-7 pb-5">
          <div className="mb-4 flex size-17 items-center justify-center rounded-full bg-emerald-500 shadow-[0_6px_24px_rgba(16,185,129,0.45)] animate-[popIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]">
            <CheckCircle2 className="size-10 text-white" />
          </div>
          <h2 className="font-serif text-3xl font-extrabold tracking-tight text-white">Order Confirmed!</h2>
          <p className="mt-1 font-serif text-base italic text-white/50">Your order has been successfully placed.</p>
        </div>

        <div className="space-y-4 px-7 py-5">
          <p className="text-center font-serif text-2xl font-bold tracking-widest text-white">
            {receipt?.orderNumber ?? "-"}
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            {[
              { label: "Name", value: receipt?.customerName ?? "-" },
              { label: "Mobile Number", value: receipt?.mobileNumber ?? "-" },
              { label: "Payment Method", value: receipt?.paymentMethod?.toUpperCase() ?? "-" },
              { label: "Order Items", value: itemsText },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="font-serif text-sm uppercase text-white/40">{label}</p>
                <p className="mt-0.5 font-serif text-lg font-semibold text-white/90">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="font-serif text-base font-bold text-white/70">Total:</span>
            <span className="font-serif text-2xl font-extrabold text-emerald-400">
              PHP {formatMoney(receipt?.total ?? 0)}
            </span>
          </div>
          <p className="text-center font-serif text-sm italic text-white/60">
            {printChannel === "qz" && "Receipt sent to thermal printer via QZ Tray."}
            {printChannel === "browser" && "QZ unavailable. Used browser print dialog fallback."}
            {printChannel === "failed" && "Printing failed. You may continue without printed receipt."}
            {printChannel === null && "No receipt print requested."}
          </p>
        </div>

        <div className="px-7 pb-7">
          <Button
            onClick={onDone}
            className="h-14 w-full rounded-2xl border-0 bg-emerald-500 font-serif text-base font-bold uppercase tracking-[0.12em] text-white shadow-[0_6px_20px_rgba(16,185,129,0.35)] transition-all hover:bg-emerald-400 active:scale-[0.98]"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ReceiptPrintedView = ({ onDone }: { onDone: () => void }) => (
  <div className="flex h-full flex-col items-center justify-center px-10 animate-[fadeUp_0.7s_ease_both]">
    <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-emerald-500 shadow-[0_8px_32px_rgba(16,185,129,0.45)] animate-[popIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]">
      <CheckCircle2 className="size-10 text-white" />
    </div>
    <h2 className="text-center font-serif text-3xl font-extrabold tracking-tight text-white">
      Receipt printed successfully.
    </h2>
    <p className="mt-2 text-center font-serif text-base italic text-white/60">
      Thank you! Please take your receipt below.
    </p>
    <button
      onClick={onDone}
      className="mt-10 rounded-2xl border border-white/30 bg-white/20 px-8 py-3 font-serif text-sm font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-sm transition-all hover:bg-white/30 active:scale-95"
    >
      Back to Home
    </button>
  </div>
);

const Page = () => {
  const { navigate } = useTransitionNav();
  const clearCart = useCart((state) => state.clearCart);
  const cartItems = useCart((state) => state.items);
  const [stage, setStage] = useState<Stage>("success");
  const [showPrintedAfterConfirm, setShowPrintedAfterConfirm] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatusText, setPrintStatusText] = useState<string | null>(null);
  const [printChannel, setPrintChannel] = useState<PrintChannel>(null);
  const [orderNumber, setOrderNumber] = useState(() =>
    typeof window === "undefined" ? "" : getOrCreateOrderNumber(),
  );
  const [issuedAt] = useState(() => new Date().toISOString());
  const [signIn] = useState<SignInData>(() => {
    if (typeof window === "undefined") return {};
    return parseJson<SignInData>(localStorage.getItem(kioskSignInStorageKey)) ?? {};
  });
  const [paymentMethod] = useState<KioskPaymentMethod>(() => {
    if (typeof window === "undefined") return "cash";
    return localStorage.getItem(kioskPaymentMethodStorageKey) === "gcash" ? "gcash" : "cash";
  });
  const [paymentReference, setPaymentReference] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const parsed = parseJson<PaymentReferenceData>(localStorage.getItem(kioskPaymentReferenceStorageKey));
    return parsed?.referenceNumber ?? null;
  });
  const [persistedOrder, setPersistedOrder] = useState<{
    id: string;
    orderNumber: string;
    paymentReference: string;
  } | null>(() => {
    if (typeof window === "undefined") return null;
    return parseJson<{ id: string; orderNumber: string; paymentReference: string }>(
      localStorage.getItem(kioskCreatedOrderStorageKey),
    );
  });

  const { data: productData } = useQuery(orpc.product.list.queryOptions());
  const createKioskOrderMutation = useMutation(orpc.order.createKiosk.mutationOptions());

  const receipt = useMemo<KioskReceiptPayload | null>(() => {
    if (!orderNumber) return null;
    const products = productData?.products ?? [];

    const mappedItems: KioskReceiptPayload["items"] = cartItems.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const variant = product?.variants.find((v) => v.size === item.variant);
      const unitPrice = Number(variant?.price ?? 0);
      return {
        productId: item.productId,
        productName: item.productName,
        variant: item.variant,
        pickupDate: item.pickupDate,
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      };
    });

    return {
      orderNumber,
      issuedAt,
      customerName: signIn.fullName?.trim() || "Walk-in Customer",
      mobileNumber: signIn.mobileNumber?.trim() || "-",
      paymentMethod,
      paymentReference: paymentMethod === "gcash" ? paymentReference : null,
      items: mappedItems,
      total: mappedItems.reduce((sum, item) => sum + item.lineTotal, 0),
    };
  }, [cartItems, productData?.products, orderNumber, issuedAt, signIn, paymentMethod, paymentReference]);

  useEffect(() => {
    if (stage !== "success") return;
    const timer = setTimeout(() => setStage("print-prompt"), 1800);
    return () => clearTimeout(timer);
  }, [stage]);

  const saveReceipt = (payload: KioskReceiptPayload, meta: ReceiptMeta) => {
    localStorage.setItem(kioskReceiptLatestStorageKey, JSON.stringify(payload));
    localStorage.setItem(kioskReceiptMetaStorageKey, JSON.stringify(meta));

    const existing =
      parseJson<KioskReceiptPayload[]>(localStorage.getItem(kioskReceiptHistoryStorageKey)) ?? [];
    const updated = [payload, ...existing].slice(0, 20);
    localStorage.setItem(kioskReceiptHistoryStorageKey, JSON.stringify(updated));
  };

  const ensureOrderSaved = async (currentReceipt: KioskReceiptPayload | null) => {
    if (persistedOrder) {
      return persistedOrder;
    }

    if (!currentReceipt || cartItems.length === 0) {
      return null;
    }

    setIsSavingOrder(true);
    setPrintStatusText("Saving order to database...");

    try {
      const rawType =
        signIn.userType ??
        (typeof window === "undefined"
          ? null
          : localStorage.getItem(kioskUserTypeStorageKey) ??
            sessionStorage.getItem(kioskUserTypeStorageKey));

      const userType = rawType === "visitor" ? "VISITOR" : "STUDENT";
      const result = await createKioskOrderMutation.mutateAsync({
        customer: {
          fullName: currentReceipt.customerName,
          mobileNumber: currentReceipt.mobileNumber,
          studentNumber: signIn.studentNumber ?? undefined,
          userType,
        },
        paymentMethod: currentReceipt.paymentMethod === "gcash" ? "GCASH" : "CASH",
        paymentReference: currentReceipt.paymentReference ?? undefined,
        items: currentReceipt.items.map((item) => ({
          productId: item.productId,
          variant: item.variant,
          quantity: item.quantity,
          pickupDate: item.pickupDate,
        })),
      });

      const savedOrder = {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        paymentReference: result.order.paymentReference,
      };

      setPersistedOrder(savedOrder);
      setOrderNumber(savedOrder.orderNumber);
      if (currentReceipt.paymentMethod === "gcash") {
        setPaymentReference(savedOrder.paymentReference);
      }
      localStorage.setItem(kioskCreatedOrderStorageKey, JSON.stringify(savedOrder));
      return savedOrder;
    } catch {
      setPrintStatusText("Failed to save order. Please try again.");
      return null;
    } finally {
      setIsSavingOrder(false);
    }
  };

  const withSavedOrder = (
    currentReceipt: KioskReceiptPayload,
    savedOrder: { orderNumber: string; paymentReference: string },
  ): KioskReceiptPayload => ({
    ...currentReceipt,
    orderNumber: savedOrder.orderNumber,
    paymentReference:
      currentReceipt.paymentMethod === "gcash"
        ? savedOrder.paymentReference
        : currentReceipt.paymentReference,
  });

  const handlePrintYes = async () => {
    const decidedAt = new Date().toISOString();
    if (receipt) {
      const savedOrder = await ensureOrderSaved(receipt);
      if (!savedOrder) return;

      const receiptForPrint = withSavedOrder(receipt, savedOrder);
      setIsPrinting(true);
      setPrintStatusText("Trying thermal printer via QZ Tray...");

      let printed = await printReceiptViaQz(receiptForPrint);
      let channel: PrintChannel = printed ? "qz" : "failed";

      if (!printed) {
        setPrintStatusText("QZ not available. Opening browser print fallback...");
        printed = printReceiptWithBrowser(receiptForPrint);
        channel = printed ? "browser" : "failed";
      }

      saveReceipt(receiptForPrint, { decision: "yes", printed, decidedAt });
      setPrintChannel(channel);
      setShowPrintedAfterConfirm(printed);
      setIsPrinting(false);
      setPrintStatusText(null);
      setStage("order-confirmed");
      return;
    }
    setIsPrinting(false);
    setPrintStatusText(null);
    setStage("order-confirmed");
  };

  const handlePrintNo = () => {
    const run = async () => {
      if (!receipt) {
        setShowPrintedAfterConfirm(false);
        setPrintChannel(null);
        setStage("order-confirmed");
        return;
      }

      const savedOrder = await ensureOrderSaved(receipt);
      if (!savedOrder) return;

      const receiptForStorage = withSavedOrder(receipt, savedOrder);
      saveReceipt(receiptForStorage, {
        decision: "no",
        printed: false,
        decidedAt: new Date().toISOString(),
      });
      setShowPrintedAfterConfirm(false);
      setPrintChannel(null);
      setPrintStatusText(null);
      setStage("order-confirmed");
    };
    void run();
  };

  const handleReturnHome = () => {
    clearCart();
    localStorage.removeItem(kioskOrderNumberStorageKey);
    localStorage.removeItem(kioskCreatedOrderStorageKey);
    navigate("/kiosk");
  };

  const handleOrderConfirmedDone = () => {
    if (showPrintedAfterConfirm) {
      setStage("receipt-printed");
      return;
    }
    handleReturnHome();
  };

  if (stage === "receipt-printed") {
    return (
      <>
        <main className="relative z-10 h-full">
          <ReceiptPrintedView onDone={handleReturnHome} />
        </main>
        <style>{`
          @keyframes fadeUp { from { opacity:0; transform:translateY(24px);} to { opacity:1; transform:translateY(0);} }
          @keyframes popIn { from { opacity:0; transform:scale(0.5);} to { opacity:1; transform:scale(1);} }
        `}</style>
      </>
    );
  }

  return (
    <>
      <main className="relative z-10 flex h-full flex-col items-center justify-center px-10">
        <div className="flex flex-col items-center gap-4 animate-[fadeUp_0.7s_ease_both]">
          <div className="flex size-20 items-center justify-center rounded-full bg-emerald-500 shadow-[0_8px_32px_rgba(16,185,129,0.45)] animate-[popIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]">
            <CheckCircle2 className="size-10 text-white" />
          </div>
          <h2 className="text-center font-serif text-3xl font-extrabold tracking-tight text-white">
            Payment Successful
          </h2>
          <p className="font-serif text-base italic text-white/60">Processing your order...</p>
        </div>
      </main>

      <PrintReceiptDialog
        open={stage === "print-prompt"}
        onYes={handlePrintYes}
        onNo={handlePrintNo}
        isPrinting={isPrinting || isSavingOrder}
        statusText={printStatusText}
      />

      <OrderConfirmedDialog
        open={stage === "order-confirmed"}
        onDone={handleOrderConfirmedDone}
        receipt={receipt}
        printChannel={printChannel}
      />

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px);} to { opacity:1; transform:translateY(0);} }
        @keyframes popIn { from { opacity:0; transform:scale(0.5);} to { opacity:1; transform:scale(1);} }
      `}</style>
    </>
  );
};

export default Page;
