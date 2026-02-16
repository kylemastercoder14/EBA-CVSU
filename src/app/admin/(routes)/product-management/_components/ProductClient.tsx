"use client";

import { Heading } from "@/components/Heading";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProductTable } from "./ProductTable";
import { ProductPagination } from "./ProductPagination";
import { ProductDialog } from "./ProductDialog";
import { SearchBar } from "./SearchBar";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

export const ProductClient = () => {
  const {
    data: { products },
  } = useSuspenseQuery(orpc.product.list.queryOptions());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Filter products based on search query
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

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

  return (
    <div>
      <div className="flex items-center justify-between">
        <Heading
          title="Product Management"
          description="Manage your product inventory and details"
        />
        <Button
          size="lg"
          className="bg-[#07484A] hover:bg-[#07484A]/90"
          onClick={() => setIsDialogOpen(true)}
        >
          <PlusIcon className="size-4.5" />
          Add Product
        </Button>
      </div>

      <div className="mt-10">
        <Card className="border-2 gap-0! border-[#07484A] bg-[#D3E9FF]">
          <CardHeader className="pb-4">
            <SearchBar value={searchQuery} onChange={handleSearchChange} />
          </CardHeader>
          <CardContent className="p-0">
            <ProductTable products={currentProducts} />
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
          </CardContent>
        </Card>
      </div>

      <ProductDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
};
