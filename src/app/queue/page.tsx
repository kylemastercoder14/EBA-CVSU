"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Loader2,
  PackageCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";

import { orpc } from "@/lib/orpc";

type QueueStatus =
  | "Pending"
  | "To Pay"
  | "Preparing"
  | "Ready"
  | "Released";

type QueueBoardOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  itemsSummary: string;
  quantity: number;
  paymentMethod: "GCash" | "Cash";
  paymentStatus: "Pending" | "Verified";
  stage: "TO_CONFIRM" | "TO_PAY" | "PAID" | "COMPLETED";
  releaseStatus: "READY" | "RELEASED";
  queueStatus: QueueStatus;
  createdAt: string;
  pickupDate: string;
};

const STATUS_ORDER: QueueStatus[] = [
  "Pending",
  "To Pay",
  "Preparing",
  "Ready",
  "Released",
];
const MAX_ORDERS_PER_STATUS = 5;
const QUEUE_STATUS_ROTATE_INTERVAL_MS = 4000;
const QUEUE_VOICE_STORAGE_KEY = "queue-voice-enabled";
const READY_ANNOUNCEMENT_REPEAT_COUNT = 3;
const READY_ANNOUNCE_API_PATH = "/api/queue/announce";

const STATUS_META: Record<
  QueueStatus,
  {
    title: string;
    subtitle: string;
    accent: string;
    chip: string;
    border: string;
    icon: typeof Clock3;
  }
> = {
  Pending: {
    title: "Pending",
    subtitle: "Awaiting confirmation",
    accent: "text-amber-200",
    chip: "bg-amber-300/15 text-amber-100 ring-1 ring-amber-200/30",
    border: "border-amber-300/35",
    icon: Clock3,
  },
  "To Pay": {
    title: "To Pay",
    subtitle: "Payment still pending",
    accent: "text-orange-200",
    chip: "bg-orange-300/15 text-orange-100 ring-1 ring-orange-200/30",
    border: "border-orange-300/35",
    icon: CircleDollarSign,
  },
  Preparing: {
    title: "Preparing",
    subtitle: "Processing order",
    accent: "text-cyan-200",
    chip: "bg-cyan-300/15 text-cyan-100 ring-1 ring-cyan-200/30",
    border: "border-cyan-300/35",
    icon: Loader2,
  },
  Ready: {
    title: "Ready",
    subtitle: "Ready for pickup",
    accent: "text-emerald-200",
    chip: "bg-emerald-300/15 text-emerald-100 ring-1 ring-emerald-200/30",
    border: "border-emerald-300/40",
    icon: PackageCheck,
  },
  Released: {
    title: "Released",
    subtitle: "Already claimed",
    accent: "text-indigo-200",
    chip: "bg-indigo-300/15 text-indigo-100 ring-1 ring-indigo-200/30",
    border: "border-indigo-300/35",
    icon: ClipboardCheck,
  },
};

const formatBoardTime = (value: string) =>
  new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));

const buildReadyAnnouncementText = (order: QueueBoardOrder) => {
  const rawOrderNumber = order.orderNumber?.trim() || "";
  const numericPart = rawOrderNumber.replace(/^ORD-?/i, "");
  const spokenNumber = (numericPart || rawOrderNumber).split("").join(" ");

  return `Order number ${spokenNumber} is now ready. Please proceed to the EBA counter for pickup.`;
};

const playAudioBlobRepeated = async (blob: Blob, repeatCount: number) => {
  if (typeof window === "undefined") return;

  const objectUrl = window.URL.createObjectURL(blob);
  try {
    for (let i = 0; i < repeatCount; i += 1) {
      const audio = new Audio(objectUrl);
      audio.preload = "auto";
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          audio.onended = null;
          audio.onerror = null;
        };

        audio.onended = () => {
          cleanup();
          resolve();
        };
        audio.onerror = () => {
          cleanup();
          reject(new Error("Failed to play ElevenLabs audio."));
        };

        audio
          .play()
          .then(() => undefined)
          .catch((error) => {
            cleanup();
            reject(error);
          });
      });
    }
  } finally {
    window.setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 15_000);
  }
};

const requestElevenLabsAnnouncementAudio = async (text: string) => {
  const response = await fetch(READY_ANNOUNCE_API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    let details = "";
    try {
      const payload = (await response.json()) as { error?: string; details?: string };
      details = [payload.error, payload.details].filter(Boolean).join(" | ");
    } catch {
      details = await response.text().catch(() => "");
    }
    throw new Error(
      `ElevenLabs announcement failed (${response.status})${details ? `: ${details}` : ""}`,
    );
  }

  return response.blob();
};

const isAutoplayBlockedError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "NotAllowedError" ||
    /didn'?t interact with the document first/i.test(error.message)
  );
};

