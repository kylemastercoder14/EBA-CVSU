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
  onConfirmClick?: (order: Order) => void;
}

export const OrderTable = ({ orders, stage, onConfirmClick }: OrderTableProps) => {
  const getPaymentStatusColor = (status: PaymentStatus) => {
    return status === "Verified"
      ? "bg-green-500 hover:bg-green-500 text-white"
      : "bg-orange-400 hover:bg-orange-400 text-white";
  };

  const getPaymentMethodColor = (method: PaymentMethod) => {
    return method === "GCash" ? "text-blue-600" : "text-gray-700";
  };

  const showActionColumn = stage === "To Confirm";
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
        {orders.length > 0 ? (
          orders.map((order) => (
            <TableRow key={order.id} className="hover:bg-[#C5E3FF]">
              <TableCell className="p-4 text-base">{order.orderNum}</TableCell>
              <TableCell className="p-4 text-base font-medium">{order.name}</TableCell>
              <TableCell className="p-4 text-base text-[#07484A]">{order.items}</TableCell>
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
