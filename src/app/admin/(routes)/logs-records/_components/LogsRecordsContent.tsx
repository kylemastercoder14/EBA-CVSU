import { Card, CardContent } from "@/components/ui/card";
import { LogsFiltersCard } from "./LogsFiltersCard";
import { LogsRecordsPagination } from "./LogsRecordsPagination";
import { LogsRecordsTable } from "./LogsRecordsTable";
import { LogRecord } from "./types";
import { LogCategory, LogType } from "@/generated/prisma";
import { TablePrintButton } from "@/components/admin/TablePrintButton";

type TypeFilter = LogType | "all";
type CategoryFilter = LogCategory | "all";
type SortOption = "createdAt_desc" | "createdAt_asc" | "id_asc" | "description_asc";

interface LogsRecordsContentProps {
  logs: LogRecord[];
  isLoading?: boolean;
  searchQuery: string;
  typeFilter: TypeFilter;
  categoryFilter: CategoryFilter;
  sortBy: SortOption;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
  totalFilteredItems: number;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: string) => void;
}

export const LogsRecordsContent = ({
  logs,
  isLoading = false,
  searchQuery,
  typeFilter,
  categoryFilter,
  sortBy,
  currentPage,
  totalPages,
  itemsPerPage,
  startIndex,
  endIndex,
  totalFilteredItems,
  onSearchChange,
  onTypeFilterChange,
  onCategoryFilterChange,
  onSortChange,
  onPageChange,
  onItemsPerPageChange,
}: LogsRecordsContentProps) => {
  return (
    <>
      <LogsFiltersCard
        searchQuery={searchQuery}
        typeFilter={typeFilter}
        categoryFilter={categoryFilter}
        sortBy={sortBy}
        onSearchChange={onSearchChange}
        onTypeFilterChange={onTypeFilterChange}
        onCategoryFilterChange={onCategoryFilterChange}
        onSortChange={onSortChange}
      />

      <Card className="border-2 gap-0! border-[#07484A] bg-[#D3E9FF]">
        <CardContent className="p-0">
          <div className="flex justify-end px-4 pt-4">
            <TablePrintButton targetId="admin-logs-table" title="Logs and Records" />
          </div>
          <div id="admin-logs-table">
            <LogsRecordsTable logs={logs} isLoading={isLoading} />
          </div>
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
