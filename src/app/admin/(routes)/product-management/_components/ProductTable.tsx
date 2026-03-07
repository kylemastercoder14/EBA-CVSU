import { Button } from "@/components/ui/button";
import { EditIcon, Trash2Icon } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NO_VARIANT_SIZE } from "@/validators/products";
import { SortableHeader } from "@/components/admin/SortableHeader";

interface ProductTableProps {
  products: Product[];
  isLoading?: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  sortKey: "name_asc" | "name_desc" | "id_asc" | "id_desc" | "category_asc" | "category_desc";
  onSort: (sortKey: string) => void;
}

export const ProductTable = ({
  products,
  isLoading = false,
  onEdit,
  onDelete,
  sortKey,
  onSort,
}: ProductTableProps) => {
  const skeletonRows = 4;
  const activeSortKey = sortKey.startsWith("name")
    ? "name"
    : sortKey.startsWith("id")
      ? "id"
      : "category";
  const direction: "asc" | "desc" = sortKey.endsWith("_desc") ? "desc" : "asc";
  return (
    <Table>
      <TableHeader className="bg-[#07484A]">
        <TableRow className="hover:bg-[#07484A]">
          <TableHead className="px-4 text-white font-semibold">Image</TableHead>
          <TableHead className="px-4 text-white font-semibold">
            <SortableHeader
              label="Product Name"
              sortKey="name"
              activeSortKey={activeSortKey}
              direction={direction}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="px-4 text-white font-semibold">
            <SortableHeader
              label="Category"
              sortKey="category"
              activeSortKey={activeSortKey}
              direction={direction}
              onSort={onSort}
            />
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
        {isLoading ? (
          Array.from({ length: skeletonRows }).map((_, index) => (
            <TableRow key={`product-skeleton-${index}`} className="hover:bg-transparent">
              <TableCell className="p-4">
                <div className="size-15 animate-pulse rounded border-2 border-[#07484A]/10 bg-[#07484A]/5" />
              </TableCell>
              <TableCell className="p-4"><div className="h-4 w-28 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-4 w-20 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-6 w-40 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-4 w-32 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-6 w-14 animate-pulse rounded-full bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4"><div className="h-6 w-14 animate-pulse rounded-full bg-[#07484A]/10" /></TableCell>
              <TableCell className="p-4">
                <div className="flex gap-2">
                  <div className="h-9 w-9 animate-pulse rounded-md bg-[#07484A]/12" />
                  <div className="h-9 w-9 animate-pulse rounded-md bg-[#07484A]/10" />
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : products.length > 0 ? (
          products.map((product) => {
            const realVariants = product.variants.filter(
              (variant) => variant.size !== NO_VARIANT_SIZE,
            );
            const fallbackVariant = product.variants.find(
              (variant) => variant.size === NO_VARIANT_SIZE,
            );
            const priceVariants =
              realVariants.length > 0
                ? realVariants
                : fallbackVariant
                  ? [fallbackVariant]
                  : [];
            const hasVariants = realVariants.length > 0;
            const prices = priceVariants.map((v) => v.price);
            const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
            const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
            const priceDisplay = prices.length > 0
              ? minPrice === maxPrice
                ? `PHP ${minPrice.toFixed(2)}`
                : `PHP ${minPrice.toFixed(2)} - PHP ${maxPrice.toFixed(2)}`
              : "No price";

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
                <TableCell className="p-4 text-sm font-medium">
                  {product.name}
                </TableCell>
                <TableCell className="p-4 text-sm">
                  {product.category}
                </TableCell>
                <TableCell className="p-4 text-sm">
                  <div className="flex flex-wrap gap-1">
                    {hasVariants ? (
                      realVariants.map((variant, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-white px-2 py-1 rounded border border-[#07484A]/20"
                        >
                          {variant.size}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs italic text-[#07484A]/70">
                        No variants
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="p-4 text-sm">{priceDisplay}</TableCell>
                <TableCell className="p-4 text-sm">
                  <Badge
                    variant={
                      product.isVisitorOrderable ? "completed" : "destructive"
                    }
                  >
                    {product.isVisitorOrderable ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell className="p-4 text-sm">
                  <Badge
                    variant={product.isActive ? "completed" : "destructive"}
                  >
                    {product.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="p-4">
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onEdit(product)}
                          className="bg-white border-[#07484A] text-[#07484A] hover:bg-[#07484A] hover:text-white"
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit Product</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onDelete(product)}
                          className="bg-white border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete Product</TooltipContent>
                    </Tooltip>
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
