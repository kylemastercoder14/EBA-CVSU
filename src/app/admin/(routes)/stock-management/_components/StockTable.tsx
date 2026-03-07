import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, EditIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StockItem } from "./types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SortableHeader } from "@/components/admin/SortableHeader";

interface StockTableProps {
  stockData: StockItem[];
  isLoading?: boolean;
  onEdit: (item: StockItem) => void;
  sortKey:
    | "product_asc"
    | "product_desc"
    | "id_asc"
    | "id_desc"
    | "stock_desc"
    | "stock_asc";
  onSort: (sortKey: string) => void;
}

export const StockTable = ({
  stockData,
  isLoading = false,
  onEdit,
  sortKey,
  onSort,
}: StockTableProps) => {
  const skeletonRows = 4;
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());
  const activeSortKey =
    sortKey.startsWith("product") ? "product" : sortKey.startsWith("id") ? "id" : "stock";
  const direction: "asc" | "desc" = sortKey.endsWith("_desc") ? "desc" : "asc";

  const toggleExpanded = (productId: string) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  return (
    <Table>
      <TableHeader className="bg-[#07484A]">
        <TableRow className="hover:bg-[#07484A]">
          <TableHead className="px-4 text-white font-semibold">
            <SortableHeader
              label="Product ID"
              sortKey="id"
              activeSortKey={activeSortKey}
              direction={direction}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            <SortableHeader
              label="Product Name"
              sortKey="product"
              activeSortKey={activeSortKey}
              direction={direction}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">Variants</TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Category
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Min/Max
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            <SortableHeader
              label="Stock"
              sortKey="stock"
              activeSortKey={activeSortKey}
              direction={direction}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Status
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Action
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: skeletonRows }).map((_, index) => (
            <TableRow key={`stock-skeleton-${index}`} className="hover:bg-transparent">
              <TableCell className="p-4"><div className="h-4 w-18 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-4 w-32 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-4 w-20 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-4 w-20 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-4 w-10 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-6 w-18 animate-pulse rounded-full bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-9 w-9 animate-pulse rounded-md bg-[#07484A]/12" /></TableCell>
            </TableRow>
          ))
        ) : stockData.length > 0 ? (
          stockData.map((item) => (
            <Fragment key={item.productId}>
              <TableRow className="hover:bg-[#C5E3FF]">
                <TableCell className="p-4 text-sm">{item.productId}</TableCell>
                <TableCell className="p-4 text-sm font-medium">
                  {item.productName}
                </TableCell>
                <TableCell className="p-4 text-sm">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(item.productId)}
                    className="inline-flex items-center gap-1 text-[#07484A] hover:underline"
                  >
                    {item.variants.length === 1 && !item.variants[0]?.variant
                      ? "No variant"
                      : `${item.variants.length} variant${item.variants.length === 1 ? "" : "s"}`}
                    {expandedProductIds.has(item.productId) ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </button>
                </TableCell>
                <TableCell className="p-4 text-sm">{item.category}</TableCell>
                <TableCell className="p-4 text-sm">
                  {item.minStock} / {item.maxStock}
                </TableCell>
                <TableCell className="p-4 text-sm">
                  {item.currentStock}
                </TableCell>
                <TableCell className="p-4">
                  <Badge
                    variant={
                      item.status === "NORMAL"
                        ? "completed"
                        : item.status === "CRITICAL"
                          ? "destructive"
                          : "preparing"
                    }
                  >
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="p-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onEdit(item)}
                        className="bg-white border-[#07484A] text-[#07484A] hover:bg-[#07484A] hover:text-white"
                      >
                        <EditIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit Stock Item</TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
              {expandedProductIds.has(item.productId) && (
                <TableRow key={`${item.productId}-variants`} className="bg-white/60 hover:bg-white/70">
                  <TableCell colSpan={8} className="px-4 py-3">
                    <div className="grid gap-2">
                      {item.variants.map((variant) => (
                        <div
                          key={variant.id}
                          className="flex flex-wrap items-center gap-2 rounded-md border border-[#07484A]/15 bg-white p-2 text-xs text-[#07484A]"
                        >
                          <span className="font-semibold">
                            {variant.variant ?? "Default"}
                          </span>
                          <span>Stock: {variant.currentStock}</span>
                          <span>Min/Max: {variant.minStock} / {variant.maxStock}</span>
                          <Badge
                            variant={
                              variant.status === "NORMAL"
                                ? "completed"
                                : variant.status === "CRITICAL"
                                  ? "destructive"
                                  : "preparing"
                            }
                          >
                            {variant.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={8}
              className="text-center py-8 text-[#07484A]/70"
            >
              No stock items found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
