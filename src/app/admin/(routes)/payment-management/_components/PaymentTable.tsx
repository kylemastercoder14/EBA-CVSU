import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Payment, PaymentStatus } from "./types";

interface PaymentTableProps {
  payments: Payment[];
  paymentType: "GCash" | "Cash";
  onVerifyClick: (payment: Payment) => void;
  onDeclineClick: (payment: Payment) => void;
}

export const PaymentTable = ({
  payments,
  paymentType,
  onVerifyClick,
  onDeclineClick,
}: PaymentTableProps) => {
  const getStatusColor = (status: PaymentStatus) => {
    if (status === "Declined") {
      return "bg-red-500 hover:bg-red-500 text-white";
    }
    return status === "Verified"
      ? "bg-green-500 hover:bg-green-500 text-white"
      : "bg-orange-400 hover:bg-orange-400 text-white";
  };

  const referenceLabel = paymentType === "GCash" ? "GCash Reference" : "Cash Reference";

  return (
    <Table>
      <TableHeader className="bg-[#07484A]">
        <TableRow className="hover:bg-[#07484A]">
          <TableHead className="px-4 text-white font-semibold">Order Number</TableHead>
          <TableHead className="px-4 text-white font-semibold">Name</TableHead>
          <TableHead className="px-4 text-white font-semibold">Amount</TableHead>
          <TableHead className="px-4 text-white font-semibold">{referenceLabel}</TableHead>
          <TableHead className="px-4 text-white font-semibold">Status</TableHead>
          <TableHead className="px-4 text-white font-semibold">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.length > 0 ? (
          payments.map((payment) => (
            <TableRow key={payment.id} className="hover:bg-gray-50">
              <TableCell className="p-4 text-base">{payment.orderNum}</TableCell>
              <TableCell className="p-4 text-base font-medium">{payment.name}</TableCell>
              <TableCell className="p-4 text-base font-semibold">
                ₱{payment.amount.toLocaleString()}
              </TableCell>
              <TableCell className="p-4 text-base">{payment.reference}</TableCell>
              <TableCell className="p-4">
                {payment.status === "Verified" ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">Verified</span>
                  </div>
                ) : payment.status === "Declined" ? (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span className="font-medium">Declined</span>
                  </div>
                ) : (
                  <Badge className={`${getStatusColor(payment.status)} px-3 py-1`}>
                    {payment.status}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="p-4">
                {payment.status === "Pending" ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onVerifyClick(payment)}
                      className="bg-[#07484A] hover:bg-[#07484A]/90 text-white"
                    >
                      Verify
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onDeclineClick(payment)}
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      Decline
                    </Button>
                  </div>
                ) : (
                  <Button disabled className="bg-gray-300 text-gray-500 cursor-not-allowed">
                    {payment.status}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
              No {paymentType} payments found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
