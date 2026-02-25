import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  IconActivity,
  IconAlertTriangle,
  IconCreditCard,
  IconShoppingCart,
} from "@tabler/icons-react";
import { LogRecord } from "./types";
import { LogStatus, LogType } from "@/generated/prisma";
import { format } from "date-fns";
import { formatEnumLabel } from '@/lib/utils';

interface LogsRecordsTableProps {
  logs: LogRecord[];
  isLoading?: boolean;
}

export const LogsRecordsTable = ({
  logs,
  isLoading = false,
}: LogsRecordsTableProps) => {
  const skeletonRows = 5;
  const getTypeIcon = (type: LogType) => {
    switch (type) {
      case "ORDER":
        return <IconShoppingCart className="h-4 w-4" />;
      case "PAYMENT":
        return <IconCreditCard className="h-4 w-4" />;
      case "ACTIVITY":
        return <IconActivity className="h-4 w-4" />;
      case "SYSTEM":
        return <IconAlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: LogStatus) => {
    switch (status) {
      case "SUCCESS":
        return "bg-green-500 hover:bg-green-500 text-white";
      case "INFO":
        return "bg-blue-500 hover:bg-blue-500 text-white";
      case "WARNING":
        return "bg-orange-400 hover:bg-orange-400 text-white";
    }
  };

  return (
    <Table>
      <TableHeader className="bg-[#07484A]">
        <TableRow className="hover:bg-[#07484A]">
          <TableHead className="px-4 text-white font-semibold">
            Log ID
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">Type</TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Category
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Description
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">User</TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Timestamp
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Action
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: skeletonRows }).map((_, index) => (
            <TableRow key={`logs-skeleton-${index}`} className="hover:bg-transparent">
              <TableCell className="p-4"><div className="h-4 w-18 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-4 w-24 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-4 w-full max-w-xs animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-4 w-20 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-4 w-24 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-6 w-18 animate-pulse rounded-full bg-[#07484A]/10" /></TableCell>
            </TableRow>
          ))
        ) : logs.length > 0 ? (
          logs.map((log) => (
            <TableRow key={log.id} className="hover:bg-gray-50">
              <TableCell className="p-4 text-sm font-medium">
                {log.id}
              </TableCell>
              <TableCell className="p-4">
                <div className="flex items-center gap-2">
                  {getTypeIcon(log.type)}
                  <span className="text-sm">{log.type}</span>
                </div>
              </TableCell>
              <TableCell className="p-4 text-sm">
                {formatEnumLabel(log.category)}
              </TableCell>
              <TableCell className="p-4 text-sm max-w-xs whitespace-pre-line wrap-break-word">
                {log.description}
              </TableCell>

              <TableCell className="p-4 text-sm">{log.actorName}</TableCell>
              <TableCell className="p-4 text-sm">
                {format(new Date(log.createdAt), "MMM dd, yyyy")}
              </TableCell>
              <TableCell className="p-4">
                <Badge className={getStatusColor(log.status)}>
                  {log.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
              No logs found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
