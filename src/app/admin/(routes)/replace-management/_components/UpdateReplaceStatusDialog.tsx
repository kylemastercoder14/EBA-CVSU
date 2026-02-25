import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReplaceRequest } from "./types";

interface UpdateReplaceStatusDialogProps {
  isOpen: boolean;
  request: ReplaceRequest | null;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  isPending?: boolean;
}

export const UpdateReplaceStatusDialog = ({
  isOpen,
  request,
  onOpenChange,
  onApprove,
  onReject,
  isPending = false,
}: UpdateReplaceStatusDialogProps) => {
  const [rejectReason, setRejectReason] = useState("");
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        key={`${request?.id ?? "no-request"}-${isOpen ? "open" : "closed"}`}
        className="bg-[#D3E9FF] border-2 border-[#07484A]"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-[#07484A]">
            Review Replace Request
          </DialogTitle>
          <DialogDescription className="text-[#07484A]/70">
            Approve or reject this replacement request.
          </DialogDescription>
        </DialogHeader>
        {request && (
          <div className="grid gap-3 py-4">
            <div className="bg-white/50 p-4 rounded-lg border border-[#07484A]/20">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[#07484A]/70">Request ID</p>
                  <p className="font-semibold text-[#07484A]">{request.id}</p>
                </div>
                <div>
                  <p className="text-[#07484A]/70">Order Number</p>
                  <p className="font-semibold text-[#07484A]">{request.orderNumber}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[#07484A]/70">Reason</p>
                  <p className="font-semibold text-[#07484A]">{request.reason}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/50 p-4 rounded-lg border border-[#07484A]/20">
              <label
                htmlFor="replace-reject-reason"
                className="mb-2 block text-sm font-semibold text-[#07484A]"
              >
                Reject Reason (for SMS if rejected)
              </label>
              <textarea
                id="replace-reject-reason"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                disabled={isPending}
                placeholder="Example: Item condition is not eligible for return"
                className="min-h-24 w-full rounded-lg border border-[#07484A]/20 bg-white px-3 py-2 text-sm text-[#07484A] outline-none ring-0 placeholder:text-[#07484A]/40"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="border-[#07484A] text-[#07484A] hover:bg-[#07484A]/10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onReject(rejectReason.trim())}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isPending ? "Updating..." : "Reject Request"}
          </Button>
          <Button
            type="button"
            onClick={onApprove}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isPending ? "Updating..." : "Approve Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
