import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PaymentSearchBar } from "./PaymentSearchBar";
import { PaymentTable } from "./PaymentTable";
import { PaymentPagination } from "./PaymentPagination";
import { Payment } from "./types";
import { TablePrintButton } from "@/components/admin/TablePrintButton";

interface PaymentTabContentProps {
  title: string;
  description: string;
  payments: Payment[];
  totalItems: number;
  paymentType: "GCash" | "Cash";
  isLoading?: boolean;
  searchQuery: string;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: string) => void;
  onVerifyClick: (payment: Payment) => void;
  onDeclineClick: (payment: Payment) => void;
}

export const PaymentTabContent = ({
  title,
  description,
  payments,
  totalItems,
  paymentType,
  isLoading = false,
  searchQuery,
  currentPage,
  totalPages,
  itemsPerPage,
  startIndex,
  endIndex,
  onSearchChange,
  onPageChange,
  onItemsPerPageChange,
  onVerifyClick,
  onDeclineClick,
}: PaymentTabContentProps) => {
  const tableId = `admin-payments-${paymentType.toLowerCase()}`;

  return (
    <Card className="border-2 gap-0! border-[#07484A] bg-[#D3E9FF]">
      <CardHeader className="border-b-2 pb-4 border-[#07484A]">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-[#07484A] text-xl">
            {title}
          </CardTitle>
          <TablePrintButton targetId={tableId} title={title} />
        </div>
        <CardDescription className="text-[#07484A]/70">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <PaymentSearchBar value={searchQuery} onChange={onSearchChange} />
        <div id={tableId}>
          <PaymentTable
            payments={payments}
            paymentType={paymentType}
            isLoading={isLoading}
            onVerifyClick={onVerifyClick}
            onDeclineClick={onDeclineClick}
          />
        </div>
        <PaymentPagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      </CardContent>
    </Card>
  );
};
