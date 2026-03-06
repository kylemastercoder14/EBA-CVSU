"use client";

import { Heading } from "@/components/Heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { StaffDialog, StaffFormValues } from "./StaffDialog";
import { DeleteStaffDialog } from "./DeleteStaffDialog";
import { StaffPagination } from "./StaffPagination";
import { StaffSearchBar } from "./StaffSearchBar";
import { StaffTable } from "./StaffTable";
import { Staff } from "./types";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";
import { TablePrintButton } from "@/components/admin/TablePrintButton";

type StaffSortOption = "name_asc" | "id_asc" | "access_key_asc" | "created_desc";

const defaultFormValues: StaffFormValues = {
  fullName: "",
  accessKey: "",
  mobileNumber: "",
  isActive: true,
};

export const StaffClient = () => {
  const queryClient = useQueryClient();
  const {
    data: { staff: initialStaff },
  } = useSuspenseQuery(orpc.staff.list.queryOptions());
  const [staffData, setStaffData] = useState<Staff[]>(initialStaff);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<StaffSortOption>("name_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "update">("create");
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formValues, setFormValues] = useState<StaffFormValues>(defaultFormValues);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);

  const createStaffMutation = useMutation(
    orpc.staff.create.mutationOptions({
      onSuccess: (createdStaff) => {
        setStaffData((prev) => [createdStaff, ...prev]);
        queryClient.invalidateQueries({
          queryKey: orpc.staff.list.queryKey(),
        });
        toast.success(`Staff "${createdStaff.fullName}" created successfully`);
        setIsDialogOpen(false);
        setEditingStaff(null);
        setFormValues({
          ...defaultFormValues,
          accessKey: "",
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create staff. Please try again");
      },
    }),
  );

  const updateStaffMutation = useMutation(
    orpc.staff.update.mutationOptions({
      onSuccess: (updatedStaff) => {
        setStaffData((prev) =>
          prev.map((staff) => (staff.id === updatedStaff.id ? updatedStaff : staff)),
        );
        queryClient.invalidateQueries({
          queryKey: orpc.staff.list.queryKey(),
        });
        toast.success(`Staff "${updatedStaff.fullName}" updated successfully`);
        setIsDialogOpen(false);
        setEditingStaff(null);
        setFormValues({
          ...defaultFormValues,
          accessKey: "",
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update staff. Please try again");
      },
    }),
  );

  const deleteStaffMutation = useMutation(
    orpc.staff.delete.mutationOptions({
      onSuccess: (result) => {
        setStaffData((prev) => prev.filter((staff) => staff.id !== result.id));
        queryClient.invalidateQueries({
          queryKey: orpc.staff.list.queryKey(),
        });
        toast.success(result.message || "Staff deleted successfully");
        setIsDeleteDialogOpen(false);
        setStaffToDelete(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete staff. Please try again");
      },
    }),
  );

  const filteredStaff = useMemo(() => {
    const keyword = searchQuery.toLowerCase();
    return staffData.filter((staff) => {
      return (
        staff.id.toLowerCase().includes(keyword) ||
        staff.fullName.toLowerCase().includes(keyword) ||
        staff.accessKey.toLowerCase().includes(keyword) ||
        staff.role.toLowerCase().includes(keyword)
      );
    });
  }, [searchQuery, staffData]);

  const sortedStaff = useMemo(() => {
    const data = [...filteredStaff];
    data.sort((a, b) => {
      switch (sortBy) {
        case "id_asc":
          return a.id.localeCompare(b.id);
        case "access_key_asc":
          return a.accessKey.localeCompare(b.accessKey);
        case "created_desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "name_asc":
        default:
          return a.fullName.localeCompare(b.fullName);
      }
    });
    return data;
  }, [filteredStaff, sortBy]);

  const totalPages = Math.ceil(sortedStaff.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStaff = sortedStaff.slice(startIndex, endIndex);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value as StaffSortOption);
    setCurrentPage(1);
  };

  const handleAddStaff = () => {
    setDialogMode("create");
    setEditingStaff(null);
    setFormValues({
      ...defaultFormValues,
      accessKey: generateAccessKey(),
    });
    setIsDialogOpen(true);
  };

  const handleEditStaff = (staff: Staff) => {
    setDialogMode("update");
    setEditingStaff(staff);
    setFormValues({
      fullName: staff.fullName,
      accessKey: staff.accessKey,
      mobileNumber: staff.mobileNumber,
      isActive: staff.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteStaff = (staff: Staff) => {
    setStaffToDelete(staff);
    setIsDeleteDialogOpen(true);
  };

  const handleFormChange = (
    field: keyof StaffFormValues,
    value: string | boolean,
  ) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const generateAccessKey = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let suffix = "";

    do {
      suffix = Array.from({ length: 5 })
        .map(() => chars[Math.floor(Math.random() * chars.length)])
        .join("");
    } while (staffData.some((staff) => staff.accessKey === `EBA-2026-${suffix}`));

    return `EBA-2026-${suffix}`;
  };

  const handleSaveStaff = () => {
    if (!formValues.fullName || !formValues.mobileNumber) {
      return;
    }

    if (dialogMode === "create") {
      createStaffMutation.mutate({
        fullName: formValues.fullName.trim(),
        accessKey: formValues.accessKey,
        mobileNumber: formValues.mobileNumber.trim(),
        isActive: formValues.isActive,
      });
    } else if (editingStaff) {
      updateStaffMutation.mutate({
        id: editingStaff.id,
        fullName: formValues.fullName.trim(),
        mobileNumber: formValues.mobileNumber.trim(),
        isActive: formValues.isActive,
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!staffToDelete) {
      return;
    }
    deleteStaffMutation.mutate({
      id: staffToDelete.id,
    });
  };

  return (
    <div>
      <div className="flex items-center flex-wrap gap-5 justify-between">
        <Heading
          title="Staff Management"
          description="Manage staff accounts, system access keys, and status"
        />
        <Button
          size="lg"
          className="bg-[#07484A] hover:bg-[#07484A]/90"
          onClick={handleAddStaff}
        >
          <PlusIcon className="size-4.5" />
          Add Staff
        </Button>
      </div>

      <div className="mt-10">
        <Card className="border-2 gap-0! border-[#07484A] bg-[#D3E9FF]">
          <CardHeader className="pb-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
              <StaffSearchBar value={searchQuery} onChange={handleSearchChange} />
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="h-12! w-full bg-white border-none">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                  <SelectItem value="id_asc">Staff ID (A-Z)</SelectItem>
                  <SelectItem value="access_key_asc">Access Key (A-Z)</SelectItem>
                  <SelectItem value="created_desc">Newest Added</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 flex justify-end">
              <TablePrintButton targetId="admin-staff-table" title="Staff Management" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div id="admin-staff-table">
              <StaffTable
                staff={currentStaff}
                onEdit={handleEditStaff}
                onDelete={handleDeleteStaff}
              />
            </div>
            <StaffPagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredStaff.length}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </CardContent>
        </Card>
      </div>

      <StaffDialog
        isOpen={isDialogOpen}
        mode={dialogMode}
        values={formValues}
        onOpenChange={setIsDialogOpen}
        onChange={handleFormChange}
        onSave={handleSaveStaff}
        isPending={createStaffMutation.isPending || updateStaffMutation.isPending}
      />

      <DeleteStaffDialog
        isOpen={isDeleteDialogOpen}
        staffName={staffToDelete?.fullName}
        isPending={deleteStaffMutation.isPending}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