const speakReadyOrder = (order: QueueBoardOrder) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const synth = window.speechSynthesis;
  const announcementText = buildReadyAnnouncementText(order);

  const voices = synth.getVoices();
  const femaleVoice =
    voices.find((voice) =>
      /(zira|aria|hazel|susan|eva|jenny|female|samantha|michelle|libby|sonia|katya)/i.test(
        voice.name,
      ),
    ) ??
    voices.find((voice) =>
      /(zira|aria|hazel|susan|eva|jenny|female)/i.test(voice.voiceURI),
    );
  const preferredVoice =
    femaleVoice ??
    voices.find((voice) => /english \(philippines\)/i.test(voice.name)) ??
    voices.find((voice) => /^en(-|_)?ph/i.test(voice.lang)) ??
    voices.find((voice) => /^en/i.test(voice.lang));

  for (let i = 0; i < READY_ANNOUNCEMENT_REPEAT_COUNT; i += 1) {
    const utterance = new SpeechSynthesisUtterance(announcementText);
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.volume = 1;
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    synth.speak(utterance);
  }
};

const LiveClock = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-2xl border border-white/15 bg-white/6 px-4 py-3 text-right backdrop-blur-md">
      <p className="font-serif text-2xl font-black tracking-wide text-white">
        {now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })}
      </p>
      <p className="text-xs tracking-[0.18em] text-white/60 uppercase">
        {now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </div>
  );
};

const QueueOrderRow = ({
  order,
  index,
  emphasize,
}: {
  order: QueueBoardOrder;
  index: number;
  emphasize?: boolean;
}) => {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/6 px-4 py-3 shadow-[0_10px_26px_rgba(4,20,36,0.16)] backdrop-blur-sm transition-transform duration-200 ${
        emphasize ? "ring-1 ring-emerald-200/30" : ""
      }`}
      style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-2xl font-black tracking-[0.12em] text-white">
            {order.orderNumber.replace(/^ORD-/, "")}
          </p>
          <p className="mt-0.5 truncate text-xs tracking-[0.14em] text-white/60 uppercase">
            {order.orderNumber}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 px-2.5 py-1 text-right">
          <p className="text-[11px] tracking-[0.16em] text-white/55 uppercase">Time</p>
          <p className="text-sm font-semibold tabular-nums text-white/90">
            {formatBoardTime(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-white/5 px-3 py-2">
          <div className="flex items-center gap-1.5 text-white/55">
            <UserRound className="size-3.5" />
            <span className="tracking-[0.14em] uppercase">Customer</span>
          </div>
          <p className="mt-1 truncate font-medium text-white/95">{order.customerName}</p>
        </div>
        <div className="rounded-xl bg-white/5 px-3 py-2">
          <div className="flex items-center gap-1.5 text-white/55">
            <ShoppingBag className="size-3.5" />
            <span className="tracking-[0.14em] uppercase">Items</span>
          </div>
          <p className="mt-1 font-medium text-white/95">
            {order.quantity} item{order.quantity > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <p className="mt-2 truncate rounded-xl bg-black/15 px-3 py-2 text-xs text-white/80">
        {order.itemsSummary}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] tracking-[0.14em] text-white/80 uppercase">
          {order.paymentMethod}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] tracking-[0.14em] uppercase ${
            order.paymentStatus === "Verified"
              ? "bg-emerald-300/15 text-emerald-100 ring-1 ring-emerald-200/25"
              : "bg-amber-300/15 text-amber-100 ring-1 ring-amber-200/25"
          }`}
        >
          {order.paymentStatus}
        </span>
        <span className="ml-auto text-[11px] tracking-[0.14em] text-white/55 uppercase">
          Pickup {order.pickupDate}
        </span>
      </div>
    </div>
  );
};

