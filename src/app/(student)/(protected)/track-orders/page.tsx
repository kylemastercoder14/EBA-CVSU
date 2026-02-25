"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDaysIcon,
  PrinterIcon,
  ShoppingCartIcon,
  ShirtIcon,
} from "lucide-react";
import { orpc } from "@/lib/orpc";

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

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

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

  const handlePrintOrder = (order: TrackOrder) => {
    const receiptWindow = window.open(
      window.location.href,
      "_blank",
      "width=900,height=1100",
    );
    if (!receiptWindow) return;

    const issuedAt = new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      day: "numeric",
      year: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());

    const itemRows = order.items
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.size)}</td>
            <td>${item.quantity}</td>
            <td>PHP ${formatMoney(item.total / item.quantity)}</td>
            <td>PHP ${formatMoney(item.total)}</td>
          </tr>
        `,
      )
      .join("");

    const total = order.items.reduce((sum, item) => sum + item.total, 0);

    receiptWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt ORD-${escapeHtml(order.orderNumber)}</title>
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
                <span>${escapeHtml(issuedAt)}</span>
                <span>Receipt ORD-${escapeHtml(order.orderNumber)}</span>
              </div>
              <h1 class="title">EBA ORDER RECEIPT</h1>
              <p class="subtitle">External and Business Affair Ordering System</p>
            </header>

            <div class="grid">
              <div><span class="label">Order Number:</span> ORD-${escapeHtml(order.orderNumber)}</div>
              <div><span class="label">Ordered At:</span> ${escapeHtml(order.orderedAt)}</div>
              <div><span class="label">Payment Method:</span> ${escapeHtml(order.paymentMethod)}</div>
              <div><span class="label">Stage:</span> ${escapeHtml(tabs.find((tab) => tab.key === order.stage)?.label ?? "-")}</div>
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

            <div class="totals">TOTAL: PHP ${formatMoney(total)}</div>

			 <div class="footer">
              This receipt serves as proof of order and payment confirmation.
            </div>
          </section>
        </body>
      </html>
    `);

    receiptWindow.document.close();
    receiptWindow.focus();
    window.setTimeout(() => receiptWindow.print(), 250);
  };

  return (
    <main className="min-h-[calc(100dvh-80px)] bg-[#C8D6E4] px-3 py-5 sm:px-4">
      <section className="rounded-2xl bg-[#07545A] p-1.5">
        <div className="grid grid-cols-4 gap-1">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl px-2 py-2 text-center font-serif text-xl transition-colors ${
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
      </section>

      <section className="mt-6 space-y-5">
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

            <div className="rounded-none bg-[#4E8AC7] px-4 py-3 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-3xl leading-none">
                    Order #{order.orderNumber}
                  </h2>
                  <p className="mt-1 text-xl mb-3 text-[#D6ECFF]">
                    Ordered on {order.orderedAt}
                  </p>
                  <button
                    type="button"
                    onClick={() => handlePrintOrder(order)}
                    className="inline-flex items-center gap-1 rounded-md bg-[#2AA72A] px-2 py-1 text-lg text-white hover:bg-[#2AA72A]/90"
                  >
                    <PrinterIcon className="size-4" />
                    Print Receipt
                  </button>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="min-w-44 rounded-xl bg-[#0D5A67] px-3 py-2 text-center">
                    <p className="text-xl text-[#D2E8EB]">Payment Method</p>
                    <p className="mt-0.5 text-3xl font-semibold">
                      {order.paymentMethod}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-3">
              {order.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[110px_1fr] gap-4">
                  <div className="relative h-27 w-27 overflow-hidden rounded-[18px] border-2 border-[#0A5A62] bg-[#C4D8E8]">
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
                      <h3 className="font-serif text-3xl text-[#0E4D5B]">
                        {item.name}
                      </h3>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-y-2 text-2xl text-[#0A5462]">
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
                          ₱{formatMoney(item.total)}
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
