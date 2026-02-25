"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  PackageCheckIcon,
  RefreshCcwIcon,
  RulerIcon,
  WrenchIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { orpc } from "@/lib/orpc";

type StudentSession = {
  id?: string | null;
  fullName?: string | null;
  mobileNumber?: string | null;
  cvsuEmail?: string | null;
  studentNumber?: string | null;
};

type ReplaceReasonKey =
  | "WRONG_ITEM"
  | "DEFECTIVE_ITEM"
  | "WRONG_SIZE"
  | "CHANGE_OF_MIND";

type TrackStage = "to-pay" | "preparing" | "ready" | "completed" | "cancelled";

type StudentOrderItem = {
  id: string;
  name: string;
  quantity: number;
  size: string;
  pickupDate: string;
  total: number;
  image: string;
};

type StudentOrder = {
  id: string;
  orderNumber: string;
  orderedAt: string;
  paymentMethod: "GCash" | "Cash";
  paymentStatus: "PENDING" | "VERIFIED" | "DECLINED";
  stage: TrackStage;
  items: StudentOrderItem[];
};

type MyReplaceRequest = {
  id: string;
  orderNumber: string;
  reason: ReplaceReasonKey;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

const REPLACEMENT_REASONS: Array<{
  key: ReplaceReasonKey;
  label: string;
  description: string;
  icon: typeof AlertCircleIcon;
  accent: string;
  iconBg: string;
}> = [
  {
    key: "WRONG_ITEM",
    label: "Wrong Item",
    description: "You received a different product than what you ordered.",
    icon: AlertCircleIcon,
    accent: "border-[#D36A43] bg-[#FFF2EC] text-[#8C3716]",
    iconBg: "bg-[#D36A43]",
  },
  {
    key: "DEFECTIVE_ITEM",
    label: "Defective Item",
    description: "The item has a defect or damage upon claiming.",
    icon: WrenchIcon,
    accent: "border-[#0C6A6D] bg-[#E8F8F8] text-[#084E50]",
    iconBg: "bg-[#0C6A6D]",
  },
  {
    key: "WRONG_SIZE",
    label: "Wrong Size",
    description: "The item size does not match what was prepared/released.",
    icon: RulerIcon,
    accent: "border-[#2C6CCF] bg-[#EEF5FF] text-[#17458F]",
    iconBg: "bg-[#2C6CCF]",
  },
  {
    key: "CHANGE_OF_MIND",
    label: "Change of Mind",
    description: "Request is subject to EBA review and approval.",
    icon: RefreshCcwIcon,
    accent: "border-[#A7642D] bg-[#FFF6EC] text-[#7E451B]",
    iconBg: "bg-[#C47A36]",
  },
];

const reasonLabel: Record<ReplaceReasonKey, string> = {
  WRONG_ITEM: "Wrong Item",
  DEFECTIVE_ITEM: "Defective Item",
  WRONG_SIZE: "Wrong Size",
  CHANGE_OF_MIND: "Change of Mind",
};

const replaceStatusLabel = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
} as const;

const formatDate = (value?: string | null) => {
  if (!value || value === "-") return "-";
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
};

const statusBadgeClass = (status: MyReplaceRequest["status"]) => {
  if (status === "APPROVED") return "bg-[#0B525B] text-white";
  if (status === "REJECTED") return "bg-[#C54E45] text-white";
  return "bg-[#E8F0FA] text-[#245B6B]";
};

