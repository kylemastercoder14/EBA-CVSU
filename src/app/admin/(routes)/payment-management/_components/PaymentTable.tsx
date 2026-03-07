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
import { SortableHeader } from "@/components/admin/SortableHeader";

interface PaymentTableProps {
  payments: Payment[];
  paymentType: "GCash" | "Cash";
  isLoading?: boolean;
  onVerifyClick: (payment: Payment) => void;
  onDeclineClick: (payment: Payment) => void;
  sortKey: "orderNum" | "name" | "amount" | "reference";
  sortDirection: "asc" | "desc";
  onSort: (sortKey: string) => void;
}

export const PaymentTable = ({
  payments,
  paymentType,
  isLoading = false,
  onVerifyClick,
  onDeclineClick,
  sortKey,
  sortDirection,
  onSort,
}: PaymentTableProps) => {
  const skeletonRows = 4;
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
          <TableHead className="px-4 text-white font-semibold">
            <SortableHeader
              label="Order Number"
              sortKey="orderNum"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            <SortableHeader
              label="Name"
              sortKey="name"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            <SortableHeader
              label="Amount"
              sortKey="amount"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            <SortableHeader
              label={referenceLabel}
              sortKey="reference"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">Status</TableHead>
          <TableHead className="px-4 text-white font-semibold">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: skeletonRows }).map((_, index) => (
            <TableRow key={`payment-skeleton-${paymentType}-${index}`} className="hover:bg-transparent">
              <TableCell className="p-4">
                <div className="h-5 w-24 animate-pulse rounded bg-[#07484A]/10" />
              </TableCell>
              <TableCell className="p-4">
                <div className="h-5 w-36 animate-pulse rounded bg-[#07484A]/10" />
              </TableCell>
              <TableCell className="p-4">
                <div className="h-5 w-20 animate-pulse rounded bg-[#07484A]/10" />
              </TableCell>
              <TableCell className="p-4">
                <div className="h-5 w-32 animate-pulse rounded bg-[#07484A]/10" />
              </TableCell>
              <TableCell className="p-4">
                <div className="h-6 w-18 animate-pulse rounded-full bg-[#07484A]/10" />
              </TableCell>
              <TableCell className="p-4">
                <div className="flex gap-2">
                  <div className="h-9 w-18 animate-pulse rounded-md bg-[#07484A]/12" />
                  <div className="h-9 w-18 animate-pulse rounded-md bg-[#07484A]/10" />
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : payments.length > 0 ? (
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
