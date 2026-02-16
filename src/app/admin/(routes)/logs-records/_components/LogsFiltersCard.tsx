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
import { SearchIcon } from "lucide-react";

interface LogsFiltersCardProps {
  searchQuery: string;
  typeFilter: string;
  categoryFilter: string;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
}

export const LogsFiltersCard = ({
  searchQuery,
  typeFilter,
  categoryFilter,
  onSearchChange,
  onTypeFilterChange,
  onCategoryFilterChange,
}: LogsFiltersCardProps) => {
  return (
    <Card className="border-2 py-0! border-[#07484A] bg-[#B8D4D4] mb-6">
      <CardContent className="p-6">
        <div className="grid grid-cols-3 gap-6">
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
                <SelectItem value="Order">Order</SelectItem>
                <SelectItem value="Payment">Payment</SelectItem>
                <SelectItem value="Activity">Activity</SelectItem>
                <SelectItem value="System">System</SelectItem>
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
                <SelectItem value="Order Created">Order Created</SelectItem>
                <SelectItem value="Payment Verified">Payment Verified</SelectItem>
                <SelectItem value="Stock Updated">Stock Updated</SelectItem>
                <SelectItem value="Low Stock Alert">Low Stock Alert</SelectItem>
                <SelectItem value="Order Released">Order Released</SelectItem>
                <SelectItem value="Payment Pending">Payment Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
