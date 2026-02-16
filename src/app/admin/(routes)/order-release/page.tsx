"use client";

import { Heading } from "@/components/Heading";
import { useState } from "react";
import { OrderReleaseSectionCard } from "./_components/OrderReleaseSectionCard";
import { initialOrders } from "./_components/orders";
import { ReleaseOrderDialog } from "./_components/ReleaseOrderDialog";
import { Order } from "./_components/types";

const Page = () => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [readySearchQuery, setReadySearchQuery] = useState("");
  const [releasedSearchQuery, setReleasedSearchQuery] = useState("");
  const [readyCurrentPage, setReadyCurrentPage] = useState(1);
  const [releasedCurrentPage, setReleasedCurrentPage] = useState(1);
  const [readyItemsPerPage, setReadyItemsPerPage] = useState(5);
  const [releasedItemsPerPage, setReleasedItemsPerPage] = useState(5);
  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const readyOrders = orders.filter(
    (order) =>
      order.status === "Ready" &&
      (order.orderNumber.toLowerCase().includes(readySearchQuery.toLowerCase()) ||
        order.name.toLowerCase().includes(readySearchQuery.toLowerCase()) ||
        order.items.toLowerCase().includes(readySearchQuery.toLowerCase()))
  );

  const releasedOrders = orders.filter(
    (order) =>
      order.status === "Released" &&
      (order.orderNumber.toLowerCase().includes(releasedSearchQuery.toLowerCase()) ||
        order.name.toLowerCase().includes(releasedSearchQuery.toLowerCase()) ||
        order.items.toLowerCase().includes(releasedSearchQuery.toLowerCase()))
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

  const handleReadyItemsPerPageChange = (value: string) => {
    setReadyItemsPerPage(Number(value));
    setReadyCurrentPage(1);
  };

  const handleReleasedItemsPerPageChange = (value: string) => {
    setReleasedItemsPerPage(Number(value));
    setReleasedCurrentPage(1);
  };

  const handleReadySearchChange = (value: string) => {
    setReadySearchQuery(value);
    setReadyCurrentPage(1);
  };

  const handleReleasedSearchChange = (value: string) => {
    setReleasedSearchQuery(value);
    setReleasedCurrentPage(1);
  };

  const handleReleaseClick = (order: Order) => {
    setSelectedOrder(order);
    setIsReleaseDialogOpen(true);
  };

  const confirmRelease = () => {
    if (selectedOrder) {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === selectedOrder.id ? { ...order, status: "Released" } : order
        )
      );
    }
    setIsReleaseDialogOpen(false);
    setSelectedOrder(null);
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
          title="Ready for Pickup"
          description="Orders prepared and awaiting customer pickup"
          status="Ready"
          orders={currentReadyOrders}
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
        />
      </div>

      <div className="mt-10">
        <OrderReleaseSectionCard
          title="Released Orders"
          description="Orders that have been released to customers"
          status="Released"
          orders={currentReleasedOrders}
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
        />
      </div>

      <ReleaseOrderDialog
        isOpen={isReleaseDialogOpen}
        order={selectedOrder}
        onOpenChange={setIsReleaseDialogOpen}
        onConfirm={confirmRelease}
      />
    </div>
  );
};

export default Page;
