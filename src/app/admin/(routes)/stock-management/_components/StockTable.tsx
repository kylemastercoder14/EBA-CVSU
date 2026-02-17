import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditIcon } from "lucide-react";
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

interface StockTableProps {
  stockData: StockItem[];
  onEdit: (item: StockItem) => void;
}

export const StockTable = ({ stockData, onEdit }: StockTableProps) => {
  return (
    <Table>
      <TableHeader className="bg-[#07484A]">
        <TableRow className="hover:bg-[#07484A]">
          <TableHead className="px-4 text-white font-semibold">
            Product ID
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Product Name
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Category
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Min/Max
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">Stock</TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Status
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Action
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stockData.length > 0 ? (
          stockData.map((item) => (
            <TableRow key={item.id} className="hover:bg-[#C5E3FF]">
              <TableCell className="p-4 text-sm">{item.productId}</TableCell>
              <TableCell className="p-4 text-sm font-medium">
                {item.productName}
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
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={7}
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
