import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReplacePagination } from "./ReplacePagination";
import { ReplaceSearchBar } from "./ReplaceSearchBar";
import { ReplaceTable } from "./ReplaceTable";
import { ReplaceRequest, ReplaceRequestStatus } from "./types";
import { TablePrintButton } from "@/components/admin/TablePrintButton";

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
  const tableId = `admin-replace-${status.toLowerCase()}`;

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
        <ReplaceSearchBar value={searchQuery} onChange={onSearchChange} />
        <div id={tableId}>
          <ReplaceTable
            requests={requests}
            status={status}
            isLoading={isLoading}
            onReviewClick={onReviewClick}
          />
        </div>
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
