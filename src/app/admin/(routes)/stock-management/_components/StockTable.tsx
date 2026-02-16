import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2Icon, Trash2Icon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StockItem } from "./types";

interface StockTableProps {
  stockData: StockItem[];
  onEdit: (item: StockItem) => void;
  onDelete: (id: string) => void;
}

export const StockTable = ({ stockData, onEdit, onDelete }: StockTableProps) => {
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
          <TableHead className="px-4 text-white font-semibold">
            Stock
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
        {stockData.length > 0 ? (
          stockData.map((item) => (
            <TableRow key={item.id} className="hover:bg-[#C5E3FF]">
              <TableCell className="p-4 text-base">
                {item.productId}
              </TableCell>
              <TableCell className="p-4 text-base font-medium">
                {item.productName}
              </TableCell>
              <TableCell className="p-4 text-base">
                {item.category}
              </TableCell>
              <TableCell className="p-4 text-base">
                {item.minStock} / {item.maxStock}
              </TableCell>
              <TableCell className="p-4 text-base">
                {item.currentStock}
              </TableCell>
              <TableCell className="p-4">
                <Badge
                  variant={
                    item.status === "Normal"
                      ? "completed"
                      : item.status === "Critical"
                        ? "destructive"
                        : "preparing"
                  }
                >
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell className="p-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onEdit(item)}
                    className="bg-white border-[#07484A] text-[#07484A] hover:bg-[#07484A] hover:text-white"
                  >
                    <Edit2Icon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onDelete(item.id)}
                    className="bg-white border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </div>
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
