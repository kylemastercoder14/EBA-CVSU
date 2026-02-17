"use client";

import { Heading } from "@/components/Heading";
import { useMemo, useState } from "react";
import { OrderStagesTabs } from "./_components/OrderStagesTabs";
import { ConfirmOrderDialog } from "./_components/ConfirmOrderDialog";
import { Order, OrderStage } from "./_components/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";

const Page = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [activeTab, setActiveTab] = useState<OrderStage>("To Confirm");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data, isLoading, isError } = useQuery(orpc.order.listMonitoring.queryOptions());
  const orders = useMemo(() => data?.orders ?? [], [data?.orders]);

  const confirmOrderMutation = useMutation(
    orpc.order.updateStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Order confirmed successfully");
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

  // Calculate pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  // Count orders per stage
  const stageCounts: Record<OrderStage, number> = {
    "To Confirm": orders.filter((o) => o.stage === "To Confirm").length,
    "To Pay": orders.filter((o) => o.stage === "To Pay").length,
    "Paid": orders.filter((o) => o.stage === "Paid").length,
    "Completed": orders.filter((o) => o.stage === "Completed").length,
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
