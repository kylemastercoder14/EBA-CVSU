import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export interface StaffFormValues {
  fullName: string;
  accessKey: string;
  mobileNumber: string;
  isActive: boolean;
}

interface StaffDialogProps {
  isOpen: boolean;
  mode: "create" | "update";
  values: StaffFormValues;
  onOpenChange: (open: boolean) => void;
  onChange: (field: keyof StaffFormValues, value: string | boolean) => void;
  onSave: () => void;
  isPending?: boolean;
}

export const StaffDialog = ({
  isOpen,
  mode,
  values,
  onOpenChange,
  onChange,
  onSave,
  isPending,
}: StaffDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#D3E9FF] border-2 border-[#07484A]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-[#07484A]">
            {mode === "create" ? "Add Staff Member" : "Update Staff Member"}
          </DialogTitle>
          <DialogDescription className="text-[#07484A]/70">
            {mode === "create"
              ? "Create a new staff account profile."
              : "Update the selected staff account details."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label className="text-[#07484A] font-medium">Full Name</Label>
            <Input
              value={values.fullName}
              onChange={(e) => onChange("fullName", e.target.value)}
              placeholder="Enter full name"
              className="bg-white border-[#07484A]/30"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-[#07484A] font-medium">Access Key</Label>
            <Input
              value={values.accessKey}
              readOnly
              placeholder="System generated"
              className="bg-white border-[#07484A]/30"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-[#07484A] font-medium">Mobile Number</Label>
            <Input
              value={values.mobileNumber}
              onChange={(e) => onChange("mobileNumber", e.target.value)}
              placeholder="Enter mobile number"
              className="bg-white border-[#07484A]/30"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#07484A]/20 bg-white/60 px-3 py-2">
            <Label className="text-[#07484A] font-medium">Active Account</Label>
            <Switch
              checked={values.isActive}
              onCheckedChange={(checked) => onChange("isActive", checked)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#07484A] text-[#07484A] hover:bg-[#07484A]/10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={onSave}
            className="bg-[#07484A] hover:bg-[#07484A]/90 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === "create" ? "Creating..." : "Updating..."}
              </>
            ) : mode === "create" ? (
              "Add Staff"
            ) : (
              "Update Staff"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
