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

interface ProductDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProductDialog = ({ isOpen, onOpenChange }: ProductDialogProps) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      category: "",
      imageUrl: undefined,
      variants: [{ size: "", price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const createProductMutation = useMutation(
    orpc.product.create.mutationOptions({
      onSuccess: (newProduct) => {
        toast.success(`Product "${newProduct.name}" created successfully`);
        queryClient.invalidateQueries({
          queryKey: orpc.product.list.queryKey(),
        });
        form.reset();
        onOpenChange(false);
        setImagePreview(null)
      },
      onError: (error) => {
        toast.error(
          error.message || "Failed to create product. Please try again",
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
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: ProductFormValues) => {
    createProductMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl! bg-[#D3E9FF] max-h-[90vh]! overflow-y-auto! border-2 border-[#07484A]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-[#07484A]">
            Add New Product
          </DialogTitle>
          <DialogDescription className="text-[#07484A]/70">
            Fill in the product details below to add a new item to your
            inventory.
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
                      defaultValue={field.value}
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

                <div className="space-y-3 max-h-75 overflow-y-auto pr-2">
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

              {/* Image URL */}
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
                disabled={createProductMutation.isPending}
                className="border-[#07484A] text-[#07484A] hover:bg-[#07484A]/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProductMutation.isPending}
                className="bg-[#07484A] hover:bg-[#07484A]/90 text-white"
              >
                {createProductMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Add Product"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
