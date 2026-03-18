"use client";

import { Heading } from "@/components/Heading";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LowStockAlert } from "./LowStockAlert";
import { StockTable } from "./StockTable";
import { StockPagination } from "./StockPagination";
import { EditStockDialog } from "./EditStockDialog";
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
import { TablePrintButton } from "@/components/admin/TablePrintButton";

type StockSortOption =
  | "product_asc"
  | "product_desc"
  | "id_asc"
  | "id_desc"
  | "stock_desc"
  | "stock_asc";

export const StockClient = () => {
  const queryClient = useQueryClient();
  const {
    data: { stocks },
  } = useSuspenseQuery(orpc.stock.list.queryOptions());
  const [stockRows, setStockRows] = useState(stocks);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<StockSortOption>("product_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [editValues, setEditValues] = useState<
    Array<{
      id: string;
      variant: string | null;
      minStock: number;
      maxStock: number;
      currentStock: number;
    }>
  >([]);

  const groupedStockData = stockRows.reduce<Record<string, StockItem>>((acc, row) => {
    if (!acc[row.productId]) {
      acc[row.productId] = {
        productId: row.productId,
        productName: row.productName,
        category: row.category,
        variants: [],
        minStock: 0,
        maxStock: 0,
        currentStock: 0,
        status: "NORMAL",
      };
    }

    const group = acc[row.productId];
    group.variants.push({
      id: row.id,
      variant: row.variant,
      minStock: row.minStock,
      maxStock: row.maxStock,
      currentStock: row.currentStock,
      status: row.status,
    });
    group.minStock += row.minStock;
    group.maxStock += row.maxStock;
    group.currentStock += row.currentStock;
    if (row.status === "CRITICAL") {
      group.status = "CRITICAL";
    } else if (row.status === "LOW" && group.status !== "CRITICAL") {
      group.status = "LOW";
    }

    return acc;
  }, {});

  const stockData = Object.values(groupedStockData);

  const updateStockMutation = useMutation(
    orpc.stock.updateByProduct.mutationOptions({
      onSuccess: (result) => {
        setStockRows((prev) =>
          prev.map((item) => {
            const updated = result.stocks.find((updatedRow) => updatedRow.id === item.id);
            return updated ?? item;
          }),
        );
        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.stock.list.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.order.listPreOrders.queryKey(),
          }),
        ]);
        toast.success("Product stock updated successfully");
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
      item.variants.some((variant) =>
        (variant.variant ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
      ) ||
      item.productId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const sortedStockData = [...filteredStockData].sort((a, b) => {
    switch (sortBy) {
      case "id_asc":
        return a.productId.localeCompare(b.productId);
      case "id_desc":
        return b.productId.localeCompare(a.productId);
      case "stock_desc":
        return b.currentStock - a.currentStock;
      case "stock_asc":
        return a.currentStock - b.currentStock;
      case "product_desc":
        return b.productName.localeCompare(a.productName);
      case "product_asc":
      default:
        return `${a.productName}-${a.productId}`.localeCompare(
          `${b.productName}-${b.productId}`,
        );
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

  const handleHeaderSort = (key: string) => {
    if (key === "product") {
      setSortBy((prev) => (prev === "product_asc" ? "product_desc" : "product_asc"));
    } else if (key === "id") {
      setSortBy((prev) => (prev === "id_asc" ? "id_desc" : "id_asc"));
    } else if (key === "stock") {
      setSortBy((prev) => (prev === "stock_asc" ? "stock_desc" : "stock_asc"));
    }
    setCurrentPage(1);
  };

  const handleEdit = (item: StockItem) => {
    setEditingItem(item);
    setEditValues(
      item.variants.map((variant) => ({
        id: variant.id,
        variant: variant.variant,
        minStock: variant.minStock,
        maxStock: variant.maxStock,
        currentStock: variant.currentStock,
      })),
    );
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingItem) return;

    updateStockMutation.mutate({
      productId: editingItem.productId,
      items: editValues.map((variant) => ({
        id: variant.id,
        minStock: variant.minStock,
        maxStock: variant.maxStock,
        currentStock: variant.currentStock,
      })),
    });
  };

  const updateEditValue = (
    id: string,
    field: "minStock" | "maxStock" | "currentStock",
    value: number,
  ) => {
    setEditValues((prev) =>
      prev.map((variant) =>
        variant.id === id ? { ...variant, [field]: value } : variant,
      ),
    );
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
        lowStockItems={lowStockItems}
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
                  <SelectItem value="product_desc">Product (Z-A)</SelectItem>
                  <SelectItem value="id_asc">Product ID (A-Z)</SelectItem>
                  <SelectItem value="id_desc">Product ID (Z-A)</SelectItem>
                  <SelectItem value="stock_desc">Stock (High-Low)</SelectItem>
                  <SelectItem value="stock_asc">Stock (Low-High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 flex justify-end">
              <TablePrintButton targetId="admin-stock-table" title="Stock Management" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div id="admin-stock-table">
              <StockTable
                stockData={currentStockData}
                onEdit={handleEdit}
                sortKey={sortBy}
                onSort={handleHeaderSort}
              />
            </div>
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
    </div>
  );
};
