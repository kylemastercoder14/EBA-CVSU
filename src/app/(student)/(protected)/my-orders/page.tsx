"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { EditIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCart } from "@/hooks/use-cart";
import { orpc } from "@/lib/orpc";

const formatPickupDate = (dateText: string) => {
  if (!dateText) return "-";

  const parsed = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateText;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const Page = () => {
  const router = useRouter();
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const items = useCart((state) => state.items);
  const removeItem = useCart((state) => state.removeItem);

  const { data } = useQuery(orpc.product.list.queryOptions());
  const products = useMemo(() => data?.products ?? [], [data?.products]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = products.find(
        (productItem) => productItem.id === item.productId,
      );
      const variant = product?.variants.find((v) => v.size === item.variant);
      const unitPrice = variant?.price ?? 0;
      return sum + unitPrice * item.quantity;
    }, 0);
  }, [items, products]);

  const handleProceed = () => {
    if (!acceptedTerms) {
      toast.error("Please accept Terms and Conditions first.");
      return;
    }

    router.push("/payment-method");
  };

  return (
    <main className="relative h-dvh overflow-hidden bg-[#C9D6E2]">
      <section className="h-full overflow-y-auto px-3 pt-3 pb-64 sm:px-4 sm:pt-4 sm:pb-70">
        <div className="space-y-3 rounded-xl bg-[#B8C9D7] p-3 sm:p-4">
          {items.length === 0 && (
            <div className="rounded-2xl bg-[#D9E2EA] p-6 text-center">
              <p className="text-xl font-semibold text-[#0B525B]">
                Your cart is empty.
              </p>
              <p className="mt-2 text-[#2A6570]">
                Add products first to create an order.
              </p>
              <Button
                type="button"
                onClick={() => router.push("/products")}
                className="mt-4 rounded-full bg-[#075A5C] px-7"
              >
                Browse Products
              </Button>
            </div>
          )}

          {items.map((item) => {
            const product = products.find(
              (productItem) => productItem.id === item.productId,
            );
            const variant = product?.variants.find(
              (v) => v.size === item.variant,
            );
            const unitPrice = variant?.price ?? 0;
            const imageSrc = product?.image ?? "";
            const hasImage = Boolean(imageSrc);

            return (
              <article
                key={`${item.productId}-${item.variant}-${item.pickupDate}`}
                className="flex gap-3 rounded-2xl border-b border-[#D5E0EA] pb-3 last:border-b-0 last:pb-0"
              >
                <div className="relative h-22 w-22 shrink-0 overflow-hidden rounded-3xl bg-[#E6E8EA]">
                  {hasImage ? (
                    <Image
                      src={imageSrc}
                      alt={item.productName}
                      fill
                      className="object-contain p-1"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[#6D7D89]">
                      No image
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-1 font-serif text-2xl leading-[1.03] text-[#0A535B]">
                    {item.productName}
                  </h2>
                  <p className="text-lg leading-tight text-[#2F6F79]">
                    Size: {item.variant}
                  </p>
                  <p className="text-lg leading-tight text-[#2F6F79]">
                    Quantity: {item.quantity}
                  </p>
                  <p className="text-lg leading-tight text-[#2F6F79]">
                    Pickup: {formatPickupDate(item.pickupDate)}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => router.push(`/products/${item.productId}`)}
                      className="h-8 rounded-full bg-[#065257] px-5 text-lg font-semibold hover:bg-[#05494D]"
                    >
                      <EditIcon className="size-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      onClick={() =>
                        removeItem({
                          productId: item.productId,
                          variant: item.variant,
                          pickupDate: item.pickupDate,
                        })
                      }
                      className="h-8 rounded-full bg-[#FF2E2E] px-5 text-lg font-semibold text-white hover:bg-[#ED1B1B]"
                    >
                      <Trash2Icon className="size-4" />
                      Remove
                    </Button>
                  </div>

                  {unitPrice > 0 && (
                    <p className="mt-2 text-xl text-[#1E5763]">
                      Item total: PHP {formatMoney(unitPrice * item.quantity)}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="absolute inset-x-0 bottom-0 border-t border-[#A3B9CA] bg-[#B8C9D7] p-3 sm:p-4">
        <p className="text-2xl font-bold text-[#0B525B]">
          Total: PHP {formatMoney(totalAmount)}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <Checkbox
            id="terms-and-conditions"
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(Boolean(checked))}
            className="size-5 border-[#2A7A9C] data-[state=checked]:border-[#2A7A9C] data-[state=checked]:bg-[#8CD8FF] data-[state=checked]:text-[#0E5260]"
          />
          <label
            htmlFor="terms-and-conditions"
            className="text-lg text-[#216270]"
          >
            I accept the{" "}
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="cursor-pointer text-[#00A02A] underline underline-offset-2"
                >
                  Terms and Conditions
                </button>
              </DialogTrigger>
              <DialogContent
                showCloseButton={false}
                className="max-w-2xl! overflow-hidden rounded-[40px] border-none bg-[#2A2A2F] p-0 text-white"
              >
                <DialogHeader className="space-y-0 border-b border-[#4B4B4F] px-8 pt-4 pb-4 text-left">
                  <DialogTitle className="text-3xl font-bold text-white">
                    Terms and Conditions
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Terms and conditions for kiosk orders.
                  </DialogDescription>
                </DialogHeader>

                <div className="max-h-[65vh] no-scrollbar space-y-5 overflow-y-auto px-8 py-2">
                  <p className="text-2xl font-semibold text-[#F4F4F6]">
                    EBA Uniform Ordering Terms and Conditions
                  </p>

                  <div>
                    <h3 className="text-xl font-bold">1. Order Placement</h3>
                    <p className="text-base leading-7 text-[#E2E2E2]">
                      By submitting an order through our website, you confirm
                      that all information provided - including your full name,
                      contact number, and selected pickup schedule - is accurate
                      and complete. All orders are subject to product
                      availability and confirmation by EBA.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold">2. Payment Terms</h3>
                    <p className="text-base leading-7 text-[#E2E2E2]">
                      Payment must be completed at the time of placing your
                      order. We accept GCash and Cash payments. For GCash
                      payments, a valid reference number must be provided as
                      proof of payment. Orders will not be processed without
                      payment verification. For Cash payments, the amount must be
                      paid in full at the EBA office during your scheduled
                      pickup. Failure to complete payment may result in order
                      cancellation.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold">3. Pickup Schedule</h3>
                    <p className="text-base leading-7 text-[#E2E2E2]">
                      Customers must select a pickup date during checkout.
                      Orders must be collected at the EBA office during official
                      operating hours on the selected date. If an order is not
                      claimed on the scheduled date, EBA reserves the right to
                      reschedule or cancel the order.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold">
                      4. Returns and Exchanges
                    </h3>
                    <p className="text-base leading-7 text-[#E2E2E2]">
                      Returns and exchanges are accepted within seven (7) days
                      from the pickup date only for defective items or incorrect
                      items received. Items must be unused, in original
                      condition, and accompanied by the official receipt.
                      Requests due to incorrect size selection or change of mind
                      may be reviewed at the discretion of EBA and are not
                      guaranteed.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold">5. Size and Fit</h3>
                    <p className="text-base leading-7 text-[#E2E2E2]">
                      Customers are responsible for selecting the correct size
                      before placing an order. Size charts are provided for
                      reference. EBA is not responsible for incorrect size
                      selection made by the customer.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold">
                      6. Order Modifications and Cancellations
                    </h3>
                    <p className="text-base leading-7 text-[#E2E2E2]">
                      Requests for order modifications or cancellations must be
                      submitted within twenty-four (24) hours from the time the
                      order was placed. All modification requests are subject to
                      product availability and approval by EBA.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold">
                      7. Limitation of Liability
                    </h3>
                    <p className="text-base leading-7 text-[#E2E2E2]">
                      EBA shall not be held liable for delays, losses, or
                      damages resulting from events beyond its reasonable
                      control. EBA reserves the right to refuse service, cancel
                      orders, or correct errors in pricing or product
                      information at its discretion.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold">8. Privacy Policy</h3>
                    <p className="text-base leading-7 text-[#E2E2E2]">
                      Personal information collected through this website is used
                      solely for order processing, verification, and
                      communication purposes. EBA does not sell, trade, or share
                      personal information with third parties without customer
                      consent, except when required by law.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold">9. Contact Information</h3>
                    <p className="text-base leading-7 text-[#E2E2E2]">
                      For inquiries regarding orders, payments, or policies,
                      customers may contact the EBA office during official
                      operating hours.
                    </p>
                  </div>
                </div>

                <DialogFooter className="block p-0">
                  <DialogClose asChild>
                    <Button
                      type="button"
                      className="h-16 w-full rounded-none bg-[#10B916] text-2xl font-semibold hover:bg-[#0EA713]"
                    >
                      Close
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </label>
        </div>

        <Button
          type="button"
          disabled={items.length === 0 || !acceptedTerms}
          onClick={handleProceed}
          className="mt-4 h-13 w-full rounded-full bg-[#09BD14] text-2xl font-semibold text-white hover:bg-[#08AF12] disabled:cursor-not-allowed disabled:bg-[#7CAF83]"
        >
          Proceed
        </Button>
      </section>
    </main>
  );
};

export default Page;