const Page = () => {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
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
  const [selectedOrderNumber, setSelectedOrderNumber] = useState("");
  const [selectedReason, setSelectedReason] = useState<ReplaceReasonKey | null>(
    null,
  );
  const [lastSubmitted, setLastSubmitted] = useState<{
    replaceRequestId: string;
    orderNumber: string;
    reason: ReplaceReasonKey;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
  } | null>(null);
  const prefilledOrderNumberFromUrl = useMemo(
    () => searchParams.get("order")?.trim().toUpperCase() ?? "",
    [searchParams],
  );

  const userId = studentSession.id ?? "";

  const ordersQuery = useQuery({
    ...orpc.order.listByUser.queryOptions({
      input: { userId },
    }),
    enabled: Boolean(userId),
  });

  const replaceRequestsQuery = useQuery({
    ...orpc.replace.list.queryOptions(),
    enabled: Boolean(userId),
  });

  const createReplaceMutation = useMutation(
    orpc.replace.create.mutationOptions({
      onSuccess: (result) => {
        setLastSubmitted({
          replaceRequestId: result.replaceRequest.id,
          orderNumber: result.replaceRequest.orderNumber,
          reason: result.replaceRequest.reason,
          status: result.replaceRequest.status,
          createdAt: result.replaceRequest.createdAt,
        });
        toast.success("Replacement request submitted successfully.");
        queryClient.invalidateQueries({
          queryKey: orpc.replace.list.queryKey(),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Unable to submit replacement request.");
      },
    }),
  );

  const orders = useMemo<StudentOrder[]>(
    () => (ordersQuery.data?.orders ?? []) as StudentOrder[],
    [ordersQuery.data?.orders],
  );

  const orderNumbersSet = useMemo(
    () => new Set(orders.map((order) => order.orderNumber)),
    [orders],
  );

  const myReplaceRequests = useMemo<MyReplaceRequest[]>(() => {
    const rows = replaceRequestsQuery.data?.replaceRequests ?? [];
    return rows
      .filter((row) => orderNumbersSet.has(row.orderNumber))
      .map((row) => ({
        id: row.id,
        orderNumber: row.orderNumber,
        reason: row.reason,
        status: row.status,
        createdAt: row.createdAt,
      }))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [replaceRequestsQuery.data?.replaceRequests, orderNumbersSet]);

  const eligibleOrders = useMemo(
    () => orders.filter((order) => order.stage === "ready" || order.stage === "completed"),
    [orders],
  );

  const effectiveSelectedOrderNumber =
    (selectedOrderNumber &&
    eligibleOrders.some((order) => order.orderNumber === selectedOrderNumber)
      ? selectedOrderNumber
      : prefilledOrderNumberFromUrl &&
          eligibleOrders.some(
            (order) => order.orderNumber === prefilledOrderNumberFromUrl,
          )
        ? prefilledOrderNumberFromUrl
        : eligibleOrders[0]?.orderNumber) || "";

  const selectedOrder = useMemo(
    () =>
      eligibleOrders.find(
        (order) => order.orderNumber === effectiveSelectedOrderNumber,
      ) ?? null,
    [effectiveSelectedOrderNumber, eligibleOrders],
  );

  const selectedOrderPendingRequest = useMemo(
    () =>
      myReplaceRequests.find(
        (request) =>
          request.orderNumber === effectiveSelectedOrderNumber &&
          request.status === "PENDING",
      ) ?? null,
    [effectiveSelectedOrderNumber, myReplaceRequests],
  );

  const canSubmit =
    Boolean(effectiveSelectedOrderNumber) &&
    Boolean(selectedReason) &&
    !selectedOrderPendingRequest &&
    !createReplaceMutation.isPending;

  const handleSubmit = async () => {
    if (!effectiveSelectedOrderNumber) {
      toast.error("Please select an order first.");
      return;
    }
    if (!selectedReason) {
      toast.error("Please select a return reason.");
      return;
    }

    await createReplaceMutation.mutateAsync({
      orderNumber: effectiveSelectedOrderNumber,
      reason: selectedReason,
    });
  };

  const sessionMissing = !userId;
  const showOrdersLoading = Boolean(userId) && ordersQuery.isLoading;
  const showOrdersError = Boolean(userId) && ordersQuery.isError;

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto max-w-7xl rounded-2xl border border-[#0B525B]/15 bg-white/25 p-5 shadow-[0_10px_30px_rgba(11,82,91,0.08)] backdrop-blur-sm sm:p-7">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-serif text-xs font-semibold uppercase tracking-wide text-[#0B525B]/65">
              Student Portal
            </p>
            <h1 className="mt-2 font-serif text-2xl font-bold text-[#0B525B] sm:text-3xl lg:text-4xl">
              Item Replacement Request
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-[#426C77] sm:text-base lg:text-lg">
              Submit a replacement request for claimed items. Select your order,
              choose a reason, then wait for EBA approval before visiting the office.
            </p>
          </div>
          <div className="rounded-xl border border-[#0B525B]/15 bg-[#EAF3FB]/70 px-4 py-3 text-sm text-[#0B525B]/80">
            Use completed or ready-for-pickup orders only
          </div>
        </div>
      </section>

      <div className="mx-auto mt-6 grid max-w-7xl gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-[#0B525B]/15 bg-white/35 p-4 shadow-[0_10px_24px_rgba(11,82,91,0.06)] backdrop-blur-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center shrink-0 rounded-full bg-[#0B525B] text-white">
              <ClipboardListIcon className="size-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#0B525B] sm:text-xl lg:text-2xl">
                Submit Request
              </h2>
              <p className="text-sm text-[#4B7480] sm:text-base">
                Select your order and the reason for replacement.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {sessionMissing && (
              <div className="rounded-2xl border border-[#D48A7A] bg-[#FFF1ED] px-4 py-3 text-sm text-[#8A3323]">
                Student session not found. Please login again to submit a replacement request.
              </div>
            )}

            {showOrdersLoading && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-36 bg-[#B8CBD7]" />
                <Skeleton className="h-12 w-full rounded-xl bg-[#D7E2EA]" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Skeleton className="h-22 rounded-2xl bg-[#D7E2EA]" />
                  <Skeleton className="h-22 rounded-2xl bg-[#D7E2EA]" />
                </div>
              </div>
            )}

            {showOrdersError && (
              <div className="rounded-2xl border border-[#D48A7A] bg-[#FFF1ED] px-4 py-3 text-sm text-[#8A3323]">
                Unable to load your orders right now. Please refresh and try again.
              </div>
            )}

            {!sessionMissing &&
              !showOrdersLoading &&
              !showOrdersError &&
              eligibleOrders.length === 0 && (
                <div className="rounded-2xl border border-[#0B525B]/15 bg-[#ECF4FB] px-4 py-4 text-sm text-[#295E6A]">
                  No eligible orders found yet. Replacement requests are recommended for
                  orders that are already <strong>Ready for Pick Up</strong> or{" "}
                  <strong>Completed</strong>.
                </div>
              )}

            {!sessionMissing &&
              !showOrdersLoading &&
              !showOrdersError &&
              eligibleOrders.length > 0 && (
                <>
                  <div>
                    <label className="mb-2 block font-serif text-base font-semibold text-[#0B525B] sm:text-lg">
                      Select Order
                    </label>
                    <Select
                      value={effectiveSelectedOrderNumber}
                      onValueChange={setSelectedOrderNumber}
                    >
                      <SelectTrigger className="h-11 w-full rounded-xl border-[#8DB2C5] bg-[#F2F7FB] text-left text-sm text-[#0B525B] sm:h-12 sm:text-base">
                        <SelectValue placeholder="Select an order number" />
                      </SelectTrigger>
                      <SelectContent className="border-[#8DB2C5] bg-[#F6FAFD]">
                        {eligibleOrders.map((order) => (
                          <SelectItem key={order.id} value={order.orderNumber}>
                            {order.orderNumber} • {replaceStatusLabelFromTrack(order.stage)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-xs text-[#4B7480] sm:text-sm">
                      Only your own eligible orders are listed here.
                    </p>
                  </div>

                  {selectedOrderPendingRequest && (
                    <div className="rounded-2xl border border-[#F2B15D] bg-[#FFF7EA] px-4 py-3 text-sm text-[#8A5715]">
                      A pending replacement request already exists for{" "}
                      <strong>{selectedOrderPendingRequest.orderNumber}</strong> (
                      {selectedOrderPendingRequest.id}). Please wait for admin review.
                    </div>
                  )}

                  <div>
                    <h3 className="mb-3 font-serif text-base font-semibold text-[#0B525B] sm:text-lg">
                      Return Reason
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {REPLACEMENT_REASONS.map((reason) => {
                        const Icon = reason.icon;
                        const active = selectedReason === reason.key;
                        return (
                          <button
                            key={reason.key}
                            type="button"
                            onClick={() => setSelectedReason(reason.key)}
                            className={cn(
                              "rounded-2xl border-2 p-4 text-left transition-all",
                              active
                                ? `${reason.accent} shadow-[0_10px_18px_rgba(11,82,91,0.08)]`
                                : "border-[#B9CCDA] bg-[#F1F7FB] text-[#174F5C] hover:border-[#8BAFC2] hover:bg-[#F6FAFD]",
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-white",
                                  active ? reason.iconBg : "bg-[#86A9BD]",
                                )}
                              >
                                <Icon className="size-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-serif text-base font-bold sm:text-lg">
                                  {reason.label}
                                </p>
                                <p className="mt-1 text-xs leading-5 opacity-85 sm:text-sm">
                                  {reason.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#0B525B]/10 bg-[#EDF5FB] px-4 py-3">
                    <p className="text-sm leading-6 text-[#295E6A] sm:text-base">
                      Bring the <strong>item</strong> and your{" "}
                      <strong>receipt</strong> to the EBA Office once your request is
                      approved.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={!canSubmit}
                    className="h-11 w-full rounded-full bg-[#07545A] text-sm font-semibold text-white hover:bg-[#064D52] sm:h-12 sm:text-base lg:text-lg"
                  >
                    {createReplaceMutation.isPending
                      ? "Submitting Request..."
                      : "Submit Replacement Request"}
                  </Button>
                </>
              )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-[#0B525B]/15 bg-white/35 p-4 shadow-[0_10px_24px_rgba(11,82,91,0.06)] backdrop-blur-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-[#0B525B] text-white shrink-0">
                <PackageCheckIcon className="size-5" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-[#0B525B] sm:text-xl lg:text-2xl">
                  Order Preview
                </h2>
                <p className="text-sm text-[#4B7480] sm:text-base">
                  Check the selected order before submitting.
                </p>
              </div>
            </div>

            <div className="mt-5">
              {!selectedOrder && (
                <div className="rounded-2xl border border-dashed border-[#A7BECC] bg-[#EDF4FA] px-4 py-6 text-center text-sm text-[#4B7480]">
                  Select an eligible order to preview its items.
                </div>
              )}

              {selectedOrder && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#B8CCDA] bg-[#F2F8FD] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-serif text-base font-bold text-[#0B525B] sm:text-lg lg:text-xl">
                        {selectedOrder.orderNumber}
                      </p>
                      <Badge className="rounded-full bg-[#0B525B] px-3 py-1 text-xs text-white sm:text-sm">
                        {replaceStatusLabelFromTrack(selectedOrder.stage)}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-[#345E69] sm:grid-cols-2 sm:text-base">
                      <p>Ordered: {formatDate(selectedOrder.orderedAt)}</p>
                      <p>Payment: {selectedOrder.paymentMethod}</p>
                      <p>
                        Payment Status:{" "}
                        <span className="font-semibold">
                          {selectedOrder.paymentStatus}
                        </span>
                      </p>
                      <p>
                        Pickup Date: {formatDate(selectedOrder.items[0]?.pickupDate)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[76px_1fr] gap-3 rounded-2xl border border-[#C2D3DE] bg-[#F7FBFE] p-3"
                      >
                        <div className="relative h-19 w-19 overflow-hidden rounded-xl bg-[#DCE9F3]">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-contain p-1"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-[#54727D]">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 font-serif text-base font-bold leading-tight text-[#0B525B] sm:text-lg">
                            {item.name}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#3C6470] sm:text-sm">
                            <span className="rounded-full bg-[#E4EEF6] px-2 py-0.5">
                              Qty: {item.quantity}
                            </span>
                            {item.size && item.size !== "-" && (
                              <span className="rounded-full bg-[#E4EEF6] px-2 py-0.5">
                                Size: {item.size}
                              </span>
                            )}
                            <span className="rounded-full bg-[#E4EEF6] px-2 py-0.5">
                              Pickup: {formatDate(item.pickupDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#0B525B]/15 bg-white/35 p-4 shadow-[0_10px_24px_rgba(11,82,91,0.06)] backdrop-blur-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-[#0B525B] text-white shrink-0">
                <CalendarDaysIcon className="size-5" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-[#0B525B] sm:text-xl lg:text-2xl">
                  My Replacement Requests
                </h2>
                <p className="text-sm text-[#4B7480] sm:text-base">
                  Status of your previously submitted requests.
                </p>
              </div>
            </div>

            <div className="mt-5">
              {replaceRequestsQuery.isLoading && userId && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-[#C2D3DE] bg-[#F7FBFE] p-3"
                    >
                      <Skeleton className="h-4 w-28 bg-[#D7E2EA]" />
                      <Skeleton className="mt-2 h-3 w-36 bg-[#E1EAF0]" />
                      <Skeleton className="mt-3 h-8 w-full rounded-xl bg-[#E7EFF4]" />
                    </div>
                  ))}
                </div>
              )}

              {!replaceRequestsQuery.isLoading && myReplaceRequests.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#A7BECC] bg-[#EDF4FA] px-4 py-6 text-center text-sm text-[#4B7480]">
                  No replacement requests submitted yet.
                </div>
              )}

              {!replaceRequestsQuery.isLoading && myReplaceRequests.length > 0 && (
                <ScrollArea className="h-70 rounded-xl pr-3 sm:h-85">
                  <div className="space-y-3">
                    {myReplaceRequests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-2xl border border-[#C2D3DE] bg-[#F7FBFE] p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-serif text-base font-bold text-[#0B525B] sm:text-lg">
                              {request.orderNumber}
                            </p>
                            <p className="text-xs text-[#53727D] sm:text-sm">
                              Request ID: {request.id}
                            </p>
                          </div>
                          <Badge className={cn("rounded-full px-3 py-1 text-xs sm:text-sm", statusBadgeClass(request.status))}>
                            {replaceStatusLabel[request.status]}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                          <span className="rounded-full bg-[#E5EFF6] px-2 py-0.5 text-[#325E69]">
                            {reasonLabel[request.reason]}
                          </span>
                          <span className="rounded-full bg-[#E5EFF6] px-2 py-0.5 text-[#325E69]">
                            Submitted {formatDate(request.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </section>

          {lastSubmitted && (
            <section className="rounded-2xl border border-[#9ACFB3] bg-[#ECFBF2] p-4 shadow-[0_8px_18px_rgba(11,82,91,0.06)] sm:p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white">
                  <CheckCircle2Icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-lg font-bold text-[#0D5B35] sm:text-xl">
                    Request Submitted
                  </p>
                  <p className="mt-1 text-sm text-[#266645] sm:text-base">
                    Your replacement request for <strong>{lastSubmitted.orderNumber}</strong> has been received.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[#225A3F]">
                      ID: {lastSubmitted.replaceRequestId}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[#225A3F]">
                      Reason: {reasonLabel[lastSubmitted.reason]}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[#225A3F]">
                      Status: {replaceStatusLabel[lastSubmitted.status]}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
};

const replaceStatusLabelFromTrack = (stage: TrackStage) => {
  if (stage === "completed") return "Completed";
  if (stage === "ready") return "Ready for Pick Up";
  if (stage === "preparing") return "Preparing";
  if (stage === "cancelled") return "Cancelled";
  return "To Pay";
};

export default Page;
