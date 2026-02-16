import { Card, CardContent } from "@/components/ui/card";
import { LogsFiltersCard } from "./LogsFiltersCard";
import { LogsRecordsPagination } from "./LogsRecordsPagination";
import { LogsRecordsTable } from "./LogsRecordsTable";
import { LogRecord } from "./types";

interface LogsRecordsContentProps {
  logs: LogRecord[];
  searchQuery: string;
  typeFilter: string;
  categoryFilter: string;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
  totalFilteredItems: number;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: string) => void;
}

export const LogsRecordsContent = ({
  logs,
  searchQuery,
  typeFilter,
  categoryFilter,
  currentPage,
  totalPages,
  itemsPerPage,
  startIndex,
  endIndex,
  totalFilteredItems,
  onSearchChange,
  onTypeFilterChange,
  onCategoryFilterChange,
  onPageChange,
  onItemsPerPageChange,
}: LogsRecordsContentProps) => {
  return (
    <>
      <LogsFiltersCard
        searchQuery={searchQuery}
        typeFilter={typeFilter}
        categoryFilter={categoryFilter}
        onSearchChange={onSearchChange}
        onTypeFilterChange={onTypeFilterChange}
        onCategoryFilterChange={onCategoryFilterChange}
      />

      <Card className="border-2 gap-0! border-[#07484A] bg-[#D3E9FF]">
        <CardContent className="p-0">
          <LogsRecordsTable logs={logs} />
          <LogsRecordsPagination
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
    </>
  );
};
