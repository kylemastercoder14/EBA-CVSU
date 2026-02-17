"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CheckIcon,
  CircleAlertIcon,
  HandCoinsIcon,
  ReceiptTextIcon,
  ScanQrCodeIcon,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import { orpc } from "@/lib/orpc";

type PaymentStep =
  | "gcash-scan"
  | "gcash-reference"
  | "gcash-processing"
  | "cash-info"
  | "confirmed";

type StudentSession = {
  id?: string | null;
  fullName?: string | null;
  mobileNumber?: string | null;
  cvsuEmail?: string | null;
  studentNumber?: string | null;
};

type ItemSummary = {
  productId: string;
  productName: string;
  variant: string;
  pickupDate: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatPickupDate = (dateText: string) => {
  if (!dateText) return "-";
  const parsed = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateText;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
};

const generateOrderNumber = () =>
  `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const Page = () => {
  const router = useRouter();
  const params = useParams<{ method: string }>();
  const method = (params.method ?? "").toLowerCase();
  const isGcash = method === "gcash";
  const isCash = method === "cash";
  const hasValidMethod = isCash || isGcash;
  const paymentMethodLabel = isCash ? "Cash" : "GCash";

  const [step, setStep] = useState<PaymentStep>(isCash ? "cash-info" : "gcash-scan");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [fallbackOrderNumber] = useState(() => generateOrderNumber());
  const [createdOrder, setCreatedOrder] = useState<{
    orderNumber: string;
    paymentReference: string;
    paymentMethod: "GCASH" | "CASH";
  } | null>(null);
  const [confirmedItems, setConfirmedItems] = useState<ItemSummary[]>([]);
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const [studentSession] = useState<StudentSession>(() => {
    if (typeof window === "undefined") return {};

    const raw = localStorage.getItem("eba_student_session");
    if (!raw) return {};

    try {
      return JSON.parse(raw) as StudentSession;
    } catch {
      return {};
    }
  });

  const items = useCart((state) => state.items);
  const clearCart = useCart((state) => state.clearCart);

  const { data } = useQuery(orpc.product.list.queryOptions());
  const products = useMemo(() => data?.products ?? [], [data?.products]);

  const itemSummaries = useMemo<ItemSummary[]>(() => {
    return items.map((item) => {
      const product = products.find((productItem) => productItem.id === item.productId);
      const variant = product?.variants.find((v) => v.size === item.variant);
      const unitPrice = variant?.price ?? 0;
      return {
        ...item,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      };
    });
  }, [items, products]);

  const totalAmount = useMemo(() => {
    return itemSummaries.reduce((sum, item) => sum + item.lineTotal, 0);
  }, [itemSummaries]);

  const displayItems = confirmedItems.length > 0 ? confirmedItems : itemSummaries;
  const displayTotal = createdOrder ? confirmedTotal : totalAmount;
  const displayOrderNumber = createdOrder?.orderNumber ?? fallbackOrderNumber;

  const createOrderMutation = useMutation(
    orpc.order.create.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Failed to place order.");
      },
    }),
  );

  const submitOrder = async (paymentMethod: "GCASH" | "CASH", paymentReference?: string) => {
    if (!studentSession.id) {
      toast.error("Session expired. Please login again.");
      router.push("/");
      return null;
    }

    const result = await createOrderMutation.mutateAsync({
      userId: studentSession.id,
      paymentMethod,
      paymentReference,
      items: items.map((item) => ({
        productId: item.productId,
        variant: item.variant,
        quantity: item.quantity,
        pickupDate: item.pickupDate,
      })),
    });

    return result.order;
  };

  const handlePrintReceipt = () => {
    const receiptWindow = window.open(window.location.href, "_blank", "width=900,height=1100");
    if (!receiptWindow) {
      toast.error("Please allow pop-ups to print your receipt.");
      return;
    }

    const issuedAt = new Date();
    const issuedAtLabel = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(issuedAt);
    const issuedShort = new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      day: "numeric",
      year: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    }).format(issuedAt);

    const itemRows = displayItems
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

    const firstPickupDate = displayItems[0]?.pickupDate
      ? formatPickupDate(displayItems[0].pickupDate)
      : "-";

    const displayName =
      studentSession.fullName ||
      studentSession.studentNumber ||
      studentSession.cvsuEmail?.split("@")[0] ||
      "Student";
    const displayMobile = studentSession.mobileNumber || "-";

    receiptWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt ${escapeHtml(displayOrderNumber)}</title>
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
                <span>${escapeHtml(issuedShort)}</span>
                <span>Receipt ${escapeHtml(displayOrderNumber)}</span>
              </div>
              <h1 class="title">EBA ORDER RECEIPT</h1>
              <p class="subtitle">External and Business Affair Ordering System</p>
            </header>

            <div class="grid">
              <div><span class="label">Order Number:</span> ${escapeHtml(displayOrderNumber)}</div>
              <div><span class="label">Issue Date:</span> ${escapeHtml(issuedAtLabel)}</div>
              <div><span class="label">Customer:</span> ${escapeHtml(displayName)}</div>
              <div><span class="label">Mobile:</span> ${escapeHtml(displayMobile)}</div>
              <div><span class="label">Payment Method:</span> ${escapeHtml(paymentMethodLabel)}</div>
              ${
                isGcash
                  ? `<div><span class="label">GCash Reference:</span> ${escapeHtml(createdOrder?.paymentReference || referenceNumber || "-")}</div>`
                  : `<div><span class="label">Payment Status:</span> Pending Cash Collection</div>`
              }
              <div><span class="label">Pickup Date:</span> ${escapeHtml(firstPickupDate)}</div>
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
              <tbody>
                ${itemRows}
              </tbody>
            </table>

            <div class="totals">TOTAL: PHP ${formatMoney(displayTotal)}</div>

            <div class="footer">
              This receipt serves as proof of order and payment confirmation.
            </div>
          </section>
        </body>
      </html>
    `);

    receiptWindow.document.close();
    receiptWindow.focus();
    window.setTimeout(() => {
      receiptWindow.print();
    }, 250);
  };

  const handleDownloadReceipt = () => {
    handlePrintReceipt();
    window.setTimeout(() => {
      router.push("/home");
    }, 300);
  };

  useEffect(() => {
    if (step !== "gcash-processing") return;

    const timer = window.setTimeout(() => {
      setStep("confirmed");
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [step]);

  if (!hasValidMethod) {
    return (
      <main className="min-h-[calc(100dvh-80px)] bg-[#C8D6E4] px-6 py-8 sm:px-10">
        <div className="mx-auto mt-12 max-w-120 rounded-[34px] border-4 border-[#0B525B] bg-[#BBD2E7] p-8 text-center">
          <h1 className="font-serif text-4xl font-bold text-[#0B525B]">Invalid payment method</h1>
          <Button
            type="button"
            onClick={() => router.push("/payment-method")}
            className="mt-6 rounded-full bg-[#075A5C] px-6 py-3 text-lg font-semibold"
          >
            Back to payment methods
          </Button>
        </div>
      </main>
    );
  }

  if (items.length === 0 && !createdOrder) {
    return (
      <main className="min-h-[calc(100dvh-80px)] bg-[#C8D6E4] px-6 py-8 sm:px-10">
        <div className="mx-auto mt-12 max-w-120 rounded-[34px] border-4 border-[#0B525B] bg-[#BBD2E7] p-8 text-center">
          <h1 className="font-serif text-4xl font-bold text-[#0B525B]">No Items Found</h1>
          <p className="mt-4 text-xl text-[#285F6B]">Your cart is empty. Please add products first.</p>
          <Button
            type="button"
            onClick={() => router.push("/products")}
            className="mt-8 rounded-full bg-[#075A5C] px-6 py-3 text-lg font-semibold"
          >
            Browse Products
          </Button>
        </div>
      </main>
    );
  }

  const displayName =
    studentSession.fullName ||
    studentSession.studentNumber ||
    studentSession.cvsuEmail?.split("@")[0] ||
    "Student";
  const displayMobile = studentSession.mobileNumber || "-";

  return (
    <main className="min-h-[calc(100dvh-80px)] bg-[#C8D6E4] flex flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-2xl">
        {step === "gcash-scan" && (
          <>
            <section className="rounded-[36px] bg-[#06545A] px-6 py-6 text-center text-white sm:px-8">
              <div className="mx-auto flex size-22 items-center justify-center rounded-full bg-[#2CEB2A]">
                <ScanQrCodeIcon className="size-10 text-[#E7FFE8]" />
              </div>
              <h1 className="mt-4 font-serif text-4xl font-bold">Scan QR Code to Pay</h1>
              <p className="mt-3 text-4xl font-semibold text-[#31F029]">P{formatMoney(totalAmount)}</p>

              <div className="mt-5 rounded-[22px] bg-[#DFE0E2] p-5">
                <div className="mx-auto relative flex h-50 w-50 items-center justify-center rounded-[18px] bg-[#07555C]">
                  <Image priority fill src="/gcash-qr.png" alt="Gcash QR" className="size-full" />
                </div>
              </div>
            </section>

            <section className="mt-4 rounded-xs bg-[#9AB8C6] px-4 py-4 text-[#074C53]">
              {[
                "Open your GCash app and scan the QR code above",
                `Confirm the payment amount of P${formatMoney(totalAmount)}`,
                "Complete the payment on your phone",
                "Tap 'Continue' below after payment is complete",
              ].map((line, index) => (
                <div key={line} className="mb-2 flex items-start gap-3 last:mb-0">
                  <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#05525A] text-lg font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="text-lg leading-tight font-semibold">{line}</p>
                </div>
              ))}
            </section>

            <Button
              type="button"
              onClick={() => setStep("gcash-reference")}
              className="mt-4 h-13 w-full rounded-full bg-[#07545C] text-2xl font-semibold text-white hover:bg-[#064A51]"
            >
              Continue
            </Button>
          </>
        )}

        {step === "gcash-reference" && (
          <section className="rounded-[36px] bg-[#06545A] px-6 py-8 text-center text-white sm:px-8">
            <div className="mx-auto flex size-22 items-center justify-center rounded-full bg-[#2CEB2A]">
              <ReceiptTextIcon className="size-10 text-[#E7FFE8]" />
            </div>
            <h1 className="mt-5 font-serif text-4xl font-bold">GCash Reference Number</h1>
            <p className="mx-auto mt-4 max-w-90 text-2xl leading-tight text-[#CDE5E3]">
              Enter the reference number from your GCash receipt
            </p>

            <div className="mt-10 space-y-5">
              <Input
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                placeholder="Enter reference number"
                className="h-19 rounded-[18px] border-none bg-[#A3A6AA] px-6 text-center text-2xl! placeholder:text-2xl font-serif text-[#045360] placeholder:text-[#0A5664]"
              />
              <Button
                type="button"
                disabled={createOrderMutation.isPending || referenceNumber.trim().length < 6}
                onClick={async () => {
                  const order = await submitOrder("GCASH", referenceNumber.trim());
                  if (!order) return;

                  setCreatedOrder({
                    orderNumber: order.orderNumber,
                    paymentReference: order.paymentReference,
                    paymentMethod: order.paymentMethod,
                  });
                  setConfirmedItems(itemSummaries);
                  setConfirmedTotal(totalAmount);
                  clearCart();
                  setStep("gcash-processing");
                }}
                className="h-15 w-full rounded-[18px] bg-[#2CEB2A] text-3xl font-serif font-bold text-black hover:bg-[#2CEB2A]/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {createOrderMutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </section>
        )}

        {step === "gcash-processing" && (
          <section className="mx-auto mt-24 w-full rounded-[36px] bg-[#06545A] px-6 py-10 text-center text-white">
            <div className="mx-auto flex size-22 items-center justify-center rounded-full bg-[#2CEB2A]">
              <CheckIcon className="size-14 text-white" />
            </div>
            <h1 className="mt-6 text-5xl font-bold">Payment Successful</h1>
            <p className="mt-3 text-4xl text-[#B9D3D2]">Processing your order...</p>
          </section>
        )}

        {step === "cash-info" && (
          <>
            <section className="text-center">
              <div className="mx-auto flex size-22 items-center justify-center rounded-full bg-[#2CEB2A]">
                <HandCoinsIcon className="size-10 text-[#06545A]" />
              </div>
              <h1 className="mt-4 font-serif text-5xl font-bold text-[#0A555D]">
                Cash Payment Selected
              </h1>
            </section>

            <section className="mt-6 rounded-[18px] bg-[#4A4A4D] px-6 py-6 text-white">
              {[
                {
                  title: "Payment Instructions",
                  body: "Your order will be paid at the EBA office during your scheduled pickup.",
                },
                {
                  title: "Pickup Schedule",
                  body: "Please bring the exact amount or sufficient cash when you come to pick up your order on your scheduled date.",
                },
                {
                  title: "Order Confirmation",
                  body: "You will receive an order number on the next screen. Please keep this for your records.",
                },
              ].map((item, index) => (
                <div key={item.title} className="mb-4 flex items-start gap-4 last:mb-0">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#15D61E] text-2xl font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-3xl font-bold leading-none">{item.title}</p>
                    <p className="mt-1 text-base leading-tight text-[#D7D7D9]">{item.body}</p>
                  </div>
                </div>
              ))}
            </section>

            <section className="mt-4 rounded-[18px] border-2 border-[#E59833] bg-[#E9EAEC] px-5 py-4">
              <div className="flex items-start gap-3 text-[#0A555D]">
                <CircleAlertIcon className="mt-0.5 size-10 shrink-0 text-[#D48B26]" />
                <div>
                  <p className="text-3xl font-bold">Important Reminders:</p>
                  <p className="mt-1 text-xl">- Payment must be made at the EBA office during pickup</p>
                  <p className="text-xl">- Bring your receipt</p>
                </div>
              </div>
            </section>

            <Button
              type="button"
              disabled={createOrderMutation.isPending}
              onClick={async () => {
                const order = await submitOrder("CASH");
                if (!order) return;

                setCreatedOrder({
                  orderNumber: order.orderNumber,
                  paymentReference: order.paymentReference,
                  paymentMethod: order.paymentMethod,
                });
                setConfirmedItems(itemSummaries);
                setConfirmedTotal(totalAmount);
                clearCart();
                setStep("confirmed");
              }}
              className="mt-6 h-15 w-full rounded-2xl bg-[#47DD52] text-2xl font-semibold text-white hover:bg-[#3FC84A]"
            >
              {createOrderMutation.isPending ? "Submitting..." : "Continue"}
            </Button>
          </>
        )}

        {step === "confirmed" && (
          <>
            <section className="rounded-3xl bg-[#2D2D30] px-4 py-4 text-white sm:px-6">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#2CEB2A]">
                <CheckIcon className="size-6 text-white" />
              </div>

              <h1 className="mt-4 text-center font-serif text-3xl font-bold">Order Confirmed!</h1>
              <p className="mt-2 text-center text-xl text-[#C5C5C7]">Your order has been successfully placed</p>

              <div className="mt-4 rounded-[14px] bg-[#4A4A4D] p-4">
                <h2 className="text-center font-serif text-3xl font-bold text-[#47CC4C]">Order Number</h2>
                <p className="text-center text-2xl font-bold tracking-wide">{displayOrderNumber}</p>

                <div className="mt-2 border-t border-[#A8A8AA] pt-2 text-xl leading-tight">
                  <p className="text-[#E2E2E2]">Name</p>
                  <p className="font-bold">{displayName}</p>
                </div>

                <div className="mt-2 border-t border-[#A8A8AA] pt-2 text-xl leading-tight">
                  <p className="text-[#E2E2E2]">Mobile Number</p>
                  <p className="font-bold">{displayMobile}</p>
                </div>

                <div className="mt-2 border-t border-[#A8A8AA] pt-2 text-xl leading-tight">
                  <p className="text-[#E2E2E2]">Payment Method</p>
                  <p className="font-bold">{paymentMethodLabel}</p>
                </div>

                <div className="mt-2 border-t h-[16vh] no-scrollbar overflow-y-auto border-[#A8A8AA] pt-2 text-xl leading-tight">
                  <p className="text-[#E2E2E2]">Order Items</p>
                  {displayItems.map((item) => (
                    <div key={`${item.productId}-${item.variant}-${item.pickupDate}`} className="mt-1">
                      <p className="font-bold">{item.productName}</p>
                      <p className="text-xl text-[#D0D0D3]">
                        {item.variant} . Qty: {item.quantity} . Pickup: {formatPickupDate(item.pickupDate)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 border-t border-[#A8A8AA] pt-2">
                  <p className="text-2xl text-[#E2E2E2]">Total</p>
                  <p className="text-3xl font-bold text-[#47CC4C]">P{formatMoney(displayTotal)}</p>
                </div>
              </div>
            </section>

            <Button
              type="button"
              onClick={handleDownloadReceipt}
              className="mt-5 h-14 w-full rounded-2xl bg-[#47DD52] text-2xl font-semibold text-white hover:bg-[#3FC84A]"
            >
              Download Receipt
            </Button>
          </>
        )}
      </div>
    </main>
  );
};

export default Page;
