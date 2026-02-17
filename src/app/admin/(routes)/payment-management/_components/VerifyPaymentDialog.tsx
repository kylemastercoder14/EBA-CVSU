import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Payment } from "./types";

interface VerifyPaymentDialogProps {
  isOpen: boolean;
  payment: Payment | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export const VerifyPaymentDialog = ({
  isOpen,
  payment,
  onOpenChange,
  onConfirm,
  isPending = false,
}: VerifyPaymentDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#D3E9FF] border-2 border-[#07484A]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-[#07484A]">
            Verify Payment
          </DialogTitle>
          <DialogDescription className="text-[#07484A]/70">
            Confirm that you want to verify this payment transaction.
          </DialogDescription>
        </DialogHeader>
        {payment && (
          <div className="grid gap-3 py-4">
            <div className="bg-white/50 p-4 rounded-lg border border-[#07484A]/20">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[#07484A]/70">Order Number</p>
                  <p className="font-semibold text-[#07484A]">{payment.orderNum}</p>
                </div>
                <div>
                  <p className="text-[#07484A]/70">Customer Name</p>
                  <p className="font-semibold text-[#07484A]">{payment.name}</p>
                </div>
                <div>
                  <p className="text-[#07484A]/70">Amount</p>
                  <p className="font-semibold text-[#07484A]">₱{payment.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[#07484A]/70">Reference Number</p>
                  <p className="font-semibold text-[#07484A]">{payment.reference}</p>
                </div>
              </div>
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
            onClick={onConfirm}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isPending ? "Verifying..." : "Verify Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
