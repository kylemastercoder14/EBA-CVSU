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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StockSortOption = "product_asc" | "id_asc" | "stock_desc" | "stock_asc";

export const StockClient = () => {
  const queryClient = useQueryClient();
  const {
    data: { stocks },
  } = useSuspenseQuery(orpc.stock.list.queryOptions());
  const [stockData, setStockData] = useState<StockItem[]>(stocks);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<StockSortOption>("product_asc");
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

  const sortedStockData = [...filteredStockData].sort((a, b) => {
    switch (sortBy) {
      case "id_asc":
        return a.productId.localeCompare(b.productId);
      case "stock_desc":
        return b.currentStock - a.currentStock;
      case "stock_asc":
        return a.currentStock - b.currentStock;
      case "product_asc":
      default:
        return a.productName.localeCompare(b.productName);
    }
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedStockData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStockData = sortedStockData.slice(startIndex, endIndex);

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

  const handleSortChange = (value: string) => {
    setSortBy(value as StockSortOption);
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
            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
              <StockSearchBar value={searchQuery} onChange={handleSearchChange} />
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="h-12! w-full bg-white border-none">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product_asc">Product (A-Z)</SelectItem>
                  <SelectItem value="id_asc">Product ID (A-Z)</SelectItem>
                  <SelectItem value="stock_desc">Stock (High-Low)</SelectItem>
                  <SelectItem value="stock_asc">Stock (Low-High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
