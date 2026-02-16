import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

interface PaymentSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const PaymentSearchBar = ({
  value,
  onChange,
  placeholder = "Search by order number, name, or reference..."
}: PaymentSearchBarProps) => {
  return (
    <div className="p-4">
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 bg-white border-none pl-10 text-base"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <SearchIcon className="size-5" />
        </div>
      </div>
    </div>
  );
};
