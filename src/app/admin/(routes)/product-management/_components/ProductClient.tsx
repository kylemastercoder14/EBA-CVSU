"use client";

import { Heading } from "@/components/Heading";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProductTable } from "./ProductTable";
import { ProductPagination } from "./ProductPagination";
import { ProductDialog } from "./ProductDialog";
import { SearchBar } from "./SearchBar";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { Product } from "./types";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TablePrintButton } from "@/components/admin/TablePrintButton";

type ProductSortOption = "name_asc" | "name_desc" | "id_asc" | "category_asc";

export const ProductClient = () => {
  const queryClient = useQueryClient();
  const {
    data: { products: rawProducts },
  } = useSuspenseQuery(orpc.product.list.queryOptions());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "update">("create");
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [productToDelete, setProductToDelete] = useState<Product | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<ProductSortOption>("name_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Memoize products to prevent dependency changes on every render
  const products = useMemo(() => rawProducts, [rawProducts]);

  // Filter products based on search query
  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [products, searchQuery],
  );

  const sortedProducts = useMemo(
    () =>
      [...filteredProducts].sort((a, b) => {
        switch (sortBy) {
          case "name_desc":
            return b.name.localeCompare(a.name);
          case "id_asc":
            return a.id.localeCompare(b.id);
          case "category_asc":
            return a.category.localeCompare(b.category);
          case "name_asc":
          default:
            return a.name.localeCompare(b.name);
        }
      }),
    [filteredProducts, sortBy],
  );

  // Calculate pagination
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = useMemo(
    () => sortedProducts.slice(startIndex, endIndex),
    [sortedProducts, startIndex, endIndex],
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
    setSortBy(value as ProductSortOption);
    setCurrentPage(1);
  };

  const handleAddProduct = () => {
    setDialogMode("create");
    setSelectedProduct(undefined);
    setIsDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setDialogMode("update");
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const deleteProductMutation = useMutation(
    orpc.product.delete.mutationOptions({
      onSuccess: (result) => {
        toast.success(result.message || "Product deleted successfully");
        queryClient.invalidateQueries({
          queryKey: orpc.product.list.queryKey(),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete product. Please try again");
      },
    }),
  );

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
  };

  const handleConfirmDelete = () => {
    if (!productToDelete) {
      return;
    }

    deleteProductMutation.mutate({
      id: productToDelete.id,
    });
  };

  return (
    <div>
      <div className="flex items-center flex-wrap gap-5 justify-between">
        <Heading
          title="Product Management"
          description="Manage your product inventory and details"
        />
        <Button
          size="lg"
          className="bg-[#07484A] hover:bg-[#07484A]/90"
          onClick={handleAddProduct}
        >
          <PlusIcon className="size-4.5" />
          Add Product
        </Button>
      </div>

      <div className="mt-10">
        <Card className="border-2 gap-0! border-[#07484A] bg-[#D3E9FF]">
          <CardHeader className="pb-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
              <SearchBar value={searchQuery} onChange={handleSearchChange} />
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="h-12! w-full bg-white border-none">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                  <SelectItem value="id_asc">ID (A-Z)</SelectItem>
                  <SelectItem value="category_asc">Category (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 flex justify-end">
              <TablePrintButton
                targetId="admin-product-table-print-all"
                title="Product Management"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div id="admin-product-table">
              <ProductTable
                products={currentProducts}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
              />
            </div>
            <ProductPagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredProducts.length}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
            <div id="admin-product-table-print-all" className="hidden">
              <ProductTable
                products={sortedProducts}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <ProductDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        product={selectedProduct}
      />

      <AlertDialog
        open={Boolean(productToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setProductToDelete(undefined);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              {`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProductMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteProductMutation.isPending}
            >
              {deleteProductMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
