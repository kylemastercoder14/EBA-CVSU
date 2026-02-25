import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Order, OrderStage, PaymentMethod, PaymentStatus } from "./types";

interface OrderTableProps {
  orders: Order[];
  stage: OrderStage;
  isLoading?: boolean;
  onConfirmClick?: (order: Order) => void;
}

export const OrderTable = ({
  orders,
  stage,
  isLoading = false,
  onConfirmClick,
}: OrderTableProps) => {
  const skeletonRows = 4;
  const getPaymentStatusColor = (status: PaymentStatus) => {
    if (status === "Declined") {
      return "bg-red-500 hover:bg-red-500 text-white";
    }
    return status === "Verified"
      ? "bg-green-500 hover:bg-green-500 text-white"
      : "bg-orange-400 hover:bg-orange-400 text-white";
  };

  const getPaymentMethodColor = (method: PaymentMethod) => {
    return method === "GCash" ? "text-blue-600" : "text-gray-700";
  };

  const showActionColumn = stage === "Pending";
  const colSpan = showActionColumn ? 8 : 7;

  return (
    <Table>
      <TableHeader className="bg-[#07484A]">
        <TableRow className="hover:bg-[#07484A]">
          <TableHead className="px-4 text-white font-semibold">Order Number</TableHead>
          <TableHead className="px-4 text-white font-semibold">Name</TableHead>
          <TableHead className="px-4 text-white font-semibold">Items</TableHead>
          <TableHead className="px-4 text-white font-semibold">Quantity</TableHead>
          <TableHead className="px-4 text-white font-semibold">Payment Method</TableHead>
          <TableHead className="px-4 text-white font-semibold">Payment Status</TableHead>
          <TableHead className="px-4 text-white font-semibold">Pickup Date</TableHead>
          {showActionColumn && (
            <TableHead className="px-4 text-white font-semibold">Action</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: skeletonRows }).map((_, index) => (
            <TableRow key={`monitoring-skeleton-${stage}-${index}`} className="hover:bg-transparent">
              <TableCell className="p-4">
                <div className="h-5 w-24 animate-pulse rounded bg-[#07484A]/10" />
              </TableCell>
              <TableCell className="p-4">
                <div className="h-5 w-36 animate-pulse rounded bg-[#07484A]/10" />
              </TableCell>
              <TableCell className="p-4">
                <div className="h-5 w-full max-w-64 animate-pulse rounded bg-[#07484A]/10" />
              </TableCell>
              <TableCell className="p-4">
                <div className="h-5 w-10 animate-pulse rounded bg-[#07484A]/10" />
              </TableCell>
              <TableCell className="p-4">
                <div className="h-5 w-16 animate-pulse rounded bg-[#07484A]/10" />
              </TableCell>
              <TableCell className="p-4">
                <div className="h-6 w-20 animate-pulse rounded-full bg-[#07484A]/10" />
              </TableCell>
              <TableCell className="p-4">
                <div className="h-5 w-28 animate-pulse rounded bg-[#07484A]/10" />
              </TableCell>
              {showActionColumn && (
                <TableCell className="p-4">
                  <div className="h-9 w-28 animate-pulse rounded-md bg-[#07484A]/12" />
                </TableCell>
              )}
            </TableRow>
          ))
        ) : orders.length > 0 ? (
          orders.map((order) => (
            <TableRow key={order.id} className="hover:bg-[#C5E3FF]">
              <TableCell className="p-4 text-base">{order.orderNum}</TableCell>
              <TableCell className="p-4 text-base font-medium">{order.name}</TableCell>
              <TableCell className="p-4 max-w-75 text-base truncate">{order.items}</TableCell>
              <TableCell className="p-4 text-base">{order.quantity}</TableCell>
              <TableCell className="p-4 text-base">
                <span className={`font-semibold ${getPaymentMethodColor(order.paymentMethod)}`}>
                  {order.paymentMethod}
                </span>
              </TableCell>
              <TableCell className="p-4">
                <Badge className={`${getPaymentStatusColor(order.paymentStatus)} px-3 py-1`}>
                  {order.paymentStatus}
                </Badge>
              </TableCell>
              <TableCell className="p-4 text-base">{order.pickupDate}</TableCell>
              {showActionColumn && onConfirmClick && (
                <TableCell className="p-4">
                  <Button
                    onClick={() => onConfirmClick(order)}
                    className="bg-[#07484A] hover:bg-[#07484A]/90 text-white"
                  >
                    Confirm Order
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={colSpan} className="text-center py-8 text-[#07484A]/70">
              No orders in this stage
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
