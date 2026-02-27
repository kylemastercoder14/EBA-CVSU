"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { orpc } from "@/lib/orpc";

const PageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialIdentifier = searchParams.get("identifier")?.trim() ?? "";
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [mobileNumber, setMobileNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isIdentityVerified, setIsIdentityVerified] = useState(false);

  const verifyIdentityMutation = useMutation(
    orpc.auth.verifyStudentResetIdentity.mutationOptions({
      onSuccess: (result) => {
        setIsIdentityVerified(true);
        toast.success(result.message || "Identity verified");
      },
      onError: (error) => {
        setIsIdentityVerified(false);
        toast.error(error.message || "Unable to verify your details");
      },
    }),
  );

  const resetPasswordMutation = useMutation(
    orpc.auth.resetStudentPassword.mutationOptions({
      onSuccess: (result) => {
        toast.success(result.message || "Password reset successful");
        router.push("/");
      },
      onError: (error) => {
        toast.error(error.message || "Unable to reset password");
      },
    }),
  );

  const handleIdentityInputChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string,
  ) => {
    setter(value);
    if (isIdentityVerified) {
      setIsIdentityVerified(false);
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  };

  const handleValidateIdentity = (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim() || !mobileNumber.trim()) {
      toast.error("Enter your student number/CvSU email and mobile number");
      return;
    }

    verifyIdentityMutation.mutate({
      identifier: identifier.trim(),
      mobileNumber: mobileNumber.trim(),
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isIdentityVerified) {
      toast.error("Please verify your identity first");
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error("Please enter and confirm your new password");
      return;
    }

    if (newPassword.trim().length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    resetPasswordMutation.mutate({
      identifier: identifier.trim(),
      mobileNumber: mobileNumber.trim(),
      newPassword,
    });
  };

  const isBusy = verifyIdentityMutation.isPending || resetPasswordMutation.isPending;

  return (
    <div className="min-h-dvh bg-[#C8D6E4] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <form
        onSubmit={isIdentityVerified ? handleResetPassword : handleValidateIdentity}
        className="mx-auto w-full max-w-md rounded-2xl border border-[#0B525B]/40 bg-[#C8D6E4] px-5 py-5 shadow-sm sm:max-w-lg sm:px-8 sm:py-7 lg:max-w-2xl lg:border-2 lg:px-12 lg:py-10 lg:shadow-xl"
      >
        <div className="flex flex-col items-center">
          <div className="lg:size-25 size-20 relative">
            <Image src="/logo.png" alt="Logo" priority fill className="size-full" />
          </div>

          <h1 className="mt-3 text-center font-serif text-[#0B525B] text-2xl leading-tight font-bold sm:text-[30px] lg:max-w-130 lg:text-[32px]">
            FORGOT PASSWORD
          </h1>

          <p className="mt-2 text-center text-xs text-[#0B525B]/70 sm:text-sm">
            Verify your identity first. New password fields will appear after validation.
          </p>

          <div className="mt-4 h-px w-full bg-[#0B525B]/80" />
        </div>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#0B525B]" />
            <Input
              type="text"
              value={identifier}
              onChange={(e) => handleIdentityInputChange(setIdentifier, e.target.value)}
              placeholder="Enter student number or CvSU email"
              className="h-11 rounded-2xl border border-[#258CFF] bg-transparent pl-11 text-sm text-[#0B525B] placeholder:text-[#6C9093] sm:h-12 sm:text-base"
            />
          </div>

          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#0B525B]" />
            <Input
              type="text"
              value={mobileNumber}
              onChange={(e) => handleIdentityInputChange(setMobileNumber, e.target.value)}
              placeholder="Enter registered mobile number"
              className="h-11 rounded-2xl border border-[#258CFF] bg-transparent pl-11 text-sm text-[#0B525B] placeholder:text-[#6C9093] sm:h-12 sm:text-base"
            />
          </div>

          {isIdentityVerified && (
            <>
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
                Identity verified. You can now set a new password.
              </div>

              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#0B525B]" />
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="h-11 rounded-2xl border border-[#258CFF] bg-transparent pl-11 pr-11 text-sm text-[#0B525B] placeholder:text-[#6C9093] sm:h-12 sm:text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B525B]"
                >
                  {showNewPassword ? (
                    <EyeOffIcon className="size-5" />
                  ) : (
                    <EyeIcon className="size-5" />
                  )}
                </button>
              </div>

              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#0B525B]" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="h-11 rounded-2xl border border-[#258CFF] bg-transparent pl-11 pr-11 text-sm text-[#0B525B] placeholder:text-[#6C9093] sm:h-12 sm:text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B525B]"
                >
                  {showConfirmPassword ? (
                    <EyeOffIcon className="size-5" />
                  ) : (
                    <EyeIcon className="size-5" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        <Button
          type="submit"
          disabled={isBusy}
          size="lg"
          className="mt-5 h-11 w-full rounded-sm text-base font-bold sm:text-lg lg:text-xl"
        >
          {verifyIdentityMutation.isPending
            ? "Validating..."
            : resetPasswordMutation.isPending
              ? "Resetting..."
              : isIdentityVerified
                ? "Reset Password"
                : "Validate"}
        </Button>

        <div className="mt-4 flex items-center justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#0B525B] underline underline-offset-2"
          >
            <ArrowLeftIcon className="size-4" />
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
};

const Page = () => (
  <Suspense fallback={<div className="min-h-dvh bg-[#C8D6E4]" />}>
    <PageContent />
  </Suspense>
);

export default Page;
