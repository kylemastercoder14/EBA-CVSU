import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Hammer, PackageCheck } from "lucide-react";
import { Order, OrderStatus } from "./types";

interface OrderReleaseTableProps {
  orders: Order[];
  status: OrderStatus;
  onReleaseClick?: (order: Order) => void;
  onMarkReadyClick?: (order: Order) => void;
}

export const OrderReleaseTable = ({
  orders,
  status,
  onReleaseClick,
  onMarkReadyClick,
}: OrderReleaseTableProps) => {
  const emptyText =
    status === "Processing"
      ? "No orders currently being processed"
      : status === "Ready"
        ? "No orders ready for pickup"
        : "No released orders";

  return (
    <Table>
      <TableHeader className="bg-[#07484A]">
        <TableRow className="hover:bg-[#07484A]">
          <TableHead className="px-4 text-white font-semibold">Order Number</TableHead>
          <TableHead className="px-4 text-white font-semibold">Name</TableHead>
          <TableHead className="px-4 text-white font-semibold">Items</TableHead>
          <TableHead className="px-4 text-white font-semibold">Quantity</TableHead>
          <TableHead className="px-4 text-white font-semibold">Pickup Date</TableHead>
          <TableHead className="px-4 text-white font-semibold">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.length > 0 ? (
          orders.map((order) => (
            <TableRow key={order.id} className="hover:bg-gray-50">
              <TableCell className="p-4 text-base">{order.orderNumber}</TableCell>
              <TableCell className="p-4 text-base font-medium">{order.name}</TableCell>
              <TableCell className="p-4 text-base text-[#07484A]">{order.items}</TableCell>
              <TableCell className="p-4 text-base">{order.quantity}</TableCell>
              <TableCell className="p-4 text-base">{order.pickupDate}</TableCell>
              <TableCell className="p-4">
                {status === "Processing" && onMarkReadyClick ? (
                  <Button
                    onClick={() => onMarkReadyClick(order)}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <Hammer className="size-4" />
                    Mark Ready
                  </Button>
                ) : status === "Ready" && onReleaseClick ? (
                  <Button
                    onClick={() => onReleaseClick(order)}
                    className="bg-[#07484A] hover:bg-[#07484A]/90 text-white"
                  >
                    <PackageCheck className="size-4" />
                    Release Order
                  </Button>
                ) : (
                  <Badge className="bg-green-600 hover:bg-green-600 text-white px-3 py-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Released
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
              {emptyText}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
