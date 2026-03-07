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
import { buildReceiptHtml, formatReceiptMoney } from "@/lib/receipt-template";
import type { KioskReceiptPayload } from "@/types/kiosk-receipt";

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

const formatMoney = formatReceiptMoney;

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
  const { data: stockData } = useQuery(orpc.stock.list.queryOptions());
  const { data: gcashQrData } = useQuery(orpc.payment.getGcashQr.queryOptions());
  const products = useMemo(() => data?.products ?? [], [data?.products]);
  const stockByProductId = useMemo<Map<string, number>>(() => {
    const entries: Array<[string, number]> = (stockData?.stocks ?? []).map(
      (stock) => [stock.productId, Number(stock.currentStock ?? 0)],
    );
    return new Map<string, number>(entries);
  }, [stockData]);

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

  const hasPreOrderItems = useMemo(
    () =>
      items.some(
        (item) => (stockByProductId.get(item.productId) ?? Number.POSITIVE_INFINITY) <= 0,
      ),
    [items, stockByProductId],
  );

  const displayItems = confirmedItems.length > 0 ? confirmedItems : itemSummaries;
  const displayTotal = createdOrder ? confirmedTotal : totalAmount;
  const displayOrderNumber = createdOrder?.orderNumber ?? fallbackOrderNumber;
  const gcashQrUrl = gcashQrData?.imageUrl || "/gcash-qr.png";

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

    if (hasPreOrderItems && paymentMethod === "CASH") {
      toast.error("Pre-order items require GCash payment.");
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

  const buildStudentReceiptPayload = (): KioskReceiptPayload => ({
    orderNumber: displayOrderNumber,
    issuedAt: new Date().toISOString(),
    customerName:
      studentSession.fullName ||
      studentSession.studentNumber ||
      studentSession.cvsuEmail?.split("@")[0] ||
      "Student",
    mobileNumber: studentSession.mobileNumber || "-",
    paymentMethod: isGcash ? "gcash" : "cash",
    paymentReference:
      isGcash
        ? createdOrder?.paymentReference || referenceNumber || null
        : null,
    items: displayItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      variant: item.variant,
      pickupDate: item.pickupDate,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    total: displayTotal,
  });

  const handleDownloadReceipt = () => {
    try {
      const receiptPayload = buildStudentReceiptPayload();
      const receiptHtml = buildReceiptHtml(receiptPayload, {
        paymentMethodLabel,
      });
      const blob = new Blob([receiptHtml], {
        type: "text/html;charset=utf-8",
      });
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `${receiptPayload.orderNumber}-receipt.html`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      toast.success("Receipt downloaded.");
      window.setTimeout(() => {
        router.push("/home");
      }, 400);
    } catch {
      toast.error("Unable to download receipt right now.");
    }
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
      <main className="min-h-[calc(100dvh-80px)] bg-[#C8D6E4] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto mt-8 max-w-3xl rounded-[24px] border-2 border-[#0B525B] bg-[#BBD2E7] p-5 text-center sm:mt-10 sm:rounded-[30px] sm:border-3 sm:p-6 lg:mt-12 lg:rounded-[34px] lg:border-4 lg:p-8">
          <h1 className="font-serif text-2xl font-bold text-[#0B525B] sm:text-3xl lg:text-4xl">Invalid payment method</h1>
          <Button
            type="button"
            onClick={() => router.push("/payment-method")}
            className="mt-6 rounded-full bg-[#075A5C] px-6 py-2.5 text-base font-semibold sm:py-3 sm:text-lg"
          >
            Back to payment methods
          </Button>
        </div>
      </main>
    );
  }

  if (isCash && hasPreOrderItems) {
    return (
      <main className="min-h-[calc(100dvh-80px)] bg-[#C8D6E4] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto mt-8 max-w-3xl rounded-[24px] border-2 border-[#0B525B] bg-[#BBD2E7] p-5 text-center sm:mt-10 sm:rounded-[30px] sm:border-3 sm:p-6 lg:mt-12 lg:rounded-[34px] lg:border-4 lg:p-8">
          <h1 className="font-serif text-2xl font-bold text-[#0B525B] sm:text-3xl lg:text-4xl">
            GCash Required
          </h1>
          <p className="mt-4 text-base text-[#285F6B] sm:text-lg lg:text-xl">
            Your cart contains pre-order items. Please use GCash to continue.
          </p>
          <Button
            type="button"
            onClick={() => router.push("/payment-method/gcash")}
            className="mt-8 rounded-full bg-[#075A5C] px-6 py-2.5 text-base font-semibold sm:py-3 sm:text-lg"
          >
            Continue with GCash
          </Button>
        </div>
      </main>
    );
  }

  if (items.length === 0 && !createdOrder) {
    return (
      <main className="min-h-[calc(100dvh-80px)] bg-[#C8D6E4] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto mt-8 max-w-3xl rounded-[24px] border-2 border-[#0B525B] bg-[#BBD2E7] p-5 text-center sm:mt-10 sm:rounded-[30px] sm:border-3 sm:p-6 lg:mt-12 lg:rounded-[34px] lg:border-4 lg:p-8">
          <h1 className="font-serif text-2xl font-bold text-[#0B525B] sm:text-3xl lg:text-4xl">No Items Found</h1>
          <p className="mt-4 text-base text-[#285F6B] sm:text-lg lg:text-xl">Your cart is empty. Please add products first.</p>
          <Button
            type="button"
            onClick={() => router.push("/products")}
            className="mt-8 rounded-full bg-[#075A5C] px-6 py-2.5 text-base font-semibold sm:py-3 sm:text-lg"
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
    <main className="min-h-[calc(100dvh-80px)] bg-[#C8D6E4] flex flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        {step === "gcash-scan" && (
          <>
            <section className="rounded-[24px] bg-[#06545A] px-4 py-5 text-center text-white sm:rounded-[30px] sm:px-6 sm:py-6 lg:rounded-[36px] lg:px-8">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#2CEB2A] sm:size-20 lg:size-22">
                <ScanQrCodeIcon className="size-8 text-[#E7FFE8] sm:size-9 lg:size-10" />
              </div>
              <h1 className="mt-4 font-serif text-2xl font-bold sm:text-3xl lg:text-4xl">Scan QR Code to Pay</h1>
              <p className="mt-3 text-2xl font-semibold text-[#31F029] sm:text-3xl lg:text-4xl">P{formatMoney(totalAmount)}</p>

              <div className="mt-5 rounded-[18px] bg-[#DFE0E2] p-3 sm:rounded-[20px] sm:p-4 lg:rounded-[22px] lg:p-5">
                <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-[14px] bg-[#07555C] sm:h-46 sm:w-46 sm:rounded-[16px] lg:h-50 lg:w-50 lg:rounded-[18px]">
                  <Image
                    priority
                    unoptimized
                    fill
                    src={gcashQrUrl}
                    alt="Gcash QR"
                    className="size-full"
                  />
                </div>
              </div>
            </section>

            <section className="mt-4 rounded-lg bg-[#9AB8C6] px-3 py-3 text-[#074C53] sm:px-4 sm:py-4">
              {[
                "Open your GCash app and scan the QR code above",
                `Confirm the payment amount of P${formatMoney(totalAmount)}`,
                "Complete the payment on your phone",
                "Tap 'Continue' below after payment is complete",
              ].map((line, index) => (
                <div key={line} className="mb-2 flex items-start gap-3 last:mb-0">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[#05525A] text-sm font-bold text-white sm:size-7 sm:text-lg">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-tight font-semibold sm:text-base lg:text-lg">{line}</p>
                </div>
              ))}
            </section>

            <Button
              type="button"
              onClick={() => setStep("gcash-reference")}
              className="mt-4 h-11 w-full rounded-full bg-[#07545C] text-sm font-semibold text-white hover:bg-[#064A51] sm:h-12 sm:text-base lg:h-12 lg:text-lg"
            >
              Continue
            </Button>
          </>
        )}

        {step === "gcash-reference" && (
          <section className="rounded-[24px] bg-[#06545A] px-4 py-6 text-center text-white sm:rounded-[30px] sm:px-6 sm:py-8 lg:rounded-[36px] lg:px-8">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#2CEB2A] sm:size-20 lg:size-22">
              <ReceiptTextIcon className="size-8 text-[#E7FFE8] sm:size-9 lg:size-10" />
            </div>
            <h1 className="mt-5 font-serif text-2xl font-bold sm:text-3xl lg:text-4xl">GCash Reference Number</h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-tight text-[#CDE5E3] sm:text-lg lg:max-w-90 lg:text-2xl">
              Enter the reference number from your GCash receipt
            </p>

            <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5 lg:mt-10">
              <Input
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                placeholder="Enter reference number"
                className="h-13 rounded-[14px] border-none bg-[#A3A6AA] px-4 text-center text-base! placeholder:text-base font-serif text-[#045360] placeholder:text-[#0A5664] sm:h-16 sm:px-5 sm:text-xl! sm:placeholder:text-xl lg:h-19 lg:rounded-[18px] lg:px-6 lg:text-2xl! lg:placeholder:text-2xl"
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
                className="h-12 w-full rounded-[14px] bg-[#2CEB2A] text-base font-serif font-bold text-black hover:bg-[#2CEB2A]/90 disabled:cursor-not-allowed disabled:opacity-70 sm:h-14 sm:text-xl lg:h-14 lg:rounded-[18px] lg:text-2xl"
              >
                {createOrderMutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </section>
        )}

        {step === "gcash-processing" && (
          <section className="mx-auto mt-10 w-full rounded-[24px] bg-[#06545A] px-4 py-6 text-center text-white sm:mt-14 sm:rounded-[30px] sm:px-6 sm:py-8 lg:mt-24 lg:rounded-[36px] lg:px-6 lg:py-10">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#2CEB2A] sm:size-20 lg:size-22">
              <CheckIcon className="size-10 text-white sm:size-12 lg:size-14" />
            </div>
            <h1 className="mt-5 text-2xl font-bold sm:text-3xl lg:text-4xl">Payment Successful</h1>
            <p className="mt-2 text-base text-[#B9D3D2] sm:text-xl lg:mt-3 lg:text-2xl">Processing your order...</p>
          </section>
        )}

        {step === "cash-info" && (
          <>
            <section className="text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#2CEB2A] sm:size-20 lg:size-22">
                <HandCoinsIcon className="size-8 text-[#06545A] sm:size-9 lg:size-10" />
              </div>
              <h1 className="mt-4 font-serif text-2xl font-bold text-[#0A555D] sm:text-3xl lg:text-4xl">
                Cash Payment Selected
              </h1>
            </section>

            <section className="mt-4 rounded-[18px] bg-[#4A4A4D] px-4 py-4 text-white sm:mt-6 sm:px-6 sm:py-6">
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
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#15D61E] text-lg font-bold text-white sm:size-10 sm:text-2xl">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-lg font-bold leading-none sm:text-2xl lg:text-3xl">{item.title}</p>
                    <p className="mt-1 text-sm leading-tight text-[#D7D7D9] sm:text-base">{item.body}</p>
                  </div>
                </div>
              ))}
            </section>

            <section className="mt-4 rounded-[18px] border-2 border-[#E59833] bg-[#E9EAEC] px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-start gap-3 text-[#0A555D]">
                <CircleAlertIcon className="mt-0.5 size-8 shrink-0 text-[#D48B26] sm:size-10" />
                <div>
                  <p className="text-lg font-bold sm:text-2xl lg:text-3xl">Important Reminders:</p>
                  <p className="mt-1 text-sm sm:text-lg lg:text-xl">- Payment must be made at the EBA office during pickup</p>
                  <p className="text-sm sm:text-lg lg:text-xl">- Bring your receipt</p>
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
              className="mt-6 h-12 w-full rounded-2xl bg-[#47DD52] text-sm font-semibold text-white hover:bg-[#3FC84A] sm:h-14 sm:text-base lg:h-13 lg:text-lg"
            >
              {createOrderMutation.isPending ? "Submitting..." : "Continue"}
            </Button>
          </>
        )}

        {step === "confirmed" && (
          <>
            <section className="rounded-3xl bg-[#2D2D30] px-4 py-4 text-white sm:px-6">
              <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-[#2CEB2A] sm:size-10">
                <CheckIcon className="size-5 text-white sm:size-6" />
              </div>

              <h1 className="mt-4 text-center font-serif text-xl font-bold sm:text-2xl lg:text-3xl">Order Confirmed!</h1>
              <p className="mt-2 text-center text-sm text-[#C5C5C7] sm:text-lg lg:text-xl">Your order has been successfully placed</p>

              <div className="mt-4 rounded-[14px] bg-[#4A4A4D] p-4">
                <h2 className="text-center font-serif text-xl font-bold text-[#47CC4C] sm:text-2xl lg:text-3xl">Order Number</h2>
                <p className="text-center text-lg font-bold tracking-wide sm:text-xl lg:text-2xl">{displayOrderNumber}</p>

                <div className="mt-2 border-t border-[#A8A8AA] pt-2 text-sm leading-tight sm:text-lg lg:text-xl">
                  <p className="text-[#E2E2E2]">Name</p>
                  <p className="font-bold">{displayName}</p>
                </div>

                <div className="mt-2 border-t border-[#A8A8AA] pt-2 text-sm leading-tight sm:text-lg lg:text-xl">
                  <p className="text-[#E2E2E2]">Mobile Number</p>
                  <p className="font-bold">{displayMobile}</p>
                </div>

                <div className="mt-2 border-t border-[#A8A8AA] pt-2 text-sm leading-tight sm:text-lg lg:text-xl">
                  <p className="text-[#E2E2E2]">Payment Method</p>
                  <p className="font-bold">{paymentMethodLabel}</p>
                </div>

                <div className="mt-2 border-t border-[#A8A8AA] pt-2 text-sm leading-tight sm:text-lg lg:text-xl">
                  <p className="text-[#E2E2E2]">Order Items</p>
                  <div className="mt-1 max-h-[20vh] no-scrollbar overflow-y-auto">
                  {displayItems.map((item) => (
                    <div key={`${item.productId}-${item.variant}-${item.pickupDate}`} className="mt-1">
                      <p className="font-bold">{item.productName}</p>
                      <p className="text-xs text-[#D0D0D3] sm:text-sm lg:text-xl">
                        {item.variant} . Qty: {item.quantity} . Pickup: {formatPickupDate(item.pickupDate)}
                      </p>
                    </div>
                  ))}
                  </div>
                </div>

                <div className="mt-3 border-t border-[#A8A8AA] pt-2">
                  <p className="text-base text-[#E2E2E2] sm:text-xl lg:text-2xl">Total</p>
                  <p className="text-xl font-bold text-[#47CC4C] sm:text-2xl lg:text-3xl">P{formatMoney(displayTotal)}</p>
                </div>
              </div>
            </section>

            <Button
              type="button"
              onClick={handleDownloadReceipt}
              className="mt-5 h-12 w-full rounded-2xl bg-[#47DD52] text-sm font-semibold text-white hover:bg-[#3FC84A] sm:h-14 sm:text-base lg:h-13 lg:text-lg"
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
