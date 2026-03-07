import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogCategory, LogType } from "@/generated/prisma";
import { SearchIcon } from "lucide-react";

type TypeFilter = LogType | "all";
type CategoryFilter = LogCategory | "all";
type SortOption =
  | "createdAt_desc"
  | "createdAt_asc"
  | "id_asc"
  | "id_desc"
  | "description_asc"
  | "description_desc";

interface LogsFiltersCardProps {
  searchQuery: string;
  typeFilter: TypeFilter;
  categoryFilter: CategoryFilter;
  sortBy: SortOption;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onSortChange: (value: string) => void;
}

export const LogsFiltersCard = ({
  searchQuery,
  typeFilter,
  categoryFilter,
  sortBy,
  onSearchChange,
  onTypeFilterChange,
  onCategoryFilterChange,
  onSortChange,
}: LogsFiltersCardProps) => {
  return (
    <Card className="border-2 py-0! border-[#07484A] bg-[#B8D4D4] mb-6">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-[#07484A]">Search Logs</Label>
            <div className="relative">
              <Input
                placeholder="Search description or user..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-10 bg-white border-none pl-10 text-base"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon className="size-4" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium text-[#07484A]">Log Type</Label>
            <Select value={typeFilter} onValueChange={onTypeFilterChange}>
              <SelectTrigger className="bg-white border-none w-full h-10!">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="ORDER">Order</SelectItem>
                <SelectItem value="PAYMENT">Payment</SelectItem>
                <SelectItem value="ACTIVITY">Activity</SelectItem>
                <SelectItem value="SYSTEM">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium text-[#07484A]">Category</Label>
            <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
              <SelectTrigger className="bg-white border-none w-full h-10!">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="ORDER_CREATED">Order Created</SelectItem>
                <SelectItem value="PAYMENT_VERIFIED">Payment Verified</SelectItem>
                <SelectItem value="STOCK_UPDATED">Stock Updated</SelectItem>
                <SelectItem value="LOW_STOCK_ALERT">Low Stock Alert</SelectItem>
                <SelectItem value="ORDER_RELEASED">Order Released</SelectItem>
                <SelectItem value="PAYMENT_PENDING">Payment Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium text-[#07484A]">Sort By</Label>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="bg-white border-none w-full h-10!">
                <SelectValue placeholder="Sort logs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt_desc">Newest First</SelectItem>
                <SelectItem value="createdAt_asc">Oldest First</SelectItem>
                <SelectItem value="id_asc">ID (A-Z)</SelectItem>
                <SelectItem value="id_desc">ID (Z-A)</SelectItem>
                <SelectItem value="description_asc">
                  Description (A-Z)
                </SelectItem>
                <SelectItem value="description_desc">
                  Description (Z-A)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
