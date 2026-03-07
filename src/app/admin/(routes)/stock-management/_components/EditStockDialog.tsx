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
  editValues: Array<{
    id: string;
    variant: string | null;
    minStock: number;
    maxStock: number;
    currentStock: number;
  }>;
  onOpenChange: (open: boolean) => void;
  onUpdateValue: (
    id: string,
    field: "minStock" | "maxStock" | "currentStock",
    value: number,
  ) => void;
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
      <DialogContent className="bg-[#D3E9FF] border-2 max-w-4xl! border-[#07484A]">
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
              <p className="text-sm text-[#07484A]">
                <span className="font-semibold">Variants:</span>{" "}
                {editingItem?.variants.length ?? 0}
              </p>
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto pr-1">
            <div className="grid gap-4">
              {editValues.map((stock) => (
                <div
                  key={stock.id}
                  className="rounded-lg border border-[#07484A]/20 bg-white/40 p-3"
                >
                  <p className="text-sm font-semibold text-[#07484A] mb-3">
                    {stock.variant ? `Variant: ${stock.variant}` : "Default Stock"}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label
                        htmlFor={`minStock-${stock.id}`}
                        className="text-[#07484A] font-medium"
                      >
                        Minimum Stock
                      </Label>
                      <Input
                        id={`minStock-${stock.id}`}
                        type="number"
                        value={stock.minStock}
                        onChange={(e) =>
                          onUpdateValue(
                            stock.id,
                            "minStock",
                            parseInt(e.target.value, 10) || 0,
                          )
                        }
                        className="bg-white border-[#07484A]/30"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label
                        htmlFor={`maxStock-${stock.id}`}
                        className="text-[#07484A] font-medium"
                      >
                        Maximum Stock
                      </Label>
                      <Input
                        id={`maxStock-${stock.id}`}
                        type="number"
                        value={stock.maxStock}
                        onChange={(e) =>
                          onUpdateValue(
                            stock.id,
                            "maxStock",
                            parseInt(e.target.value, 10) || 0,
                          )
                        }
                        className="bg-white border-[#07484A]/30"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2 mt-3">
                    <Label
                      htmlFor={`currentStock-${stock.id}`}
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
                          onUpdateValue(
                            stock.id,
                            "currentStock",
                            Math.max(0, stock.currentStock - 1),
                          )
                        }
                        className="bg-white border-[#07484A] text-[#07484A] hover:bg-[#07484A] hover:text-white"
                      >
                        <Minus />
                      </Button>
                      <Input
                        id={`currentStock-${stock.id}`}
                        type="number"
                        value={stock.currentStock}
                        onChange={(e) =>
                          onUpdateValue(
                            stock.id,
                            "currentStock",
                            parseInt(e.target.value, 10) || 0,
                          )
                        }
                        className="bg-white border-[#07484A]/30 text-center"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() =>
                          onUpdateValue(stock.id, "currentStock", stock.currentStock + 1)
                        }
                        className="bg-white border-[#07484A] text-[#07484A] hover:bg-[#07484A] hover:text-white"
                      >
                        <PlusIcon />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
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
