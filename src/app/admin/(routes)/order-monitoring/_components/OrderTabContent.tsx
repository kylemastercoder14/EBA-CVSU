import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OrderSearchBar } from "./OrderSearchBar";
import { OrderTable } from "./OrderTable";
import { OrderPagination } from "./OrderPagination";
import { Order, OrderStage } from "./types";
import { TablePrintButton } from "@/components/admin/TablePrintButton";

interface OrderTabContentProps {
  title: string;
  description: string;
  orders: Order[];
  stage: OrderStage;
  isLoading?: boolean;
  searchQuery: string;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
  totalFilteredItems: number;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: string) => void;
  onConfirmClick?: (order: Order) => void;
  sortKey: "orderNum" | "name" | "pickupDate";
  sortDirection: "asc" | "desc";
  onSort: (sortKey: string) => void;
}

export const OrderTabContent = ({
  title,
  description,
  orders,
  stage,
  isLoading = false,
  searchQuery,
  currentPage,
  totalPages,
  itemsPerPage,
  startIndex,
  endIndex,
  totalFilteredItems,
  onSearchChange,
  onPageChange,
  onItemsPerPageChange,
  onConfirmClick,
  sortKey,
  sortDirection,
  onSort,
}: OrderTabContentProps) => {
  const tableId = `admin-order-monitoring-${stage.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <Card className="border-2 gap-0! border-[#07484A] bg-[#D3E9FF]">
      <CardHeader className="border-b-2 pb-4 border-[#07484A]">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-[#07484A] text-xl">{title}</CardTitle>
          <TablePrintButton targetId={tableId} title={title} />
        </div>
        <CardDescription className="text-[#07484A]/70">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <OrderSearchBar value={searchQuery} onChange={onSearchChange} />
        <div id={tableId}>
          <OrderTable
            orders={orders}
            stage={stage}
            isLoading={isLoading}
            onConfirmClick={onConfirmClick}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        </div>
        <OrderPagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={totalFilteredItems}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      </CardContent>
    </Card>
  );
};
