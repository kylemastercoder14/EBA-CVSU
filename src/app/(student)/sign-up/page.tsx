"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  ShieldIcon,
} from "lucide-react";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const getErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null) {
    const errorRecord = error as Record<string, unknown>;
    const nestedContainers = [
      errorRecord,
      typeof errorRecord.data === "object" && errorRecord.data !== null
        ? (errorRecord.data as Record<string, unknown>)
        : null,
      typeof errorRecord.cause === "object" && errorRecord.cause !== null
        ? (errorRecord.cause as Record<string, unknown>)
        : null,
      typeof errorRecord.shape === "object" && errorRecord.shape !== null
        ? (errorRecord.shape as Record<string, unknown>)
        : null,
    ];

    for (const container of nestedContainers) {
      if (!container) continue;
      const issues = container.issues;
      if (Array.isArray(issues) && issues.length > 0) {
        const firstIssue = issues[0];
        if (
          typeof firstIssue === "object" &&
          firstIssue !== null &&
          "message" in firstIssue &&
          typeof firstIssue.message === "string"
        ) {
          return firstIssue.message;
        }
      }
    }

    if (typeof errorRecord.message === "string" && errorRecord.message) {
      return errorRecord.message;
    }
  }

  return "Failed to register student";
};

const Page = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cvsuEmail, setCvsuEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();

  const registerStudentMutation = useMutation(
    orpc.auth.registerStudent.mutationOptions({
      onSuccess: (result) => {
        localStorage.setItem("eba_student_session", JSON.stringify(result.student));
        toast.success(result.message || "Registration successful");
        router.push("/home");
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    }),
  );

  const requirements = useMemo(
    () => [
      {
        label: "At least 8 characters",
        met: password.length >= 8,
      },
      {
        label: "One uppercase letter (A-Z)",
        met: /[A-Z]/.test(password),
      },
      {
        label: "One lowercase letter (a-z)",
        met: /[a-z]/.test(password),
      },
      {
        label: "One number (0-9)",
        met: /[0-9]/.test(password),
      },
      {
        label: "One special character (!@#$%^&*)",
        met: /[^A-Za-z0-9]/.test(password),
      },
    ],
    [password],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!cvsuEmail.trim() || !mobileNumber.trim() || !password.trim()) {
      toast.error("Please complete all required fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    registerStudentMutation.mutate({
      cvsuEmail: cvsuEmail.trim(),
      mobileNumber: mobileNumber.trim(),
      password,
    });
  };

  return (
    <div className="min-h-dvh bg-[#C8D6E4] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-md rounded-2xl border border-[#0B525B]/40 bg-[#C8D6E4] px-5 py-5 shadow-sm sm:max-w-2xl sm:px-8 sm:py-8 lg:max-w-4xl lg:border-2 lg:px-12 lg:py-10 lg:shadow-xl"
      >
        <div className="flex flex-col items-center">
          <div className="relative size-20 sm:size-24 lg:size-25">
            <Image
              src="/logo.png"
              alt="Logo"
              priority
              fill
              className="size-full"
            />
          </div>

          <h1 className="mt-3 max-w-140 text-center font-serif text-2xl leading-tight font-bold text-[#0B525B] sm:text-[30px] lg:text-[32px]">
            EXTERNAL AND BUSINESS AFFAIR
            <br />
            ORDERING SYSTEM
          </h1>

          <h2 className="mt-5 text-[#0B525B] font-serif font-semibold text-lg sm:mt-6 sm:text-xl">
            USER REGISTRATION
          </h2>

          <div className="mt-4 h-px w-full bg-[#0B525B]/80" />
        </div>

        <div className="mt-8 space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="relative">
              <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#0B525B]" />
              <Input
                type="email"
                value={cvsuEmail}
                onChange={(e) => setCvsuEmail(e.target.value)}
                placeholder="Enter your cvsu email"
                className="h-11 rounded-2xl border border-[#258CFF] bg-transparent pl-12 text-sm text-[#0B525B] placeholder:text-[#6C9093] sm:h-12 sm:text-base"
              />
            </div>

            <div className="relative">
              <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#0B525B]" />
              <Input
                type="text"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="Enter your mobile number"
                className="h-11 rounded-2xl border border-[#258CFF] bg-transparent pl-12 text-sm text-[#0B525B] placeholder:text-[#6C9093] sm:h-12 sm:text-base"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="relative">
            <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#0B525B]" />
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="h-11 rounded-2xl border border-[#258CFF] bg-transparent pl-12 pr-12 text-sm text-[#0B525B] placeholder:text-[#6C9093] sm:h-12 sm:text-base"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B525B]"
            >
              {showPassword ? (
                <EyeOffIcon className="size-5" />
              ) : (
                <EyeIcon className="size-5" />
              )}
            </button>
          </div>

          <div className="relative">
            <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#0B525B]" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Enter confirm password"
                className="h-11 rounded-2xl border border-[#258CFF] bg-transparent pl-12 pr-12 text-sm text-[#0B525B] placeholder:text-[#6C9093] sm:h-12 sm:text-base"
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
        </div>

        <div className="mt-4 rounded-2xl border border-[#258CFF] bg-transparent px-4 py-3">
          <div className="flex items-start gap-3">
            <ShieldIcon className="size-6 text-[#0B525B] mt-0.5 shrink-0" />
            <div>
              <p className="text-[#0B525B] text-sm font-medium">
                Password Requirements:
              </p>
              <ul className="mt-1 space-y-1">
                {requirements.map((item) => (
                  <li
                    key={item.label}
                    className={`text-xs ${
                      item.met ? "text-[#0B525B]" : "text-[#6C9093]"
                    }`}
                  >
                    o {item.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={registerStudentMutation.isPending}
          size="lg"
          className="mt-5 h-11 w-full rounded-sm text-base font-bold sm:text-lg lg:text-xl"
        >
          Register
        </Button>

        <p className="mt-6 text-center text-sm text-black sm:text-base">
          Have an account?{" "}
          <Link href="/" className="text-[#B27A00]">
            Login Now
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Page;
