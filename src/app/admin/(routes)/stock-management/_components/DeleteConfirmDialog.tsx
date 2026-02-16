import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const DeleteConfirmDialog = ({
  isOpen,
  onOpenChange,
  onConfirm,
}: DeleteConfirmDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#D3E9FF] border-2 border-[#07484A]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-[#07484A]">
            Confirm Delete
          </DialogTitle>
          <DialogDescription className="text-[#07484A]/70">
            Are you sure you want to delete this stock item? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
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
            onClick={onConfirm}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