const QueueStatusPanel = ({
  status,
  orders,
  rotationStep,
}: {
  status: QueueStatus;
  orders: QueueBoardOrder[];
  rotationStep: number;
}) => {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const visibleOrder =
    orders.length > 0 ? orders[rotationStep % orders.length] : null;

  return (
    <section
      className={`flex min-h-65 flex-col overflow-hidden rounded-3xl border ${meta.border} bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] shadow-[0_16px_40px_rgba(1,11,20,0.22)] backdrop-blur-md`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-white/8">
              <Icon
                className={`size-4 ${status === "Preparing" && orders.length > 0 ? "animate-spin" : ""} ${meta.accent}`}
              />
            </span>
            <h2 className="font-serif text-2xl font-black text-white">{meta.title}</h2>
          </div>
          <p className="mt-1 text-xs tracking-[0.16em] text-white/55 uppercase">
            {meta.subtitle}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.chip}`}>
          {orders.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visibleOrder == null ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/2 px-4 text-center">
            <p className="font-serif text-base italic text-white/45">
              No orders in {meta.title.toLowerCase()}
            </p>
          </div>
        ) : (
          <>
            <QueueOrderRow
              key={`${visibleOrder.id}-${rotationStep}`}
              order={visibleOrder}
              index={0}
              emphasize={status === "Ready"}
            />
            {orders.length > 1 && (
              <p className="text-center text-[11px] tracking-[0.14em] text-white/45 uppercase">
                Showing 1 of {orders.length} latest orders
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
};

const LoadingBoard = () => (
  <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: 5 }).map((_, index) => (
      <div
        key={index}
        className="h-65 animate-pulse rounded-3xl border border-white/10 bg-white/5"
      />
    ))}
  </div>
);

const QueueDisplayPage = () => {
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(QUEUE_VOICE_STORAGE_KEY);
    return saved == null ? true : saved === "1";
  });
  const didPrimeSnapshotRef = useRef(false);
  const previousStatusMapRef = useRef<Map<string, QueueStatus>>(new Map());
  const voiceEnabledRef = useRef(voiceEnabled);
  const announcementQueueRef = useRef(Promise.resolve());
  const hasUserInteractedRef = useRef(false);
  const pendingReadyAnnouncementsRef = useRef<QueueBoardOrder[]>([]);
  const [rotationStep, setRotationStep] = useState(0);

  const query = useQuery({
    ...orpc.order.listQueue.queryOptions(),
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
  });

  const orders = (query.data?.orders ?? []) as QueueBoardOrder[];

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      QUEUE_VOICE_STORAGE_KEY,
      voiceEnabled ? "1" : "0",
    );
  }, [voiceEnabled]);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const markInteracted = () => {
      hasUserInteractedRef.current = true;
    };

    window.addEventListener("pointerdown", markInteracted, { passive: true });
    window.addEventListener("keydown", markInteracted);

    return () => {
      window.removeEventListener("pointerdown", markInteracted);
      window.removeEventListener("keydown", markInteracted);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRotationStep((current) => current + 1);
    }, QUEUE_STATUS_ROTATE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  const enqueueAnnouncementBatch = (batch: QueueBoardOrder[]) => {
    if (batch.length === 0) return;

    announcementQueueRef.current = announcementQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        for (const order of batch) {
          if (!voiceEnabledRef.current) return;

          try {
            const audioBlob = await requestElevenLabsAnnouncementAudio(
              buildReadyAnnouncementText(order),
            );
            if (!voiceEnabledRef.current) return;
            await playAudioBlobRepeated(audioBlob, READY_ANNOUNCEMENT_REPEAT_COUNT);
          } catch (error) {
            if (isAutoplayBlockedError(error)) {
              if (
                !pendingReadyAnnouncementsRef.current.some(
                  (pending) => pending.id === order.id,
                )
              ) {
                pendingReadyAnnouncementsRef.current.push(order);
              }
              return;
            }

            console.warn("[Queue] ElevenLabs announcement failed, using browser voice.", error);
            if (!voiceEnabledRef.current) return;
            speakReadyOrder(order);
          }
        }
      });
  };

  useEffect(() => {
    if (!query.data) return;
    const latestOrders = (query.data.orders ?? []) as QueueBoardOrder[];

    const nextStatusMap = new Map<string, QueueStatus>();
    const newlyReady: QueueBoardOrder[] = [];

    for (const order of latestOrders) {
      nextStatusMap.set(order.id, order.queueStatus);
      const previousStatus = previousStatusMapRef.current.get(order.id);

      if (
        didPrimeSnapshotRef.current &&
        order.queueStatus === "Ready" &&
        previousStatus !== "Ready"
      ) {
        newlyReady.push(order);
      }
    }

    previousStatusMapRef.current = nextStatusMap;

    if (!didPrimeSnapshotRef.current) {
      didPrimeSnapshotRef.current = true;
      return;
    }

    if (!voiceEnabled || newlyReady.length === 0) return;
    if (typeof document !== "undefined" && document.hidden) return;

    // Announce oldest first if multiple orders became ready in one refresh cycle.
    const readyQueue = newlyReady
      .slice()
      .sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    if (!hasUserInteractedRef.current) {
      const existingIds = new Set(pendingReadyAnnouncementsRef.current.map((item) => item.id));
      for (const order of readyQueue) {
        if (!existingIds.has(order.id)) {
          pendingReadyAnnouncementsRef.current.push(order);
          existingIds.add(order.id);
        }
      }
      return;
    }

    enqueueAnnouncementBatch(readyQueue);
  }, [query.data, query.dataUpdatedAt, voiceEnabled]);

  useEffect(() => {
    if (!voiceEnabled) return;
    if (!hasUserInteractedRef.current) return;
    if (pendingReadyAnnouncementsRef.current.length === 0) return;

    const pendingBatch = pendingReadyAnnouncementsRef.current
      .slice()
      .sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    pendingReadyAnnouncementsRef.current = [];

    enqueueAnnouncementBatch(pendingBatch);
  }, [voiceEnabled, query.dataUpdatedAt]);

  const grouped = STATUS_ORDER.reduce<Record<QueueStatus, QueueBoardOrder[]>>(
    (acc, status) => {
      acc[status] = [];
      return acc;
    },
    { Pending: [], "To Pay": [], Preparing: [], Ready: [], Released: [] },
  );

  for (const order of orders) {
    if (grouped[order.queueStatus].length < MAX_ORDERS_PER_STATUS) {
      grouped[order.queueStatus].push(order);
    }
  }

  const totalVisible = orders.length;
  const activeCount =
    grouped.Pending.length +
    grouped["To Pay"].length +
    grouped.Preparing.length +
    grouped.Ready.length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#041420] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(20,184,166,0.24),transparent_38%),radial-gradient(circle_at_88%_22%,rgba(59,130,246,0.22),transparent_35%),radial-gradient(circle_at_50%_88%,rgba(251,146,60,0.12),transparent_42%)]" />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-size-[28px_28px]" />
      </div>

      <main className="relative z-10 flex min-h-screen flex-col px-5 py-5 md:px-8 md:py-6">
        <header className="rounded-3xl border border-white/10 bg-white/4 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.2)] backdrop-blur-md md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/20 bg-teal-300/10 px-3 py-1">
                <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
                <span className="text-xs tracking-[0.16em] text-teal-50/85 uppercase">
                  Live Queue Display
                </span>
              </div>
              <h1 className="mt-3 font-serif text-4xl font-black tracking-tight text-white md:text-5xl">
                EBA Kiosk Order Queue
              </h1>
              <p className="mt-2 max-w-4xl text-sm text-white/70 md:text-base">
                Real-time order status board for today&apos;s transactions. Showing the latest{" "}
                {MAX_ORDERS_PER_STATUS} orders per status.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
              <button
                type="button"
                onClick={() => {
                  hasUserInteractedRef.current = true;
                  setVoiceEnabled((current) => {
                    const next = !current;
                    if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
                      window.speechSynthesis.cancel();
                    }
                    return next;
                  });
                }}
                className={`rounded-2xl border px-4 py-3 text-left backdrop-blur-md transition-colors ${
                  voiceEnabled
                    ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-50"
                    : "border-white/10 bg-black/20 text-white/70"
                }`}
                title="Browser may require one tap to enable voice announcements"
              >
                <p className="text-[11px] tracking-[0.16em] uppercase">
                  Voice Announce
                </p>
                <p className="font-serif text-lg font-bold">
                  {voiceEnabled ? "On (Ready x3)" : "Off"}
                </p>
              </button>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[11px] tracking-[0.16em] text-white/55 uppercase">
                    Active Orders
                  </p>
                  <p className="font-serif text-2xl font-black text-white">{activeCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[11px] tracking-[0.16em] text-white/55 uppercase">
                    Total Shown
                  </p>
                  <p className="font-serif text-2xl font-black text-white">{totalVisible}</p>
                </div>
              </div>
              <LiveClock />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {STATUS_ORDER.map((status) => (
              <span
                key={status}
                className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_META[status].chip}`}
              >
                {status}: {grouped[status].length}
              </span>
            ))}
            <span className="ml-auto text-xs tracking-[0.14em] text-white/50 uppercase">
              {query.isFetching
                ? "Refreshing..."
                : query.dataUpdatedAt > 0
                  ? `Updated ${new Date(query.dataUpdatedAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })}`
                  : "Waiting for first load"}
            </span>
          </div>
        </header>

        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          {query.isLoading ? (
            <LoadingBoard />
          ) : query.isError ? (
            <div className="flex flex-1 items-center justify-center rounded-3xl border border-red-300/20 bg-red-300/5 p-6 text-center">
              <div>
                <p className="font-serif text-2xl font-bold text-red-100">
                  Unable to load queue
                </p>
                <p className="mt-2 text-sm text-red-100/75">
                  Please check the server connection and refresh this page.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {STATUS_ORDER.map((status) => (
                <QueueStatusPanel
                  key={status}
                  status={status}
                  orders={grouped[status]}
                  rotationStep={rotationStep}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="mt-4 text-center text-xs tracking-[0.14em] text-white/45 uppercase">
          Please proceed to the EBA counter once your order appears under Ready
        </footer>
      </main>
    </div>
  );
};

export default QueueDisplayPage;
