/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Clock } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type OrderStatus = "preparing" | "ready";

type QueueOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  addedAt: number; // timestamp
};

// ── Mock data — replace with real API/WebSocket polling ───────────────────────
const MOCK_ORDERS: QueueOrder[] = [
  { id: "1", orderNumber: "100010", status: "preparing", addedAt: Date.now() - 6000 },
  { id: "2", orderNumber: "100011", status: "preparing", addedAt: Date.now() - 4000 },
  { id: "3", orderNumber: "100012", status: "preparing", addedAt: Date.now() - 2000 },
  { id: "4", orderNumber: "100013", status: "preparing", addedAt: Date.now() - 1000 },
  { id: "5", orderNumber: "100007", status: "ready",    addedAt: Date.now() - 12000 },
  { id: "6", orderNumber: "100008", status: "ready",    addedAt: Date.now() - 10000 },
  { id: "7", orderNumber: "100009", status: "ready",    addedAt: Date.now() - 8000 },
];

// ── Order Row ─────────────────────────────────────────────────────────────────
const OrderRow = ({
  order,
  index,
}: {
  order: QueueOrder;
  index: number;
}) => {
  const isReady = order.status === "ready";

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border-l-4 px-5 py-4 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.1)] transition-all duration-500 animate-[rowIn_0.4s_ease_both] ${
        isReady
          ? "border-l-emerald-400 bg-white/30"
          : "border-l-amber-400 bg-white/15"
      }`}
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      {/* Order number */}
      <span className="flex-1 font-serif text-2xl font-extrabold tracking-widest text-[#07484A]">
        {order.orderNumber}
      </span>

      {/* Status icon */}
      {isReady ? (
        <CheckCircle2 className="size-7 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
      ) : (
        <Loader2 className="size-7 animate-spin text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
      )}
    </div>
  );
};

// ── Column ────────────────────────────────────────────────────────────────────
const QueueColumn = ({
  title,
  orders,
  type,
}: {
  title: string;
  orders: QueueOrder[];
  type: OrderStatus;
}) => {
  const isReady = type === "ready";

  return (
    <div
      className={`flex flex-1 flex-col overflow-hidden rounded-3xl border-2 backdrop-blur-sm shadow-[0_8px_40px_rgba(0,0,0,0.12)] ${
        isReady
          ? "border-emerald-400/50 bg-white/20"
          : "border-amber-400/50 bg-white/15"
      }`}
    >
      {/* Column header */}
      <div
        className={`flex items-center gap-3 px-6 py-5 border-b ${
          isReady ? "border-emerald-400/30" : "border-amber-400/30"
        }`}
      >
        {/* Accent dot */}
        <div
          className={`size-3 rounded-full shadow-[0_0_10px_3px] ${
            isReady
              ? "bg-emerald-400 shadow-emerald-400/60"
              : "bg-amber-400 shadow-amber-400/60 animate-[pulse_2s_ease-in-out_infinite]"
          }`}
        />
        <h2
          className={`font-serif text-3xl font-extrabold tracking-tight ${
            isReady ? "text-emerald-700" : "text-amber-700"
          }`}
        >
          {title}
        </h2>
      </div>

      {/* Order rows */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {orders.length > 0 ? (
          orders.map((o, i) => <OrderRow key={o.id} order={o} index={i} />)
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
            <Clock className={`size-10 opacity-25 ${isReady ? "text-emerald-600" : "text-amber-600"}`} />
            <p className="font-serif text-base italic text-[#07484A]/40">
              No orders {isReady ? "ready" : "being prepared"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Live Clock ────────────────────────────────────────────────────────────────
const LiveClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="text-right">
      <p className="font-serif text-3xl font-bold tabular-nums text-[#07484A]">{time}</p>
      <p className="font-serif text-sm italic text-[#07484A]/55">{date}</p>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const QueueDisplayPage = () => {
  const [orders, setOrders] = useState<QueueOrder[]>(MOCK_ORDERS);

  // ── Polling — replace this block with your real API or WebSocket ──
  useEffect(() => {
    const poll = async () => {
      try {
        // const res = await fetch("/api/queue");
        // const data = await res.json();
        // setOrders(data.orders);
      } catch {
        // silently retry on next tick
      }
    };

    poll();
    const interval = setInterval(poll, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, []);

  const preparing = orders.filter((o) => o.status === "preparing");
  const ready     = orders.filter((o) => o.status === "ready");

  return (
    <>
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 size-96 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="absolute -right-24 bottom-0 size-80 rounded-full bg-cyan-200/25 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-2xl" />
      </div>

      <main className="relative z-10 flex h-full flex-col px-8 py-6 gap-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between animate-[fadeUp_0.5s_ease_both]">
          {/* Branding */}
          <div>
            <h1 className="font-serif text-4xl font-extrabold tracking-tight text-[#07484A] drop-shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
              Order Queue
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_6px_2px_rgba(16,185,129,0.5)]" />
              <p className="font-serif text-sm italic text-[#07484A]/60">
                Cavite State University — Rosario Campus EBA Office
              </p>
            </div>
          </div>

          {/* Clock */}
          <LiveClock />
        </div>

        {/* ── Decorative divider ── */}
        <div className="flex items-center gap-4 animate-[fadeUp_0.6s_ease_0.1s_both]">
          <div className="h-px flex-1 bg-linear-to-r from-transparent via-white/50 to-transparent" />
          <span className="size-1.5 rounded-full bg-white/60" />
          <div className="h-px flex-1 bg-linear-to-r from-transparent via-white/50 to-transparent" />
        </div>

        {/* ── Two-column queue ── */}
        <div className="flex flex-1 gap-6 overflow-hidden animate-[fadeUp_0.7s_ease_0.2s_both]">
          <QueueColumn title="Preparing…"  orders={preparing} type="preparing" />
          <QueueColumn title="Order Ready" orders={ready}     type="ready"     />
        </div>

        {/* ── Footer note ── */}
        <p className="text-center font-serif text-sm italic text-[#07484A]/40 animate-[fadeUp_0.8s_ease_0.3s_both]">
          Please proceed to the EBA Office counter when your order number appears under "Order Ready"
        </p>
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.15); }
        }
      `}</style>
    </>
  );
};

export default QueueDisplayPage;
