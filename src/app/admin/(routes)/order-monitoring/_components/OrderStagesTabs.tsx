import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  IconClipboardCheck,
  IconCreditCard,
  IconCircleCheck,
  IconPackage,
} from "@tabler/icons-react";
import { OrderTabContent } from "./OrderTabContent";
import { Order, OrderStage } from "./types";

interface OrderStagesTabsProps {
  activeTab: OrderStage;
  stageCounts: Record<OrderStage, number>;
  currentOrders: Order[];
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
}

export const OrderStagesTabs = ({
  activeTab,
  stageCounts,
  currentOrders,
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
}: OrderStagesTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full bg-[#E8E4DA] border-2 border-[#07484A] h-14! p-1 grid grid-cols-4">
        <TabsTrigger
          value="To Confirm"
          className="h-full data-[state=active]:bg-white data-[state=active]:text-[#07484A] font-semibold text-sm"
        >
          <IconClipboardCheck className="size-5" />
          <span className="lg:block hidden">To Confirm</span>
          <Badge className="bg-blue-500 hover:bg-blue-500 text-white text-xs">
            {stageCounts["To Confirm"]}
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
          value="Paid"
          className="h-full data-[state=active]:bg-white data-[state=active]:text-[#07484A] font-semibold text-sm"
        >
          <IconCircleCheck className="size-5" />
          <span className="lg:block hidden">Paid</span>
          <Badge className="bg-purple-500 hover:bg-purple-500 text-white text-xs">
            {stageCounts["Paid"]}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="Completed"
          className="h-full data-[state=active]:bg-white data-[state=active]:text-[#07484A] font-semibold text-sm"
        >
          <IconPackage className="size-5" />
          <span className="lg:block hidden">Completed</span>
          <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs">
            {stageCounts["Completed"]}
          </Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="To Confirm" className="mt-6">
        <OrderTabContent
          title="Order Confirmation"
          description="Orders waiting for confirmation"
          orders={currentOrders}
          stage="To Confirm"
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
        />
      </TabsContent>

      <TabsContent value="To Pay" className="mt-6">
        <OrderTabContent
          title="Pending Payments"
          description="Orders waiting for payment confirmation"
          orders={currentOrders}
          stage="To Pay"
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
        />
      </TabsContent>

      <TabsContent value="Paid" className="mt-6">
        <OrderTabContent
          title="Paid Orders"
          description="Orders with verified payments ready for pickup"
          orders={currentOrders}
          stage="Paid"
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
        />
      </TabsContent>

      <TabsContent value="Completed" className="mt-6">
        <OrderTabContent
          title="Completed Orders"
          description="Successfully delivered orders"
          orders={currentOrders}
          stage="Completed"
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
        />
      </TabsContent>
    </Tabs>
  );
};
