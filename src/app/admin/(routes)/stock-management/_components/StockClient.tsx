"use client";

import { Heading } from "@/components/Heading";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LowStockAlert } from "./LowStockAlert";
import { StockTable } from "./StockTable";
import { StockPagination } from "./StockPagination";
import { EditStockDialog } from "./EditStockDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { StockSearchBar } from "./StockSearchBar";
import { StockItem } from "./types";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";

export const StockClient = () => {
  const queryClient = useQueryClient();
  const {
    data: { stocks },
  } = useSuspenseQuery(orpc.stock.list.queryOptions());
  const [stockData, setStockData] = useState<StockItem[]>(stocks);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    minStock: 0,
    maxStock: 0,
    currentStock: 0,
  });

  const updateStockMutation = useMutation(
    orpc.stock.update.mutationOptions({
      onSuccess: (updatedItem) => {
        setStockData((prev) =>
          prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
        );
        queryClient.invalidateQueries({
          queryKey: orpc.stock.list.queryKey(),
        });
        toast.success(`Stock updated for "${updatedItem.productName}"`);
        setIsEditDialogOpen(false);
        setEditingItem(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update stock. Please try again");
      },
    }),
  );

  // Filter stock data based on search query
  const filteredStockData = stockData.filter(
    (item) =>
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.productId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredStockData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStockData = filteredStockData.slice(startIndex, endIndex);

  // Calculate low stock alerts
  const lowStockItems = stockData.filter(
    (item) => item.status === "CRITICAL" || item.status === "LOW",
  );
  const criticalItems = stockData.filter((item) => item.status === "CRITICAL");

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

  const handleEdit = (item: StockItem) => {
    setEditingItem(item);
    setEditValues({
      minStock: item.minStock,
      maxStock: item.maxStock,
      currentStock: item.currentStock,
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingItem) return;

    updateStockMutation.mutate({
      id: editingItem.id,
      minStock: editValues.minStock,
      maxStock: editValues.maxStock,
      currentStock: editValues.currentStock,
    });
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      setStockData((prev) => prev.filter((item) => item.id !== itemToDelete));
    }
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const updateEditValue = (
    field: "minStock" | "maxStock" | "currentStock",
    value: number,
  ) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Heading
          title="Stock Management"
          description="Monitor and update inventory levels"
        />
      </div>

      <LowStockAlert
        criticalItems={criticalItems}
        totalLowStock={lowStockItems.length}
      />

      <div className="mt-6">
        <Card className="border-2 gap-0! border-[#07484A] bg-[#D3E9FF]">
          <CardHeader className="pb-4">
            <StockSearchBar value={searchQuery} onChange={handleSearchChange} />
          </CardHeader>
          <CardContent className="p-0">
            <StockTable
              stockData={currentStockData}
              onEdit={handleEdit}
            />
            <StockPagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredStockData.length}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </CardContent>
        </Card>
      </div>

      <EditStockDialog
        isOpen={isEditDialogOpen}
        editingItem={editingItem}
		isPending={updateStockMutation.isPending}
        editValues={editValues}
        onOpenChange={setIsEditDialogOpen}
        onUpdateValue={updateEditValue}
        onSave={handleSave}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
