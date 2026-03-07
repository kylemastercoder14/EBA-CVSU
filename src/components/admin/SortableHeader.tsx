import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SortDirection = "asc" | "desc";

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  activeSortKey: string;
  direction: SortDirection;
  onSort: (sortKey: string) => void;
  className?: string;
}

export const SortableHeader = ({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
  className,
}: SortableHeaderProps) => {
  const isActive = activeSortKey === sortKey;

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onSort(sortKey)}
      className={cn(
        "h-auto px-0 py-0 text-white hover:bg-transparent hover:text-white",
        className,
      )}
    >
      <span>{label}</span>
      {isActive ? (
        direction === "asc" ? (
          <ArrowUp className="ml-1.5 size-4" />
        ) : (
          <ArrowDown className="ml-1.5 size-4" />
        )
      ) : (
        <ArrowUpDown className="ml-1.5 size-4 opacity-80" />
      )}
    </Button>
  );
};
