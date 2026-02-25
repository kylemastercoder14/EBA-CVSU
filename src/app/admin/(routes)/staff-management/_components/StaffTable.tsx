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
import { EditIcon, Trash2Icon } from "lucide-react";
import { Staff } from "./types";
import { formatEnumLabel } from "@/lib/utils";

interface StaffTableProps {
  staff: Staff[];
  isLoading?: boolean;
  onEdit: (staff: Staff) => void;
  onDelete: (staff: Staff) => void;
}

export const StaffTable = ({
  staff,
  isLoading = false,
  onEdit,
  onDelete,
}: StaffTableProps) => {
  const skeletonRows = 4;
  return (
    <Table>
      <TableHeader className="bg-[#07484A]">
        <TableRow className="hover:bg-[#07484A]">
          <TableHead className="px-4 text-white font-semibold">Staff ID</TableHead>
          <TableHead className="px-4 text-white font-semibold">Name</TableHead>
          <TableHead className="px-4 text-white font-semibold">Role</TableHead>
          <TableHead className="px-4 text-white font-semibold">Access Key</TableHead>
          <TableHead className="px-4 text-white font-semibold">Mobile</TableHead>
          <TableHead className="px-4 text-white font-semibold">Status</TableHead>
          <TableHead className="px-4 text-white font-semibold">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: skeletonRows }).map((_, index) => (
            <TableRow key={`staff-skeleton-${index}`} className="hover:bg-transparent">
              <TableCell className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-4 w-32 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-4 w-28 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-4 w-24 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-6 w-18 animate-pulse rounded-full bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4">
                <div className="flex gap-2">
                  <div className="h-9 w-9 animate-pulse rounded-md bg-[#07484A]/12" />
                  <div className="h-9 w-9 animate-pulse rounded-md bg-[#07484A]/10" />
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : staff.length > 0 ? (
          staff.map((member) => (
            <TableRow key={member.id} className="hover:bg-[#C5E3FF]">
              <TableCell className="p-4 text-sm">{member.id}</TableCell>
              <TableCell className="p-4 text-sm font-medium">
                {member.fullName}
              </TableCell>
              <TableCell className="p-4 text-sm">
                {formatEnumLabel(member.role)}
              </TableCell>
              <TableCell className="p-4 text-sm font-medium">{member.accessKey}</TableCell>
              <TableCell className="p-4 text-sm">{member.mobileNumber}</TableCell>
              <TableCell className="p-4 text-sm">
                <Badge variant={member.isActive ? "completed" : "destructive"}>
                  {member.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="p-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onEdit(member)}
                    className="bg-white border-[#07484A] text-[#07484A] hover:bg-[#07484A] hover:text-white"
                  >
                    <EditIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onDelete(member)}
                    className="bg-white border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-[#07484A]/70">
              No staff found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
