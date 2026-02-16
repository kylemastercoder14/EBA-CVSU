/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
"use client";
import { Button } from "@/components/ui/button";
import { Loader2, PlusIcon, XIcon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";
import { productFormSchema, ProductFormValues } from "@/validators/products";
import { useEffect, useState } from "react";
import { Product } from "./types";

interface ProductDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "update";
  product?: Product; // Optional, only for update mode
}

export const ProductDialog = ({
  isOpen,
  onOpenChange,
  mode,
  product,
}: ProductDialogProps) => {
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      category: "",
      isActive: true,
      isVisitorOrderable: true,
      imageUrl: undefined,
      variants: [{ size: "", price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  // Derive image preview from props and state instead of using effect
  const imagePreview = uploadedImagePreview || (mode === "update" && product?.image) || null;

  // Set form values when editing
  useEffect(() => {
    if (mode === "update" && product && isOpen) {
      form.reset({
        name: product.name,
        category: product.category,
        isActive: product.isActive,
        isVisitorOrderable: product.isVisitorOrderable,
        imageUrl: undefined, // Will keep existing image unless changed
        variants: product.variants.map((v) => ({
          size: v.size,
          price: v.price,
        })),
      });
    } else if (mode === "create" && isOpen) {
      form.reset({
        name: "",
        category: "",
        isActive: true,
        isVisitorOrderable: true,
        imageUrl: undefined,
        variants: [{ size: "", price: 0 }],
      });
    }
  }, [mode, product, isOpen, form]);

  const createProductMutation = useMutation(
    orpc.product.create.mutationOptions({
      onSuccess: (newProduct) => {
        toast.success(`Product "${newProduct.name}" created successfully`);
        queryClient.invalidateQueries({
          queryKey: orpc.product.list.queryKey(),
        });
        form.reset();
        onOpenChange(false);
        setUploadedImagePreview(null);
      },
      onError: (error) => {
        toast.error(
          error.message || "Failed to create product. Please try again",
        );
      },
    }),
  );

  const updateProductMutation = useMutation(
    orpc.product.update.mutationOptions({
      onSuccess: (updatedProduct) => {
        toast.success(`Product "${updatedProduct.name}" updated successfully`);
        queryClient.invalidateQueries({
          queryKey: orpc.product.list.queryKey(),
        });
        form.reset();
        onOpenChange(false);
        setUploadedImagePreview(null);
      },
      onError: (error) => {
        toast.error(
          error.message || "Failed to update product. Please try again",
        );
      },
    }),
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("imageUrl", file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: ProductFormValues) => {
    if (mode === "create") {
      createProductMutation.mutate(data);
    } else {
      // For update mode, include the product ID
      updateProductMutation.mutate({
        id: product!.id,
        ...data,
      });
    }
  };

  const handleCancel = () => {
    form.reset();
    setUploadedImagePreview(null);
    onOpenChange(false);
  };

  const isLoading =
    createProductMutation.isPending || updateProductMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl! bg-[#D3E9FF] border-2 border-[#07484A]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-[#07484A]">
            {mode === "create" ? "Add New Product" : "Update Product"}
          </DialogTitle>
          <DialogDescription className="text-[#07484A]/70">
            {mode === "create"
              ? "Fill in the product details below to add a new item to your inventory."
              : "Update the product details below."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 py-4">
              {/* Product Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#07484A] font-medium">
                      Product Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter product name"
                        className="bg-white border-[#07484A]/30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#07484A] font-medium">
                      Category
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white w-full border-[#07484A]/30">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Uniforms">Uniforms</SelectItem>
                        <SelectItem value="ID Lace">ID Lace</SelectItem>
                        <SelectItem value="Booklet">Booklet</SelectItem>
                        <SelectItem value="Accessories">Accessories</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isVisitorOrderable"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-[#07484A]/20 bg-white/60 px-3 py-2">
                      <FormLabel className="text-[#07484A] font-medium cursor-pointer">
                        Visitor Orderable
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-[#07484A]/20 bg-white/60 px-3 py-2">
                      <FormLabel className="text-[#07484A] font-medium cursor-pointer">
                        Active Product
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Variants Section */}
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[#07484A] font-medium">
                    Product Variants (Sizes & Prices)
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => append({ size: "", price: 0 })}
                    className="bg-[#07484A] hover:bg-[#07484A]/90 text-white"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Variant
                  </Button>
                </div>

                <div className="space-y-3 max-h-50 overflow-y-auto pr-2">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex gap-2 items-start bg-white/50 p-3 rounded-lg border border-[#07484A]/20"
                    >
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name={`variants.${index}.size`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-[#07484A]">
                                Size
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., Small, Medium, Large"
                                  className="bg-white border-[#07484A]/30 h-9"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`variants.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-[#07484A]">
                                Price (₱)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="bg-white border-[#07484A]/30 h-9"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9 mt-6"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {form.formState.errors.variants?.root && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.variants.root.message}
                  </p>
                )}

                <p className="text-xs text-[#07484A]/60">
                  Note: Stock levels will be managed separately for each variant
                  in the Stock Management section.
                </p>
              </div>

              {/* Image Upload */}
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel className="text-[#07484A] font-medium">
                      Product Image
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          className="bg-white border-[#07484A]/30"
                          onChange={handleImageChange}
                          {...field}
                        />
                        {imagePreview && (
                          <div className="relative w-32 h-32 border-2 border-[#07484A]/20 rounded-lg overflow-hidden">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {mode === "update" && !imagePreview && product?.image && (
                          <p className="text-xs text-[#07484A]/60">
                            Current image will be kept if no new image is uploaded
                          </p>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="border-[#07484A] text-[#07484A] hover:bg-[#07484A]/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-[#07484A] hover:bg-[#07484A]/90 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === "create" ? "Creating..." : "Updating..."}
                  </>
                ) : mode === "create" ? (
                  "Add Product"
                ) : (
                  "Update Product"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
