"use client";

import { Heading } from "@/components/Heading";
import { useMemo, useState } from "react";
import { OrderReleaseSectionCard } from "./_components/OrderReleaseSectionCard";
import { ReleaseOrderDialog } from "./_components/ReleaseOrderDialog";
import { Order } from "./_components/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";

type OrderReleaseSortKey = "orderNumber" | "name" | "pickupDate";
type SortDirection = "asc" | "desc";

const Page = () => {
  const queryClient = useQueryClient();
  const [readySearchQuery, setReadySearchQuery] = useState("");
  const [processingSearchQuery, setProcessingSearchQuery] = useState("");
  const [releasedSearchQuery, setReleasedSearchQuery] = useState("");
  const [processingCurrentPage, setProcessingCurrentPage] = useState(1);
  const [readyCurrentPage, setReadyCurrentPage] = useState(1);
  const [releasedCurrentPage, setReleasedCurrentPage] = useState(1);
  const [processingItemsPerPage, setProcessingItemsPerPage] = useState(5);
  const [readyItemsPerPage, setReadyItemsPerPage] = useState(5);
  const [releasedItemsPerPage, setReleasedItemsPerPage] = useState(5);
  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = useState(false);
  const [releaseDialogMode, setReleaseDialogMode] = useState<"ready" | "release">("release");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sortKey, setSortKey] = useState<OrderReleaseSortKey>("orderNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const { data, isLoading, isError } = useQuery(orpc.order.listRelease.queryOptions());
  const orders = useMemo(() => data?.orders ?? [], [data?.orders]);

  const releaseOrderMutation = useMutation(
    orpc.order.updateStatus.mutationOptions({
      onSuccess: (result) => {
        if (releaseDialogMode === "ready") {
          const sms = result.smsNotification;
          if (sms?.attempted && sms.sent) {
            toast.success("Order marked ready for pickup. SMS notification sent.");
          } else if (sms?.attempted && !sms.sent) {
            toast.warning(
              `Order marked ready, but SMS failed${sms.error ? `: ${sms.error}` : "."}`,
            );
          } else {
            toast.success("Order marked ready for pickup");
          }
        } else {
          toast.success("Order released successfully");
        }
        queryClient.invalidateQueries({
          queryKey: orpc.order.listRelease.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: orpc.order.listMonitoring.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: orpc.dashboard.summary.queryKey(),
        });
        setIsReleaseDialogOpen(false);
        setSelectedOrder(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update order status");
      },
    }),
  );

  const sortOrders = (list: Order[]) =>
    [...list].sort((a, b) => {
      if (sortKey === "pickupDate") {
        const timeA = Date.parse(a.pickupDate);
        const timeB = Date.parse(b.pickupDate);
        const aValue = Number.isNaN(timeA) ? 0 : timeA;
        const bValue = Number.isNaN(timeB) ? 0 : timeB;
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      const aValue = a[sortKey].toLowerCase();
      const bValue = b[sortKey].toLowerCase();
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });

  const processingOrders = sortOrders(orders.filter(
    (order) =>
      order.status === "Processing" &&
      (order.orderNumber.toLowerCase().includes(processingSearchQuery.toLowerCase()) ||
        order.name.toLowerCase().includes(processingSearchQuery.toLowerCase()) ||
        order.items.toLowerCase().includes(processingSearchQuery.toLowerCase()))
  ));

  const readyOrders = sortOrders(orders.filter(
    (order) =>
      order.status === "Ready" &&
      (order.orderNumber.toLowerCase().includes(readySearchQuery.toLowerCase()) ||
        order.name.toLowerCase().includes(readySearchQuery.toLowerCase()) ||
        order.items.toLowerCase().includes(readySearchQuery.toLowerCase()))
  ));

  const releasedOrders = sortOrders(orders.filter(
    (order) =>
      order.status === "Released" &&
      (order.orderNumber.toLowerCase().includes(releasedSearchQuery.toLowerCase()) ||
        order.name.toLowerCase().includes(releasedSearchQuery.toLowerCase()) ||
        order.items.toLowerCase().includes(releasedSearchQuery.toLowerCase()))
  ));

  const processingTotalPages = Math.ceil(processingOrders.length / processingItemsPerPage);
  const processingStartIndex = (processingCurrentPage - 1) * processingItemsPerPage;
  const processingEndIndex = processingStartIndex + processingItemsPerPage;
  const currentProcessingOrders = processingOrders.slice(
    processingStartIndex,
    processingEndIndex,
  );

  const readyTotalPages = Math.ceil(readyOrders.length / readyItemsPerPage);
  const readyStartIndex = (readyCurrentPage - 1) * readyItemsPerPage;
  const readyEndIndex = readyStartIndex + readyItemsPerPage;
  const currentReadyOrders = readyOrders.slice(readyStartIndex, readyEndIndex);

  const releasedTotalPages = Math.ceil(releasedOrders.length / releasedItemsPerPage);
  const releasedStartIndex = (releasedCurrentPage - 1) * releasedItemsPerPage;
  const releasedEndIndex = releasedStartIndex + releasedItemsPerPage;
  const currentReleasedOrders = releasedOrders.slice(
    releasedStartIndex,
    releasedEndIndex
  );

  const handleProcessingItemsPerPageChange = (value: string) => {
    setProcessingItemsPerPage(Number(value));
    setProcessingCurrentPage(1);
  };

  const handleReadyItemsPerPageChange = (value: string) => {
    setReadyItemsPerPage(Number(value));
    setReadyCurrentPage(1);
  };

  const handleReleasedItemsPerPageChange = (value: string) => {
    setReleasedItemsPerPage(Number(value));
    setReleasedCurrentPage(1);
  };

  const handleProcessingSearchChange = (value: string) => {
    setProcessingSearchQuery(value);
    setProcessingCurrentPage(1);
  };

  const handleReadySearchChange = (value: string) => {
    setReadySearchQuery(value);
    setReadyCurrentPage(1);
  };

  const handleReleasedSearchChange = (value: string) => {
    setReleasedSearchQuery(value);
    setReleasedCurrentPage(1);
  };

  const handleSort = (nextKey: string) => {
    const castKey = nextKey as OrderReleaseSortKey;
    if (castKey === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(castKey);
      setSortDirection("asc");
    }
    setProcessingCurrentPage(1);
    setReadyCurrentPage(1);
    setReleasedCurrentPage(1);
  };

  const handleMarkReadyClick = (order: Order) => {
    setSelectedOrder(order);
    setReleaseDialogMode("ready");
    setIsReleaseDialogOpen(true);
  };

  const handleReleaseClick = (order: Order) => {
    setSelectedOrder(order);
    setReleaseDialogMode("release");
    setIsReleaseDialogOpen(true);
  };

  const confirmRelease = () => {
    if (!selectedOrder) {
      return;
    }

    if (releaseDialogMode === "ready") {
      releaseOrderMutation.mutate({
        orderId: selectedOrder.id,
        stage: "PAID",
        releaseStatus: "READY",
        actorName: "Admin",
      });
      return;
    }

    releaseOrderMutation.mutate({
      orderId: selectedOrder.id,
      releaseStatus: "RELEASED",
      stage: "COMPLETED",
      actorName: "Admin",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Heading
          title="Order Release"
          description="Release orders that are ready for customer pickup"
        />
      </div>

      <div className="mt-10">
        <OrderReleaseSectionCard
          title="Processing Orders"
          description="Verified payments currently being processed by staff"
          status="Processing"
          orders={currentProcessingOrders}
          isLoading={isLoading}
          searchQuery={processingSearchQuery}
          currentPage={processingCurrentPage}
          totalPages={processingTotalPages}
          itemsPerPage={processingItemsPerPage}
          startIndex={processingStartIndex}
          endIndex={processingEndIndex}
          totalFilteredItems={processingOrders.length}
          onSearchChange={handleProcessingSearchChange}
          onPageChange={setProcessingCurrentPage}
          onItemsPerPageChange={handleProcessingItemsPerPageChange}
          onMarkReadyClick={handleMarkReadyClick}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      </div>

      <div className="mt-10">
        <OrderReleaseSectionCard
          title="Ready for Pickup"
          description="Orders prepared and awaiting customer pickup"
          status="Ready"
          orders={currentReadyOrders}
          isLoading={isLoading}
          searchQuery={readySearchQuery}
          currentPage={readyCurrentPage}
          totalPages={readyTotalPages}
          itemsPerPage={readyItemsPerPage}
          startIndex={readyStartIndex}
          endIndex={readyEndIndex}
          totalFilteredItems={readyOrders.length}
          onSearchChange={handleReadySearchChange}
          onPageChange={setReadyCurrentPage}
          onItemsPerPageChange={handleReadyItemsPerPageChange}
          onReleaseClick={handleReleaseClick}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      </div>

      <div className="mt-10">
        <OrderReleaseSectionCard
          title="Released Orders"
          description="Orders that have been released to customers"
          status="Released"
          orders={currentReleasedOrders}
          isLoading={isLoading}
          searchQuery={releasedSearchQuery}
          currentPage={releasedCurrentPage}
          totalPages={releasedTotalPages}
          itemsPerPage={releasedItemsPerPage}
          startIndex={releasedStartIndex}
          endIndex={releasedEndIndex}
          totalFilteredItems={releasedOrders.length}
          onSearchChange={handleReleasedSearchChange}
          onPageChange={setReleasedCurrentPage}
          onItemsPerPageChange={handleReleasedItemsPerPageChange}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      </div>

      <ReleaseOrderDialog
        isOpen={isReleaseDialogOpen}
        order={selectedOrder}
        mode={releaseDialogMode}
        onOpenChange={setIsReleaseDialogOpen}
        onConfirm={confirmRelease}
        isPending={releaseOrderMutation.isPending}
      />

      {isLoading && (
        <p className="mt-4 text-sm text-[#07484A]">Loading orders...</p>
      )}

      {isError && (
        <p className="mt-4 text-sm text-red-600">Unable to load orders right now.</p>
      )}
    </div>
  );
};

export default Page;
