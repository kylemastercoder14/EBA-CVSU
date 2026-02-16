import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar = ({ value, onChange }: SearchBarProps) => {
  return (
    <div className="relative">
      <Input
        placeholder="Search product name..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 bg-white border-none pl-10 text-base"
      />
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <SearchIcon className='size-5' />
      </div>
    </div>
  );
};
