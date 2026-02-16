import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PaymentSearchBar } from "./PaymentSearchBar";
import { PaymentTable } from "./PaymentTable";
import { PaymentPagination } from "./PaymentPagination";
import { Payment } from "./types";

interface PaymentTabContentProps {
  title: string;
  description: string;
  payments: Payment[];
  paymentType: "GCash" | "Cash";
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
}

export const PaymentTabContent = ({
  title,
  description,
  payments,
  paymentType,
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
}: PaymentTabContentProps) => {
  return (
    <Card className="border-2 gap-0! border-[#07484A] bg-[#D3E9FF]">
      <CardHeader className="border-b-2 pb-4 border-[#07484A]">
        <CardTitle className="text-[#07484A] text-xl">
          {title}
        </CardTitle>
        <CardDescription className="text-[#07484A]/70">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <PaymentSearchBar value={searchQuery} onChange={onSearchChange} />
        <PaymentTable
          payments={payments}
          paymentType={paymentType}
          onVerifyClick={onVerifyClick}
        />
        <PaymentPagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={payments.length}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      </CardContent>
    </Card>
  );
};
