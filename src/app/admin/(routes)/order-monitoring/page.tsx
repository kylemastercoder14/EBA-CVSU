"use client";

import { Heading } from "@/components/Heading";
import { useMemo, useState } from "react";
import { OrderStagesTabs } from "./_components/OrderStagesTabs";
import { ConfirmOrderDialog } from "./_components/ConfirmOrderDialog";
import { Order, OrderStage } from "./_components/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";

type OrderSortKey = "orderNum" | "name" | "pickupDate";
type SortDirection = "asc" | "desc";

const Page = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [activeTab, setActiveTab] = useState<OrderStage>("Pending");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sortKey, setSortKey] = useState<OrderSortKey>("orderNum");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const { data, isLoading, isError } = useQuery(orpc.order.listMonitoring.queryOptions());
  const orders = useMemo(() => data?.orders ?? [], [data?.orders]);

  const confirmOrderMutation = useMutation(
    orpc.order.updateStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Order moved to payment stage");
        queryClient.invalidateQueries({
          queryKey: orpc.order.listMonitoring.queryKey(),
        });
        setIsConfirmDialogOpen(false);
        setSelectedOrder(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to confirm order");
      },
    }),
  );

  // Filter orders by stage and search query
  const filteredOrders = orders.filter((order) => {
    const matchesTab = order.stage === activeTab;
    const matchesSearch =
      order.orderNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
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

  // Calculate pagination
  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = sortedOrders.slice(startIndex, endIndex);

  // Count orders per stage
  const stageCounts: Record<OrderStage, number> = {
    Pending: orders.filter((o) => o.stage === "Pending").length,
    "To Pay": orders.filter((o) => o.stage === "To Pay").length,
    Processing: orders.filter((o) => o.stage === "Processing").length,
    Cancelled: orders.filter((o) => o.stage === "Cancelled").length,
  };

  // Reset to page 1 when items per page changes
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Reset to page 1 when search query changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Reset to page 1 when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value as OrderStage);
    setCurrentPage(1);
    setSearchQuery(""); // Reset search when changing tabs
  };

  const handleSort = (nextKey: string) => {
    const castKey = nextKey as OrderSortKey;
    if (castKey === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(castKey);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleConfirmClick = (order: Order) => {
    setSelectedOrder(order);
    setIsConfirmDialogOpen(true);
  };

  const confirmOrder = () => {
    if (!selectedOrder) {
      return;
    }

    confirmOrderMutation.mutate({
      orderId: selectedOrder.id,
      stage: "TO_PAY",
      actorName: "Admin",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Heading
          title="Order Monitoring"
          description="Track and manage orders through different stages"
        />
      </div>

      <div className="mt-10">
        <OrderStagesTabs
          activeTab={activeTab}
          stageCounts={stageCounts}
          currentOrders={currentOrders}
          isLoading={isLoading}
          searchQuery={searchQuery}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          startIndex={startIndex}
          endIndex={endIndex}
          totalFilteredItems={filteredOrders.length}
          onTabChange={handleTabChange}
          onSearchChange={handleSearchChange}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={handleItemsPerPageChange}
          onConfirmClick={handleConfirmClick}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      </div>

      <ConfirmOrderDialog
        isOpen={isConfirmDialogOpen}
        order={selectedOrder}
        onOpenChange={setIsConfirmDialogOpen}
        onConfirm={confirmOrder}
        isPending={confirmOrderMutation.isPending}
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
