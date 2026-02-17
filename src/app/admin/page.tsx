"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingBag, Lock, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

const Page = () => {
  const [open, setOpen] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const router = useRouter();

  const loginMutation = useMutation(
    orpc.auth.login.mutationOptions({
      onSuccess: (result) => {
        localStorage.setItem("eba_access_key", result.staff.accessKey);
        localStorage.setItem("eba_staff_session", JSON.stringify(result.staff));
        toast.success("Access granted!");
        setOpen(false);
        router.push("/admin/dashboard");
      },
      onError: () => {
        localStorage.removeItem("eba_access_key");
        localStorage.removeItem("eba_staff_session");
        toast.error("Access key is invalid");
      },
    }),
  );

  // Check if already authenticated
  useEffect(() => {
    const checkSession = async () => {
      const storedKey = localStorage.getItem("eba_access_key");
      if (!storedKey) return;

      try {
        const session = await orpc.auth.session.call({
          accessKey: storedKey,
        });

        if (session.loggedIn && session.staff) {
          localStorage.setItem("eba_staff_session", JSON.stringify(session.staff));
          router.push("/admin/dashboard");
          return;
        }
      } catch {
        // no-op, will clear local session below
      }

      localStorage.removeItem("eba_access_key");
      localStorage.removeItem("eba_staff_session");
    };

    checkSession();
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedKey = accessKey.trim().toUpperCase();

    if (!normalizedKey) {
      toast.error("Please enter the access key");
      return;
    }

    loginMutation.mutate({
      accessKey: normalizedKey,
    });
  };

  return (
    <div className="bg-[#07484A] min-h-screen flex items-center justify-center">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#1A1A1A] border-[#E6E6E6] text-white">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="bg-[#07484A] size-16 rounded-full flex items-center justify-center">
                <Lock className="size-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-serif text-center text-white">
              Enter Access Key
            </DialogTitle>
            <DialogDescription className="text-center text-gray-300 font-serif">
              Please enter your access key to continue to the dashboard
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-4 space-y-6">
            <div className="relative">
              <div className="text-white pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 peer-disabled:opacity-50">
                <LockKeyhole className="size-4" />
                <span className="sr-only">Access key</span>
              </div>
              <Input
                type="text"
                placeholder="Access Key"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="bg-[#2A2A2A] border-[#E6E6E6] text-white peer pl-9 placeholder:text-gray-400 h-12 text-lg"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loginMutation.isPending}
              className="w-full text-lg h-12"
            >
              Continue <ArrowRight className="size-5 ml-2" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <div className="bg-[#1A1A1A] p-20 border border-[#E6E6E6] rounded-md w-200 flex flex-col text-center items-center justify-center">
        <div className="bg-[#07484A] size-25 rounded-full flex items-center justify-center">
          <ShoppingBag className="size-12 text-white" />
        </div>
        <h2 className="text-4xl font-serif mt-5 font-bold text-white">
          EBA Management System
        </h2>
        <p className="text-xl mt-5 font-serif text-center text-white">
          Modern admin dashboard for managing products, orders, payments, and
          inventory
        </p>
        <Button
          onClick={() => setOpen(true)}
          size="lg"
          className="text-xl h-16 mt-10 lg:w-[30%]"
        >
          Dashboard <ArrowRight className="size-5.5" />
        </Button>
        <p className="text-white mt-5">Tap to begin</p>
      </div>
    </div>
  );
};

export default Page;
