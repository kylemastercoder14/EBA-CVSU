"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDaysIcon,
  PrinterIcon,
  RefreshCcwIcon,
  ShoppingCartIcon,
  ShirtIcon,
} from "lucide-react";
import { orpc } from "@/lib/orpc";
import { buildReceiptHtml } from "@/lib/receipt-template";
import type { KioskReceiptPayload } from "@/types/kiosk-receipt";

type TrackStage = "to-pay" | "preparing" | "ready" | "completed" | "cancelled";
type PaymentMethod = "GCash" | "Cash";

type TrackOrderItem = {
  id: string;
  name: string;
  quantity: number;
  size: string;
  pickupDate: string;
  total: number;
  image: string;
};

type TrackOrder = {
  id: string;
  orderNumber: string;
  orderedAt: string;
  paymentMethod: PaymentMethod;
  stage: TrackStage;
  items: TrackOrderItem[];
};

type StudentSession = {
  id?: string | null;
  fullName?: string | null;
  mobileNumber?: string | null;
  cvsuEmail?: string | null;
  studentNumber?: string | null;
};

const tabs: Array<{ key: TrackStage; label: string }> = [
  { key: "to-pay", label: "To Pay" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready for Pick Up" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const Page = () => {
  const [activeTab, setActiveTab] = useState<TrackStage>("to-pay");
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
  const userId = studentSession.id ?? "";

  const { data, isLoading, isError } = useQuery({
    ...orpc.order.listByUser.queryOptions({
      input: { userId },
    }),
    enabled: Boolean(userId),
  });

  const orders = useMemo<TrackOrder[]>(() => {
    return data?.orders ?? [];
  }, [data?.orders]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => order.stage === activeTab),
    [orders, activeTab],
  );

  const handleDownloadOrderReceipt = (order: TrackOrder) => {
    try {
      const orderedAtDate = new Date(`${order.orderedAt}T00:00:00`);
      const receiptPayload: KioskReceiptPayload = {
        orderNumber: order.orderNumber.startsWith("ORD-")
          ? order.orderNumber
          : `ORD-${order.orderNumber}`,
        issuedAt: Number.isNaN(orderedAtDate.getTime())
          ? new Date().toISOString()
          : orderedAtDate.toISOString(),
        customerName:
          studentSession.fullName ||
          studentSession.studentNumber ||
          studentSession.cvsuEmail?.split("@")[0] ||
          "Student",
        mobileNumber: studentSession.mobileNumber || "-",
        paymentMethod: order.paymentMethod === "GCash" ? "gcash" : "cash",
        paymentReference: null,
        items: order.items.map((item) => ({
          productId: item.id,
          productName: item.name,
          variant: item.size,
          pickupDate: item.pickupDate,
          quantity: item.quantity,
          unitPrice: item.quantity > 0 ? item.total / item.quantity : item.total,
          lineTotal: item.total,
        })),
        total: order.items.reduce((sum, item) => sum + item.total, 0),
      };

      const html = buildReceiptHtml(receiptPayload, {
        paymentMethodLabel: order.paymentMethod,
      });
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `${receiptPayload.orderNumber}-receipt.html`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      // no-op for now; keep track page lightweight
    }
  };

  return (
    <main className="min-h-[calc(100dvh-80px)] bg-[#C8D6E4] px-3 py-4 sm:px-4 sm:py-5 lg:px-8">
      <section className="mx-auto max-w-6xl rounded-2xl bg-[#07545A] p-1.5">
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 rounded-xl px-3 py-2 text-center font-serif text-sm transition-colors sm:text-base lg:text-lg ${
                  active
                    ? "bg-[#0D666B] text-white underline underline-offset-5"
                    : "text-[#E5F1F3] hover:bg-[#0B6065]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-6xl space-y-4 sm:mt-6 sm:space-y-5">
        {!userId && (
          <p className="rounded-xl bg-[#D4E0EA] px-4 py-3 text-center text-lg text-[#1E5D68]">
            Student session not found. Please login again.
          </p>
        )}

        {userId && isLoading && (
          <p className="rounded-xl bg-[#D4E0EA] px-4 py-3 text-center text-lg text-[#1E5D68]">
            Loading your orders...
          </p>
        )}

        {userId && isError && (
          <p className="rounded-xl bg-[#EACFCF] px-4 py-3 text-center text-lg text-[#7D2D2D]">
            Unable to load orders right now.
          </p>
        )}

        {userId && !isLoading && !isError && filteredOrders.length === 0 && (
          <p className="rounded-xl bg-[#D4E0EA] px-4 py-3 text-center text-lg text-[#1E5D68]">
            No orders under this stage.
          </p>
        )}

        {filteredOrders.map((order, index) => (
          <article key={order.id}>
            {index > 0 && activeTab === "completed" && (
              <div className="mb-4 h-px bg-[#7A8A95]" />
            )}

            <div className="rounded-xl bg-[#4E8AC7] px-3 py-3 text-white sm:px-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="font-serif text-xl leading-none sm:text-2xl lg:text-2xl">
                    Order #{order.orderNumber}
                  </h2>
                  <p className="mb-3 mt-1 text-sm text-[#D6ECFF] sm:text-base lg:text-xl">
                    Ordered on {order.orderedAt}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadOrderReceipt(order)}
                      className="inline-flex items-center gap-1 rounded-md bg-[#2AA72A] px-2 py-1 text-sm text-white hover:bg-[#2AA72A]/90 sm:text-base lg:text-lg"
                    >
                      <PrinterIcon className="size-4" />
                      Download Receipt
                    </button>
                    {(order.stage === "ready" || order.stage === "completed") && (
                      <Link
                        href={`/item-replacement?order=${encodeURIComponent(order.orderNumber)}`}
                        className="inline-flex items-center gap-1 rounded-md bg-[#C36631] px-2 py-1 text-sm text-white hover:bg-[#B45A29] sm:text-base lg:text-lg"
                      >
                        <RefreshCcwIcon className="size-4" />
                        Request Replacement
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2 lg:items-end">
                  <div className="min-w-38 rounded-xl bg-[#0D5A67] px-3 py-2 text-center sm:min-w-44">
                    <p className="text-sm text-[#D2E8EB] sm:text-base lg:text-xl">Payment Method</p>
                    <p className="mt-0.5 text-xl font-semibold sm:text-2xl lg:text-2xl">
                      {order.paymentMethod}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-3">
              {order.items.map((item) => (
                <div key={item.id} className="grid grid-cols-1 gap-3 sm:grid-cols-[110px_1fr] sm:gap-4">
                  <div className="relative h-24 w-24 overflow-hidden rounded-[18px] border-2 border-[#0A5A62] bg-[#C4D8E8] sm:h-27 sm:w-27">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-contain p-1"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[#486C77]">
                        No image
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-xl text-[#0E4D5B] sm:text-2xl lg:text-2xl">
                        {item.name}
                      </h3>
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-y-1 text-sm text-[#0A5462] sm:grid-cols-2 sm:gap-y-2 sm:text-base lg:text-lg">
                      <p className="inline-flex items-center gap-1.5">
                        <ShoppingCartIcon className="size-5" />
                        Quantity:{" "}
                        <span className="text-[#2AA72A]">{item.quantity}</span>
                      </p>
                      <p className="inline-flex items-center gap-1.5">
                        <ShirtIcon className="size-5" />
                        Size:{" "}
                        <span className="text-[#2AA72A]">{item.size}</span>
                      </p>
                      <p className="inline-flex items-center gap-1.5">
                        <CalendarDaysIcon className="size-5" />
                        Pickup:{" "}
                        <span className="text-[#2AA72A]">
                          {item.pickupDate}
                        </span>
                      </p>
                      <p>
                        Total:{" "}
                        <span className="text-[#2AA72A]">
                          PHP {formatMoney(item.total)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
};

export default Page;
