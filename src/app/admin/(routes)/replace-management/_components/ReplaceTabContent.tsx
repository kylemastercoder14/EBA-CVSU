import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReplacePagination } from "./ReplacePagination";
import { ReplaceSearchBar } from "./ReplaceSearchBar";
import { ReplaceTable } from "./ReplaceTable";
import { ReplaceRequest, ReplaceRequestStatus } from "./types";

interface ReplaceTabContentProps {
  title: string;
  description: string;
  requests: ReplaceRequest[];
  status: ReplaceRequestStatus;
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
  onReviewClick: (request: ReplaceRequest) => void;
}

export const ReplaceTabContent = ({
  title,
  description,
  requests,
  status,
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
  onReviewClick,
}: ReplaceTabContentProps) => {
  return (
    <Card className="border-2 gap-0! border-[#07484A] bg-[#D3E9FF]">
      <CardHeader className="border-b-2 pb-4 border-[#07484A]">
        <CardTitle className="text-[#07484A] text-xl">{title}</CardTitle>
        <CardDescription className="text-[#07484A]/70">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ReplaceSearchBar value={searchQuery} onChange={onSearchChange} />
        <ReplaceTable
          requests={requests}
          status={status}
          isLoading={isLoading}
          onReviewClick={onReviewClick}
        />
        <ReplacePagination
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
