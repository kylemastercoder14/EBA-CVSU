import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { StockItem } from "./types";

interface LowStockAlertProps {
  criticalItems: StockItem[];
  totalLowStock: number;
}

export const LowStockAlert = ({ criticalItems, totalLowStock }: LowStockAlertProps) => {
  if (totalLowStock === 0) return null;

  return (
    <Alert className="mt-6 bg-orange-900/10 border-2 border-[#D87300]">
      <div className="bg-[#D8730030] flex size-10 items-center justify-center rounded-md">
        <AlertTriangle className="size-6 text-orange-500" />
      </div>
      <AlertDescription>
        <div className="ml-15">
          <p className="font-semibold font-serif text-[#D87300] text-base">
            Low Stock Alert
          </p>
          <p className="text-[#d87300c4] text-sm mb-2">
            {criticalItems.length} items need restocking
          </p>
          <div className="flex flex-wrap gap-2">
            {criticalItems.map((item) => (
              <Badge
                key={item.id}
                variant="secondary"
                className="bg-[#3332301e] border border-[#D87300] text-[#D87300]"
              >
                {item.productName} ({item.currentStock} stock)
              </Badge>
            ))}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
