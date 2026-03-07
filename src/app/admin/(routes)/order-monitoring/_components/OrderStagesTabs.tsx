import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  IconClipboardCheck,
  IconCreditCard,
  IconProgressCheck,
  IconX,
} from "@tabler/icons-react";
import { OrderTabContent } from "./OrderTabContent";
import { Order, OrderStage } from "./types";

interface OrderStagesTabsProps {
  activeTab: OrderStage;
  stageCounts: Record<OrderStage, number>;
  currentOrders: Order[];
  isLoading?: boolean;
  searchQuery: string;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
  totalFilteredItems: number;
  onTabChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: string) => void;
  onConfirmClick: (order: Order) => void;
  sortKey: "orderNum" | "name" | "pickupDate";
  sortDirection: "asc" | "desc";
  onSort: (sortKey: string) => void;
}

export const OrderStagesTabs = ({
  activeTab,
  stageCounts,
  currentOrders,
  isLoading = false,
  searchQuery,
  currentPage,
  totalPages,
  itemsPerPage,
  startIndex,
  endIndex,
  totalFilteredItems,
  onTabChange,
  onSearchChange,
  onPageChange,
  onItemsPerPageChange,
  onConfirmClick,
  sortKey,
  sortDirection,
  onSort,
}: OrderStagesTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full bg-[#E8E4DA] border-2 border-[#07484A] h-14! p-1 grid grid-cols-4">
        <TabsTrigger
          value="Pending"
          className="h-full data-[state=active]:bg-white data-[state=active]:text-[#07484A] font-semibold text-sm"
        >
          <IconClipboardCheck className="size-5" />
          <span className="lg:block hidden">Pending</span>
          <Badge className="bg-blue-500 hover:bg-blue-500 text-white text-xs">
            {stageCounts.Pending}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="To Pay"
          className="h-full data-[state=active]:bg-white data-[state=active]:text-[#07484A] font-semibold text-sm"
        >
          <IconCreditCard className="size-5" />
          <span className="lg:block hidden">To Pay</span>
          <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-xs">
            {stageCounts["To Pay"]}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="Processing"
          className="h-full data-[state=active]:bg-white data-[state=active]:text-[#07484A] font-semibold text-sm"
        >
          <IconProgressCheck className="size-5" />
          <span className="lg:block hidden">Processing</span>
          <Badge className="bg-purple-500 hover:bg-purple-500 text-white text-xs">
            {stageCounts.Processing}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="Cancelled"
          className="h-full data-[state=active]:bg-white data-[state=active]:text-[#07484A] font-semibold text-sm"
        >
          <IconX className="size-5" />
          <span className="lg:block hidden">Cancelled</span>
          <Badge className="bg-red-500 hover:bg-red-500 text-white text-xs">
            {stageCounts.Cancelled}
          </Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="Pending" className="mt-6">
        <OrderTabContent
          title="Order Confirmation"
          description="New orders awaiting admin confirmation"
          orders={currentOrders}
          stage="Pending"
          isLoading={isLoading}
          searchQuery={searchQuery}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          startIndex={startIndex}
          endIndex={endIndex}
          totalFilteredItems={totalFilteredItems}
          onSearchChange={onSearchChange}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
          onConfirmClick={onConfirmClick}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </TabsContent>

      <TabsContent value="To Pay" className="mt-6">
        <OrderTabContent
          title="Pending Payments"
          description="Orders waiting for payment confirmation"
          orders={currentOrders}
          stage="To Pay"
          isLoading={isLoading}
          searchQuery={searchQuery}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          startIndex={startIndex}
          endIndex={endIndex}
          totalFilteredItems={totalFilteredItems}
          onSearchChange={onSearchChange}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </TabsContent>

      <TabsContent value="Processing" className="mt-6">
        <OrderTabContent
          title="Processing Orders"
          description="Payments verified; staff are processing these orders"
          orders={currentOrders}
          stage="Processing"
          isLoading={isLoading}
          searchQuery={searchQuery}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          startIndex={startIndex}
          endIndex={endIndex}
          totalFilteredItems={totalFilteredItems}
          onSearchChange={onSearchChange}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </TabsContent>

      <TabsContent value="Cancelled" className="mt-6">
        <OrderTabContent
          title="Cancelled Orders"
          description="Orders cancelled after payment review decline"
          orders={currentOrders}
          stage="Cancelled"
          isLoading={isLoading}
          searchQuery={searchQuery}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          startIndex={startIndex}
          endIndex={endIndex}
          totalFilteredItems={totalFilteredItems}
          onSearchChange={onSearchChange}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </TabsContent>
    </Tabs>
  );
};
