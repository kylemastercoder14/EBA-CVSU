import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StaffPaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: string) => void;
}

export const StaffPagination = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  onItemsPerPageChange,
}: StaffPaginationProps) => {
  return (
    <div className="flex items-center justify-between px-4 py-4 border-t border-[#07484A]/20">
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#07484A]">Show</span>
        <Select value={itemsPerPage.toString()} onValueChange={onItemsPerPageChange}>
          <SelectTrigger className="w-17.5 bg-white border-[#07484A]/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-[#07484A]">items per page</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-[#07484A]">
          Showing {totalItems > 0 ? startIndex + 1 : 0} to{" "}
          {Math.min(endIndex, totalItems)} of {totalItems} items
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="bg-white border-[#07484A] text-[#07484A] hover:bg-[#07484A] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>

        <span className="text-sm text-[#07484A] font-medium px-2">
          Page {currentPage} of {totalPages || 1}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="bg-white border-[#07484A] text-[#07484A] hover:bg-[#07484A] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
