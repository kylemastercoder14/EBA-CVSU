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
import { AlertTriangle } from "lucide-react";

import { Payment } from "./types";

interface DeclinePaymentDialogProps {
  isOpen: boolean;
  payment: Payment | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
}

export const DeclinePaymentDialog = ({
  isOpen,
  payment,
  onOpenChange,
  onConfirm,
  isPending = false,
}: DeclinePaymentDialogProps) => {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        key={`${payment?.id ?? "no-payment"}-${isOpen ? "open" : "closed"}`}
        className="bg-[#D3E9FF] border-2 border-[#07484A]"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-[#07484A]">
            Decline Payment
          </DialogTitle>
          <DialogDescription className="text-[#07484A]/70">
            Declining this payment will cancel the order.
          </DialogDescription>
        </DialogHeader>
        {payment && (
          <div className="grid gap-3 py-4">
            <div className="rounded-lg border border-red-300/40 bg-red-50/70 p-4 text-sm text-red-700">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                This action cannot be undone from this screen.
              </div>
              <p>
                Order <span className="font-semibold">{payment.orderNum}</span> will be marked
                as cancelled if you decline this payment.
              </p>
            </div>
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
                  <p className="font-semibold text-[#07484A]">
                    ₱{payment.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[#07484A]/70">Reference Number</p>
                  <p className="font-semibold text-[#07484A]">{payment.reference}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/50 p-4 rounded-lg border border-[#07484A]/20">
              <label
                htmlFor="decline-payment-reason"
                className="mb-2 block text-sm font-semibold text-[#07484A]"
              >
                Decline Reason (will be included in SMS)
              </label>
              <textarea
                id="decline-payment-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={isPending}
                placeholder="Example: Invalid GCash reference number"
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
            Back
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isPending ? "Declining..." : "Decline Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
