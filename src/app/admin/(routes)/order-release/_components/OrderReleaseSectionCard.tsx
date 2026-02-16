import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrderReleasePagination } from "./OrderReleasePagination";
import { OrderReleaseSearchBar } from "./OrderReleaseSearchBar";
import { OrderReleaseTable } from "./OrderReleaseTable";
import { Order, OrderStatus } from "./types";

interface OrderReleaseSectionCardProps {
  title: string;
  description: string;
  status: OrderStatus;
  orders: Order[];
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
  onReleaseClick?: (order: Order) => void;
}

export const OrderReleaseSectionCard = ({
  title,
  description,
  status,
  orders,
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
  onReleaseClick,
}: OrderReleaseSectionCardProps) => {
  return (
    <Card className="border-2 gap-0! border-[#07484A] bg-[#D3E9FF]">
      <CardHeader className="pb-4">
        <CardTitle className="text-[#07484A] text-xl">{title}</CardTitle>
        <CardDescription className="text-[#07484A]/70">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <OrderReleaseSearchBar value={searchQuery} onChange={onSearchChange} />
        <OrderReleaseTable orders={orders} status={status} onReleaseClick={onReleaseClick} />
        <OrderReleasePagination
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
