import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Order } from "./types";

interface ConfirmOrderDialogProps {
  isOpen: boolean;
  order: Order | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export const ConfirmOrderDialog = ({
  isOpen,
  order,
  onOpenChange,
  onConfirm,
  isPending = false,
}: ConfirmOrderDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#D3E9FF] border-2 border-[#07484A]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-[#07484A]">
            Confirm Order
          </DialogTitle>
          <DialogDescription className="text-[#07484A]/70">
            Confirm that this order is ready to proceed to payment.
          </DialogDescription>
        </DialogHeader>
        {order && (
          <div className="grid gap-3 py-4">
            <div className="bg-white/50 p-4 rounded-lg border border-[#07484A]/20">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[#07484A]/70">Order Number</p>
                  <p className="font-semibold text-[#07484A]">{order.orderNum}</p>
                </div>
                <div>
                  <p className="text-[#07484A]/70">Customer Name</p>
                  <p className="font-semibold text-[#07484A]">{order.name}</p>
                </div>
                <div>
                  <p className="text-[#07484A]/70">Items</p>
                  <p className="font-semibold text-[#07484A]">{order.items}</p>
                </div>
                <div>
                  <p className="text-[#07484A]/70">Quantity</p>
                  <p className="font-semibold text-[#07484A]">{order.quantity}</p>
                </div>
                <div>
                  <p className="text-[#07484A]/70">Pickup Date</p>
                  <p className="font-semibold text-[#07484A]">{order.pickupDate}</p>
                </div>
                <div>
                  <p className="text-[#07484A]/70">Payment Method</p>
                  <p className="font-semibold text-[#07484A]">{order.paymentMethod}</p>
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
            className="bg-[#07484A] hover:bg-[#07484A]/90 text-white"
          >
            {isPending ? "Confirming..." : "Confirm Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
