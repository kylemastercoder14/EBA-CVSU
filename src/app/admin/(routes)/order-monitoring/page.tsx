"use client";

import { Heading } from "@/components/Heading";
import { useState } from "react";
import { OrderStagesTabs } from "./_components/OrderStagesTabs";
import { ConfirmOrderDialog } from "./_components/ConfirmOrderDialog";
import { initialOrders } from "./_components/orders";
import { Order, OrderStage } from "./_components/types";

const Page = () => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [activeTab, setActiveTab] = useState<OrderStage>("To Confirm");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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
    if (selectedOrder) {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === selectedOrder.id ? { ...order, stage: "To Pay" } : order
        )
      );
    }
    setIsConfirmDialogOpen(false);
    setSelectedOrder(null);
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
      />
    </div>
  );
};

export default Page;
