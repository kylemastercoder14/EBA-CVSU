import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

interface ReplaceSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const ReplaceSearchBar = ({ value, onChange }: ReplaceSearchBarProps) => {
  return (
    <div className="p-4">
      <div className="relative">
        <Input
          placeholder="Search by request ID, order number, or reason..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 bg-white border-none pl-10 text-base"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <SearchIcon className="size-5" />
        </div>
      </div>
    </div>
  );
};
