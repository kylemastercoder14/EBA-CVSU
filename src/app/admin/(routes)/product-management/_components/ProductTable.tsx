import { Button } from "@/components/ui/button";
import { Edit2Icon, Trash2Icon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Product } from "./types";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export const ProductTable = ({
  products,
  onEdit,
  onDelete,
}: ProductTableProps) => {
  return (
    <Table>
      <TableHeader className="bg-[#07484A]">
        <TableRow className="hover:bg-[#07484A]">
          <TableHead className="px-4 text-white font-semibold">Image</TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Product Name
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Category
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Variants/Sizes
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Price Range
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Visitor Orderable
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Status
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            Action
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.length > 0 ? (
          products.map((product) => {
            const prices = product.variants.map((v) => v.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const priceDisplay =
              minPrice === maxPrice
                ? `₱ ${minPrice.toFixed(2)}`
                : `₱ ${minPrice.toFixed(2)} - ₱ ${maxPrice.toFixed(2)}`;

            return (
              <TableRow key={product.id} className="hover:bg-[#C5E3FF]">
                <TableCell className="p-4">
                  <div className="size-15 bg-white/30 border-2 border-[#07484A] relative rounded flex items-center justify-center text-2xl">
                    {product.image ? (
                      <Image
                        priority
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-[#07484A]/30 text-sm">
                        No image
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="p-4 text-base font-medium">
                  {product.name}
                </TableCell>
                <TableCell className="p-4 text-base">
                  {product.category}
                </TableCell>
                <TableCell className="p-4 text-base">
                  <div className="flex flex-wrap gap-1">
                    {product.variants.map((variant, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-white px-2 py-1 rounded border border-[#07484A]/20"
                      >
                        {variant.size}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="p-4 text-base">{priceDisplay}</TableCell>
                <TableCell className="p-4 text-base">
                  <Badge variant={product.isVisitorOrderable ? "completed" : "destructive"}>{product.isVisitorOrderable ? "Yes" : "No"}</Badge>
                </TableCell>
                <TableCell className="p-4 text-base">
                  <Badge variant={product.isActive ? "completed" : "destructive"}>{product.isActive ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="p-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEdit(product)}
                      className="bg-white border-[#07484A] text-[#07484A] hover:bg-[#07484A] hover:text-white"
                    >
                      <Edit2Icon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onDelete(product)}
                      className="bg-white border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell
              colSpan={8}
              className="text-center py-8 text-[#07484A]/70"
            >
              No products found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
