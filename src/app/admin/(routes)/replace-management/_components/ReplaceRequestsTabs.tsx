import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconChecks, IconClockHour4, IconX } from "@tabler/icons-react";
import { ReplaceTabContent } from "./ReplaceTabContent";
import { ReplaceRequest, ReplaceRequestStatus } from "./types";

interface ReplaceRequestsTabsProps {
  activeTab: ReplaceRequestStatus;
  statusCounts: Record<ReplaceRequestStatus, number>;
  currentRequests: ReplaceRequest[];
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
  onReviewClick: (request: ReplaceRequest) => void;
}

export const ReplaceRequestsTabs = ({
  activeTab,
  statusCounts,
  currentRequests,
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
  onReviewClick,
}: ReplaceRequestsTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full bg-[#E8E4DA] border-2 border-[#07484A] h-14! p-1 grid grid-cols-3">
        <TabsTrigger
          value="Pending"
          className="h-full data-[state=active]:bg-white data-[state=active]:text-[#07484A] font-semibold text-sm"
        >
          <IconClockHour4 className="size-5" />
          <span className="lg:block hidden">Pending</span>
          <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-xs">
            {statusCounts.Pending}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="Approved"
          className="h-full data-[state=active]:bg-white data-[state=active]:text-[#07484A] font-semibold text-sm"
        >
          <IconChecks className="size-5" />
          <span className="lg:block hidden">Approved</span>
          <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs">
            {statusCounts.Approved}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="Rejected"
          className="h-full data-[state=active]:bg-white data-[state=active]:text-[#07484A] font-semibold text-sm"
        >
          <IconX className="size-5" />
          <span className="lg:block hidden">Rejected</span>
          <Badge className="bg-red-600 hover:bg-red-600 text-white text-xs">
            {statusCounts.Rejected}
          </Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="Pending" className="mt-6">
        <ReplaceTabContent
          title="Pending Replace Requests"
          description="Review and process replacement requests from kiosk users"
          requests={currentRequests}
          status="Pending"
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
          onReviewClick={onReviewClick}
        />
      </TabsContent>

      <TabsContent value="Approved" className="mt-6">
        <ReplaceTabContent
          title="Approved Replace Requests"
          description="Requests approved by admin"
          requests={currentRequests}
          status="Approved"
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
          onReviewClick={onReviewClick}
        />
      </TabsContent>

      <TabsContent value="Rejected" className="mt-6">
        <ReplaceTabContent
          title="Rejected Replace Requests"
          description="Requests rejected by admin"
          requests={currentRequests}
          status="Rejected"
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
          onReviewClick={onReviewClick}
        />
      </TabsContent>
    </Tabs>
  );
};
