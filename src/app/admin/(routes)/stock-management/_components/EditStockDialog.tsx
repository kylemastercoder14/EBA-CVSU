import { Button } from "@/components/ui/button";
import { Loader2, Minus, PlusIcon } from "lucide-react";
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
import { StockItem } from "./types";

interface EditStockDialogProps {
  isOpen: boolean;
  editingItem: StockItem | null;
  isPending?: boolean;
  editValues: {
    minStock: number;
    maxStock: number;
    currentStock: number;
  };
  onOpenChange: (open: boolean) => void;
  onUpdateValue: (field: "minStock" | "maxStock" | "currentStock", value: number) => void;
  onSave: () => void;
}

export const EditStockDialog = ({
  isOpen,
  editingItem,
  editValues,
  isPending,
  onOpenChange,
  onUpdateValue,
  onSave,
}: EditStockDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#D3E9FF] border-2 border-[#07484A]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-[#07484A]">
            Edit Stock
          </DialogTitle>
          <DialogDescription className="text-[#07484A]/70">
            Update stock levels and thresholds for {editingItem?.productName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label
              htmlFor="productInfo"
              className="text-[#07484A] font-medium"
            >
              Product Information
            </Label>
            <div className="bg-white/50 p-3 rounded-lg border border-[#07484A]/20">
              <p className="text-sm text-[#07484A]">
                <span className="font-semibold">ID:</span>{" "}
                {editingItem?.productId}
              </p>
              <p className="text-sm text-[#07484A]">
                <span className="font-semibold">Product Name:</span>{" "}
                {editingItem?.productName}
              </p>
              <p className="text-sm text-[#07484A]">
                <span className="font-semibold">Category:</span>{" "}
                {editingItem?.category}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label
                htmlFor="minStock"
                className="text-[#07484A] font-medium"
              >
                Minimum Stock
              </Label>
              <Input
                id="minStock"
                type="number"
                value={editValues.minStock}
                onChange={(e) =>
                  onUpdateValue("minStock", parseInt(e.target.value) || 0)
                }
                className="bg-white border-[#07484A]/30"
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="maxStock"
                className="text-[#07484A] font-medium"
              >
                Maximum Stock
              </Label>
              <Input
                id="maxStock"
                type="number"
                value={editValues.maxStock}
                onChange={(e) =>
                  onUpdateValue("maxStock", parseInt(e.target.value) || 0)
                }
                className="bg-white border-[#07484A]/30"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="currentStock"
              className="text-[#07484A] font-medium"
            >
              Current Stock
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() =>
                  onUpdateValue("currentStock", editValues.currentStock - 1)
                }
                className="bg-white border-[#07484A] text-[#07484A] hover:bg-[#07484A] hover:text-white"
              >
                <Minus />
              </Button>
              <Input
                id="currentStock"
                type="number"
                value={editValues.currentStock}
                onChange={(e) =>
                  onUpdateValue(
                    "currentStock",
                    parseInt(e.target.value) || 0,
                  )
                }
                className="bg-white border-[#07484A]/30 text-center"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() =>
                  onUpdateValue("currentStock", editValues.currentStock + 1)
                }
                className="bg-white border-[#07484A] text-[#07484A] hover:bg-[#07484A] hover:text-white"
              >
                <PlusIcon />
              </Button>
            </div>
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
            onClick={onSave}
            disabled={isPending}
            className="bg-[#07484A] hover:bg-[#07484A]/90 text-white"
          >
            {isPending && <Loader2 className='animate-spin size-4' />}
            {isPending ? "Saving changes..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
