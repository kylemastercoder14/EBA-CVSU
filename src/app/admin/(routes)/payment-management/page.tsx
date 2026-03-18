"use client";

import { Heading } from "@/components/Heading";
import { useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconCash, IconCircleCheckFilled, IconDeviceMobile } from '@tabler/icons-react';
import { DeclinePaymentDialog } from "./_components/DeclinePaymentDialog";
import { PaymentTabContent } from "./_components/PaymentTabContent";
import { VerifyPaymentDialog } from "./_components/VerifyPaymentDialog";
import { Payment } from "./_components/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";

type PaymentSortKey = "orderNum" | "name" | "amount" | "reference";
type SortDirection = "asc" | "desc";
type PaymentListItem = Payment & { orderId: string };

const Page = () => {
  const queryClient = useQueryClient();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [activeTab, setActiveTab] = useState<"gcash" | "cash">("gcash");
  const [sortKey, setSortKey] = useState<PaymentSortKey>("orderNum");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  const gcashQrInputRef = useRef<HTMLInputElement | null>(null);

  const { data, isLoading, isError } = useQuery(orpc.payment.list.queryOptions());
  const payments = useMemo(() => data?.payments ?? [], [data?.payments]);

  const updatePaymentStatusOptimistically = async (
    paymentId: string,
    status: Payment["status"],
  ) => {
    await queryClient.cancelQueries({
      queryKey: orpc.payment.list.queryKey(),
    });

    const previousPayments = queryClient.getQueryData<{ payments: PaymentListItem[] }>(
      orpc.payment.list.queryKey(),
    );

    queryClient.setQueryData<{ payments: PaymentListItem[] }>(
      orpc.payment.list.queryKey(),
      (current) => {
        if (!current) return current;

        return {
          ...current,
          payments: current.payments.map((payment) =>
            payment.id === paymentId ? { ...payment, status } : payment,
          ),
        };
      },
    );

    setIsVerifyDialogOpen(false);
    setIsDeclineDialogOpen(false);
    setSelectedPayment(null);

    return { previousPayments };
  };

  const verifyPaymentMutation = useMutation(
    orpc.payment.verify.mutationOptions({
      onMutate: ({ paymentId }) =>
        updatePaymentStatusOptimistically(paymentId, "Verified"),
      onSuccess: (result) => {
        const sms = result.smsNotification;
        if (sms?.attempted && sms.sent) {
          toast.success("Payment verified successfully. SMS notification sent.");
        } else if (sms?.attempted && !sms.sent) {
          toast.warning(
            `Payment verified, but SMS failed${sms.error ? `: ${sms.error}` : "."}`,
          );
        } else {
          toast.success(result.message || "Payment verified successfully");
        }
      },
      onError: (error, _variables, context) => {
        if (context?.previousPayments) {
          queryClient.setQueryData<{ payments: PaymentListItem[] }>(
            orpc.payment.list.queryKey(),
            context.previousPayments,
          );
        }
        toast.error(error.message || "Failed to verify payment");
      },
      onSettled: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.payment.list.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.order.listMonitoring.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.order.listRelease.queryKey(),
          }),
        ]);
      },
    }),
  );

  const declinePaymentMutation = useMutation(
    orpc.payment.decline.mutationOptions({
      onMutate: ({ paymentId }) =>
        updatePaymentStatusOptimistically(paymentId, "Declined"),
      onSuccess: (result) => {
        const sms = result.smsNotification;
        if (sms?.attempted && sms.sent) {
          toast.success("Payment declined successfully. SMS notification sent.");
        } else if (sms?.attempted && !sms.sent) {
          toast.warning(
            `Payment declined, but SMS failed${sms.error ? `: ${sms.error}` : "."}`,
          );
        } else {
          toast.success(result.message || "Payment declined successfully");
        }
      },
      onError: (error, _variables, context) => {
        if (context?.previousPayments) {
          queryClient.setQueryData<{ payments: PaymentListItem[] }>(
            orpc.payment.list.queryKey(),
            context.previousPayments,
          );
        }
        toast.error(error.message || "Failed to decline payment");
      },
      onSettled: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.payment.list.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.order.listMonitoring.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.order.listRelease.queryKey(),
          }),
        ]);
      },
    }),
  );

  const uploadGcashQrMutation = useMutation(
    orpc.payment.uploadGcashQr.mutationOptions({
      onSuccess: () => {
        toast.success("GCash QR code updated successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update GCash QR code");
      },
    }),
  );

  // Filter payments by method and search query
  const filteredPayments = payments.filter((payment) => {
    const matchesTab = activeTab === "gcash"
      ? payment.paymentMethod === "GCash"
      : payment.paymentMethod === "Cash";

    const matchesSearch =
      payment.orderNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.reference.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    if (sortKey === "amount") {
      return sortDirection === "asc" ? a.amount - b.amount : b.amount - a.amount;
    }
    const aValue = a[sortKey].toLowerCase();
    const bValue = b[sortKey].toLowerCase();
    return sortDirection === "asc"
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = sortedPayments.slice(startIndex, endIndex);

  // Reset to page 1 when items per page changes
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Reset to page 1 when search query changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Reset to page 1 when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value as "gcash" | "cash");
    setCurrentPage(1);
  };

  const handleSort = (nextKey: string) => {
    const castKey = nextKey as PaymentSortKey;
    if (castKey === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(castKey);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleVerifyClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsVerifyDialogOpen(true);
  };

  const handleDeclineClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDeclineDialogOpen(true);
  };

  const confirmVerify = () => {
    if (!selectedPayment) {
      return;
    }

    verifyPaymentMutation.mutate({
      paymentId: selectedPayment.id,
      actorName: "Admin",
    });
  };

  const confirmDecline = (reason: string) => {
    if (!selectedPayment) return;

    declinePaymentMutation.mutate({
      paymentId: selectedPayment.id,
      actorName: "Admin",
      ...(reason ? { reason } : {}),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Heading
          title="Payment Management"
          description="Verify and manage customer payments"
        />
        <input
          ref={gcashQrInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            uploadGcashQrMutation.mutate({
              image: file,
              actorName: "Admin",
            });
            event.currentTarget.value = "";
          }}
        />
        <button
          type="button"
          disabled={uploadGcashQrMutation.isPending}
          onClick={() => gcashQrInputRef.current?.click()}
          className="inline-flex h-10 items-center rounded-md bg-[#07484A] px-3 text-sm font-semibold text-white hover:bg-[#07484A]/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploadGcashQrMutation.isPending ? "Uploading..." : "Upload GCash QR"}
        </button>
      </div>

      <div className="mt-10">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full bg-[#E8E4DA] border-2 border-[#07484A] h-14! p-1">
            <TabsTrigger
              value="gcash"
              className="flex-1 h-full data-[state=active]:bg-white data-[state=active]:text-[#07484A] font-semibold text-base"
            >
              <IconDeviceMobile className='size-5' />
              GCash Payment
              <IconCircleCheckFilled className="ml-2 size-5 text-green-500" />
            </TabsTrigger>
            <TabsTrigger
              value="cash"
              className="flex-1 h-full data-[state=active]:bg-white data-[state=active]:text-[#07484A] font-semibold text-base"
            >
              <IconCash className='size-5' />
              Cash Payments
              <IconCircleCheckFilled className="ml-2 size-5 text-green-500" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gcash" className="mt-6">
            <PaymentTabContent
              title="GCash Transactions"
              description="Verify GCash reference numbers and approve payments"
              payments={currentPayments}
              totalItems={filteredPayments.length}
              paymentType="GCash"
              isLoading={isLoading}
              searchQuery={searchQuery}
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              startIndex={startIndex}
              endIndex={endIndex}
              onSearchChange={handleSearchChange}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              onVerifyClick={handleVerifyClick}
              onDeclineClick={handleDeclineClick}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </TabsContent>

          <TabsContent value="cash" className="mt-6">
            <PaymentTabContent
              title="Cash Transactions"
              description="Verify cash payments and approve transactions"
              payments={currentPayments}
              totalItems={filteredPayments.length}
              paymentType="Cash"
              isLoading={isLoading}
              searchQuery={searchQuery}
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              startIndex={startIndex}
              endIndex={endIndex}
              onSearchChange={handleSearchChange}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              onVerifyClick={handleVerifyClick}
              onDeclineClick={handleDeclineClick}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </TabsContent>
        </Tabs>
      </div>

      {isLoading && (
        <p className="mt-4 text-sm text-[#07484A]">Loading payments...</p>
      )}

      {isError && (
        <p className="mt-4 text-sm text-red-600">Unable to load payments right now.</p>
      )}

      <VerifyPaymentDialog
        isOpen={isVerifyDialogOpen}
        payment={selectedPayment}
        onOpenChange={setIsVerifyDialogOpen}
        onConfirm={confirmVerify}
        isPending={verifyPaymentMutation.isPending}
      />
      <DeclinePaymentDialog
        isOpen={isDeclineDialogOpen}
        payment={selectedPayment}
        onOpenChange={setIsDeclineDialogOpen}
        onConfirm={confirmDecline}
        isPending={declinePaymentMutation.isPending}
      />
    </div>
  );
};

export default Page;
