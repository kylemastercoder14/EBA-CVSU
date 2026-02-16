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
import { LogRecord, LogStatus, LogType } from "./types";

interface LogsRecordsTableProps {
  logs: LogRecord[];
}

export const LogsRecordsTable = ({ logs }: LogsRecordsTableProps) => {
  const getTypeIcon = (type: LogType) => {
    switch (type) {
      case "Order":
        return <IconShoppingCart className="h-4 w-4" />;
      case "Payment":
        return <IconCreditCard className="h-4 w-4" />;
      case "Activity":
        return <IconActivity className="h-4 w-4" />;
      case "System":
        return <IconAlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: LogStatus) => {
    switch (status) {
      case "Success":
        return "bg-green-500 hover:bg-green-500 text-white";
      case "Info":
        return "bg-blue-500 hover:bg-blue-500 text-white";
      case "Warning":
        return "bg-orange-400 hover:bg-orange-400 text-white";
    }
  };

  return (
    <Table>
      <TableHeader className="bg-[#07484A]">
        <TableRow className="hover:bg-[#07484A]">
          <TableHead className="px-4 text-white font-semibold">Log ID</TableHead>
          <TableHead className="px-4 text-white font-semibold">Type</TableHead>
          <TableHead className="px-4 text-white font-semibold">Category</TableHead>
          <TableHead className="px-4 text-white font-semibold">Description</TableHead>
          <TableHead className="px-4 text-white font-semibold">User</TableHead>
          <TableHead className="px-4 text-white font-semibold">Timestamp</TableHead>
          <TableHead className="px-4 text-white font-semibold">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.length > 0 ? (
          logs.map((log) => (
            <TableRow key={log.id} className="hover:bg-gray-50">
              <TableCell className="p-4 text-base font-medium">{log.logId}</TableCell>
              <TableCell className="p-4">
                <div className="flex items-center gap-2">
                  {getTypeIcon(log.type)}
                  <span className="text-base">{log.type}</span>
                </div>
              </TableCell>
              <TableCell className="p-4 text-base">{log.category}</TableCell>
              <TableCell className="p-4 text-base max-w-md">{log.description}</TableCell>
              <TableCell className="p-4 text-base">{log.user}</TableCell>
              <TableCell className="p-4 text-base">{log.timestamp}</TableCell>
              <TableCell className="p-4">
                <Badge className={getStatusColor(log.status)}>{log.status}</Badge>
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
