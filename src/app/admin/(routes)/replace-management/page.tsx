"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Heading } from "@/components/Heading";
import { orpc } from "@/lib/orpc";
import { ReplaceRequestsTabs } from "./_components/ReplaceRequestsTabs";
import { ReplaceRequest, ReplaceRequestStatus } from "./_components/types";
import { UpdateReplaceStatusDialog } from "./_components/UpdateReplaceStatusDialog";

const reasonLabel: Record<string, string> = {
  WRONG_ITEM: "Wrong Item",
  DEFECTIVE_ITEM: "Defective Item",
  WRONG_SIZE: "Wrong Size",
  CHANGE_OF_MIND: "Change of Mind",
};

const statusLabel: Record<string, ReplaceRequestStatus> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const Page = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ReplaceRequestStatus>("Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [selectedRequest, setSelectedRequest] = useState<ReplaceRequest | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  const { data, isLoading, isError } = useQuery(orpc.replace.list.queryOptions());
  const requests = useMemo<ReplaceRequest[]>(() => {
    const rows = data?.replaceRequests ?? [];
    return rows.map((row) => ({
      id: row.id,
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      reason: reasonLabel[row.reason] ?? row.reason,
      status: statusLabel[row.status] ?? "Pending",
      createdAt: row.createdAt,
    }));
  }, [data?.replaceRequests]);

  const updateStatusMutation = useMutation(
    orpc.replace.updateStatus.mutationOptions({
      onSuccess: (result) => {
        toast.success(result.message || "Replace request updated successfully");
        queryClient.invalidateQueries({
          queryKey: orpc.replace.list.queryKey(),
        });
        setIsStatusDialogOpen(false);
        setSelectedRequest(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update replace request status");
      },
    }),
  );

  const filteredRequests = requests.filter((request) => {
    const matchesStatus = request.status === activeTab;
    const matchesSearch =
      request.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  const statusCounts: Record<ReplaceRequestStatus, number> = {
    Pending: requests.filter((request) => request.status === "Pending").length,
    Approved: requests.filter((request) => request.status === "Approved").length,
    Rejected: requests.filter((request) => request.status === "Rejected").length,
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as ReplaceRequestStatus);
    setCurrentPage(1);
    setSearchQuery("");
  };

  const handleReviewClick = (request: ReplaceRequest) => {
    setSelectedRequest(request);
    setIsStatusDialogOpen(true);
  };

  const confirmApprove = () => {
    if (!selectedRequest) return;

    updateStatusMutation.mutate({
      replaceRequestId: selectedRequest.id,
      status: "APPROVED",
      actorName: "Admin",
    });
  };

  const confirmReject = () => {
    if (!selectedRequest) return;

    updateStatusMutation.mutate({
      replaceRequestId: selectedRequest.id,
      status: "REJECTED",
      actorName: "Admin",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Heading
          title="Replace Management"
          description="Review and process kiosk replacement requests"
        />
      </div>

      <div className="mt-10">
        <ReplaceRequestsTabs
          activeTab={activeTab}
          statusCounts={statusCounts}
          currentRequests={currentRequests}
          searchQuery={searchQuery}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          startIndex={startIndex}
          endIndex={endIndex}
          totalFilteredItems={filteredRequests.length}
          onTabChange={handleTabChange}
          onSearchChange={handleSearchChange}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={handleItemsPerPageChange}
          onReviewClick={handleReviewClick}
        />
      </div>

      <UpdateReplaceStatusDialog
        isOpen={isStatusDialogOpen}
        request={selectedRequest}
        onOpenChange={setIsStatusDialogOpen}
        onApprove={confirmApprove}
        onReject={confirmReject}
        isPending={updateStatusMutation.isPending}
      />

      {isLoading && (
        <p className="mt-4 text-sm text-[#07484A]">Loading replace requests...</p>
      )}

      {isError && (
        <p className="mt-4 text-sm text-red-600">Unable to load replace requests right now.</p>
      )}
    </div>
  );
};

export default Page;
