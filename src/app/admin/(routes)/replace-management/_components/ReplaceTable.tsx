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

interface ReplaceTableProps {
  requests: ReplaceRequest[];
  status: ReplaceRequestStatus;
  onReviewClick: (request: ReplaceRequest) => void;
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
  onReviewClick,
}: ReplaceTableProps) => {
  const showActionColumn = status === "Pending";
  const colSpan = showActionColumn ? 6 : 5;

  return (
    <Table>
      <TableHeader className="bg-[#07484A]">
        <TableRow className="hover:bg-[#07484A]">
          <TableHead className="px-4 text-white font-semibold">Request ID</TableHead>
          <TableHead className="px-4 text-white font-semibold">Order Number</TableHead>
          <TableHead className="px-4 text-white font-semibold">Reason</TableHead>
          <TableHead className="px-4 text-white font-semibold">Requested At</TableHead>
          <TableHead className="px-4 text-white font-semibold">Status</TableHead>
          {showActionColumn && (
            <TableHead className="px-4 text-white font-semibold">Action</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.length > 0 ? (
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
