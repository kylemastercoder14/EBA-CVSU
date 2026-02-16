import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

interface StockSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const StockSearchBar = ({ value, onChange }: StockSearchBarProps) => {
  return (
    <div className="relative">
      <Input
        placeholder="Search product name, ID, or category..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 bg-white border-none pl-10 text-base"
      />
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <SearchIcon className="size-5" />
      </div>
    </div>
  );
};
