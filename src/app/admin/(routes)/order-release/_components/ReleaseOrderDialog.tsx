import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PackageCheck } from "lucide-react";
import { Order } from "./types";

interface ReleaseOrderDialogProps {
  isOpen: boolean;
  order: Order | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const ReleaseOrderDialog = ({
  isOpen,
  order,
  onOpenChange,
  onConfirm,
}: ReleaseOrderDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#D3E9FF] border-2 border-[#07484A]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-[#07484A]">
            Release Order
          </DialogTitle>
          <DialogDescription className="text-[#07484A]/70">
            Confirm that this order is being released to the customer.
          </DialogDescription>
        </DialogHeader>
        {order && (
          <div className="grid gap-3 py-4">
            <div className="bg-white/50 p-4 rounded-lg border border-[#07484A]/20">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[#07484A]/70">Order Number</p>
                  <p className="font-semibold text-[#07484A]">{order.orderNumber}</p>
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
              </div>
            </div>
          </div>
        )}
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
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <PackageCheck className="mr-2 h-4 w-4" />
            Release Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
