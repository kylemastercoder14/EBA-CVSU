"use client";

import { Heading } from "@/components/Heading";
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
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";
import { SortableHeader } from "@/components/admin/SortableHeader";

type PreOrderRow = {
  id: string;
  orderNumber: string;
  name: string;
  items: string;
  quantity: number;
  paymentMethod: "GCash" | "Cash";
  paymentStatus: "Pending" | "Verified" | "Declined";
  createdAt: string;
  canMarkStockAvailable: boolean;
};

const statusClass = (status: PreOrderRow["paymentStatus"]) => {
  if (status === "Verified") return "bg-green-500 text-white";
  if (status === "Declined") return "bg-red-500 text-white";
  return "bg-amber-500 text-white";
};

const Page = () => {
  const skeletonRows = 5;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"orderNumber" | "name" | "quantity" | "createdAt">(
    "orderNumber",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedOrder, setSelectedOrder] = useState<PreOrderRow | null>(null);

  const { data, isLoading, isError } = useQuery(
    orpc.order.listPreOrders.queryOptions(),
  );
  const rows = useMemo(() => data?.orders ?? [], [data?.orders]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter(
      (row) =>
        row.orderNumber.toLowerCase().includes(keyword) ||
        row.name.toLowerCase().includes(keyword) ||
        row.items.toLowerCase().includes(keyword),
    );
  }, [rows, search]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      if (sortKey === "quantity") {
        return sortDirection === "asc" ? a.quantity - b.quantity : b.quantity - a.quantity;
      }
      if (sortKey === "createdAt") {
        const timeA = Date.parse(a.createdAt);
        const timeB = Date.parse(b.createdAt);
        const aValue = Number.isNaN(timeA) ? 0 : timeA;
        const bValue = Number.isNaN(timeB) ? 0 : timeB;
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      const aValue = a[sortKey].toLowerCase();
      const bValue = b[sortKey].toLowerCase();
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [filteredRows, sortDirection, sortKey]);

  const handleSort = (nextKey: string) => {
    const castKey = nextKey as typeof sortKey;
    if (castKey === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(castKey);
      setSortDirection("asc");
    }
  };

  const markStockAvailableMutation = useMutation(
    orpc.order.markPreOrderStockAvailable.mutationOptions({
      onMutate: async ({ orderId }) => {
        await queryClient.cancelQueries({
          queryKey: orpc.order.listPreOrders.queryKey(),
        });

        const previousPreOrders = queryClient.getQueryData<{ orders: PreOrderRow[] }>(
          orpc.order.listPreOrders.queryKey(),
        );

        queryClient.setQueryData<{ orders: PreOrderRow[] }>(
          orpc.order.listPreOrders.queryKey(),
          (current) => {
            if (!current) return current;

            return {
              ...current,
              orders: current.orders.filter((order) => order.id !== orderId),
            };
          },
        );

        setSelectedOrder(null);

        return { previousPreOrders };
      },
      onSuccess: (result) => {
        const sms = result.smsNotification;
        if (sms?.attempted && sms.sent) {
          toast.success("Stock marked available and SMS notification sent.");
        } else if (sms?.attempted && !sms.sent) {
          toast.warning(
            `Stock marked available, but SMS failed${sms.error ? `: ${sms.error}` : "."}`,
          );
        } else {
          toast.success(result.message);
        }
      },
      onError: (error, _variables, context) => {
        if (context?.previousPreOrders) {
          queryClient.setQueryData(
            orpc.order.listPreOrders.queryKey(),
            context.previousPreOrders,
          );
        }

        setSelectedOrder(null);
        toast.error(error.message || "Unable to mark stock as available.");
      },
      onSettled: async () => {
        await Promise.all([
          queryClient.refetchQueries({
            queryKey: orpc.order.listPreOrders.queryKey(),
            type: "active",
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

  return (
    <div>
      <Heading
        title="Pre-Order Management"
        description="Separate queue for pre-orders waiting for stock availability."
      />

      <div className="mt-8 rounded-xl border-2 border-[#07484A] bg-[#D3E9FF]">
        <div className="border-b border-[#07484A]/20 p-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by order number, customer, or item..."
            className="h-11 bg-white"
          />
        </div>

        <Table>
          <TableHeader className="bg-[#07484A]">
            <TableRow className="hover:bg-[#07484A]">
              <TableHead className="text-white">
                <SortableHeader
                  label="Order Number"
                  sortKey="orderNumber"
                  activeSortKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-white">
                <SortableHeader
                  label="Customer"
                  sortKey="name"
                  activeSortKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-white">Items</TableHead>
              <TableHead className="text-white">
                <SortableHeader
                  label="Qty"
                  sortKey="quantity"
                  activeSortKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-white">Payment</TableHead>
              <TableHead className="text-white">Payment Status</TableHead>
              <TableHead className="text-white">
                <SortableHeader
                  label="Created"
                  sortKey="createdAt"
                  activeSortKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-white">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, index) => (
                <TableRow key={`preorder-skeleton-${index}`} className="hover:bg-transparent">
                  <TableCell className="p-4">
                    <div className="h-5 w-24 animate-pulse rounded bg-[#07484A]/10" />
                  </TableCell>
                  <TableCell className="p-4">
                    <div className="h-5 w-36 animate-pulse rounded bg-[#07484A]/10" />
                  </TableCell>
                  <TableCell className="p-4">
                    <div className="h-5 w-full max-w-72 animate-pulse rounded bg-[#07484A]/10" />
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
                    <div className="h-5 w-24 animate-pulse rounded bg-[#07484A]/10" />
                  </TableCell>
                  <TableCell className="p-4">
                    <div className="h-9 w-32 animate-pulse rounded-md bg-[#07484A]/12" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-red-600">
                  Unable to load pre-orders right now.
                </TableCell>
              </TableRow>
            ) : sortedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-[#07484A]/70">
                  No pre-orders found.
                </TableCell>
              </TableRow>
            ) : (
              sortedRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.orderNumber}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="max-w-76 truncate">{row.items}</TableCell>
                  <TableCell>{row.quantity}</TableCell>
                  <TableCell>{row.paymentMethod}</TableCell>
                  <TableCell>
                    <Badge className={statusClass(row.paymentStatus)}>
                      {row.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.createdAt}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      disabled={
                        !row.canMarkStockAvailable ||
                        markStockAvailableMutation.isPending
                      }
                      onClick={() => setSelectedOrder(row)}
                      className="bg-[#07484A] hover:bg-[#07484A]/90 text-white disabled:opacity-60"
                    >
                      Stock Available
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notify customer now?</AlertDialogTitle>
            <AlertDialogDescription>
              Marking this pre-order as stock available will send an SMS to the
              customer so they can select a pickup date and continue the order
              flow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markStockAvailableMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={markStockAvailableMutation.isPending}
              onClick={() => {
                if (!selectedOrder) return;
                markStockAvailableMutation.mutate({
                  orderId: selectedOrder.id,
                  actorName: "Admin",
                });
              }}
            >
              {markStockAvailableMutation.isPending
                ? "Sending..."
                : "Confirm & Send SMS"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Page;
