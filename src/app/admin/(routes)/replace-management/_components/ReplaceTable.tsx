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
import { ReplaceRequest, ReplaceRequestStatus } from "./types";
import { SortableHeader } from "@/components/admin/SortableHeader";

interface ReplaceTableProps {
  requests: ReplaceRequest[];
  status: ReplaceRequestStatus;
  isLoading?: boolean;
  onReviewClick: (request: ReplaceRequest) => void;
  sortKey: "id" | "orderNumber" | "reason" | "createdAt";
  sortDirection: "asc" | "desc";
  onSort: (sortKey: string) => void;
}

const statusClassName: Record<ReplaceRequestStatus, string> = {
  Pending: "bg-orange-500 hover:bg-orange-500 text-white",
  Approved: "bg-green-600 hover:bg-green-600 text-white",
  Rejected: "bg-red-600 hover:bg-red-600 text-white",
};

const formatDate = (isoText: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoText));

export const ReplaceTable = ({
  requests,
  status,
  isLoading = false,
  onReviewClick,
  sortKey,
  sortDirection,
  onSort,
}: ReplaceTableProps) => {
  const skeletonRows = 4;
  const showActionColumn = status === "Pending";
  const colSpan = showActionColumn ? 6 : 5;

  return (
    <Table>
      <TableHeader className="bg-[#07484A]">
        <TableRow className="hover:bg-[#07484A]">
          <TableHead className="px-4 text-white font-semibold">
            <SortableHeader
              label="Request ID"
              sortKey="id"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            <SortableHeader
              label="Order Number"
              sortKey="orderNumber"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            <SortableHeader
              label="Reason"
              sortKey="reason"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            <SortableHeader
              label="Requested At"
              sortKey="createdAt"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">Status</TableHead>
          {showActionColumn && (
            <TableHead className="px-4 text-white font-semibold">Action</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: skeletonRows }).map((_, index) => (
            <TableRow key={`replace-skeleton-${status}-${index}`} className="hover:bg-transparent">
              <TableCell className="p-4">
                <div className="h-5 w-20 animate-pulse rounded bg-[#07484A]/10" />
              </TableCell>
              <TableCell className="p-4">
                <div className="h-5 w-24 animate-pulse rounded bg-[#07484A]/10" />
              </TableCell>
              <TableCell className="p-4">
                <div className="h-5 w-28 animate-pulse rounded bg-[#07484A]/10" />
              </TableCell>
              <TableCell className="p-4">
                <div className="h-5 w-36 animate-pulse rounded bg-[#07484A]/10" />
              </TableCell>
              <TableCell className="p-4">
                <div className="h-6 w-20 animate-pulse rounded-full bg-[#07484A]/10" />
              </TableCell>
              {showActionColumn && (
                <TableCell className="p-4">
                  <div className="h-9 w-28 animate-pulse rounded-md bg-[#07484A]/12" />
                </TableCell>
              )}
            </TableRow>
          ))
        ) : requests.length > 0 ? (
          requests.map((request) => (
            <TableRow key={request.id} className="hover:bg-[#C5E3FF]">
              <TableCell className="p-4 text-base font-medium">{request.id}</TableCell>
              <TableCell className="p-4 text-base">{request.orderNumber}</TableCell>
              <TableCell className="p-4 text-base">{request.reason}</TableCell>
              <TableCell className="p-4 text-base">{formatDate(request.createdAt)}</TableCell>
              <TableCell className="p-4">
                <Badge className={`${statusClassName[request.status]} px-3 py-1`}>
                  {request.status}
                </Badge>
              </TableCell>
              {showActionColumn && (
                <TableCell className="p-4">
                  <Button
                    className="bg-[#07484A] hover:bg-[#07484A]/90 text-white"
                    onClick={() => onReviewClick(request)}
                  >
                    Review Request
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={colSpan} className="text-center py-8 text-[#07484A]/70">
              No replace requests in this status
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
