"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EyeIcon, EyeOffIcon, UserIcon } from "lucide-react";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const Page = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const loginStudentMutation = useMutation(
    orpc.auth.loginStudent.mutationOptions({
      onSuccess: (result) => {
        localStorage.setItem("eba_student_session", JSON.stringify(result.student));
        toast.success(result.message || "Login successful");
        router.push("/home");
      },
      onError: (error) => {
        toast.error(error.message || "Invalid credentials");
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      toast.error("Please fill in your credentials");
      return;
    }

    loginStudentMutation.mutate({
      identifier: identifier.trim(),
      password,
    });
  };

  return (
    <div className="min-h-dvh bg-[#C8D6E4] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-md rounded-2xl border border-[#0B525B]/40 bg-[#C8D6E4] px-5 py-5 shadow-sm sm:max-w-lg sm:px-8 sm:py-7 lg:max-w-2xl lg:border-2 lg:px-12 lg:py-10 lg:shadow-xl"
      >
        <div className="flex flex-col items-center">
          <div className="lg:size-25 size-20 relative">
            <Image
              src="/logo.png"
              alt="Logo"
              priority
              fill
              className="size-full"
            />
          </div>

          <h1 className="mt-3 text-center font-serif text-[#0B525B] text-2xl leading-tight font-bold sm:text-[30px] lg:max-w-130 lg:text-[32px]">
            EXTERNAL AND BUSINESS
            <br />
            AFFAIR ORDERING
            <br />
            SYSTEM
          </h1>

          <h2 className="mt-5 font-serif text-lg font-semibold text-[#0B525B] sm:text-xl">
            USER LOGIN
          </h2>

          <div className="mt-4 h-px w-full bg-[#0B525B]/80" />
        </div>

        <div className="mt-8 space-y-4">
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#0B525B]" />
            <Input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter student number or cvsu email"
              className="h-11 rounded-2xl border border-[#258CFF] bg-transparent pl-11 text-sm text-[#0B525B] placeholder:text-[#6C9093] sm:h-12 sm:text-base"
            />
          </div>

          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#0B525B]" />
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="h-11 rounded-2xl border border-[#258CFF] bg-transparent pl-11 pr-11 text-sm text-[#0B525B] placeholder:text-[#6C9093] sm:h-12 sm:text-base"
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

          <div className="text-right text-black text-sm pr-1">
            <Link
              href={`/forgot-password${identifier.trim() ? `?identifier=${encodeURIComponent(identifier.trim())}` : ""}`}
              className="underline underline-offset-2 hover:text-[#0B525B]"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loginStudentMutation.isPending}
          size="lg"
          className="mt-5 h-11 w-full rounded-sm text-base font-bold sm:text-lg lg:text-xl"
        >
          Login
        </Button>

        <p className="mt-6 text-center text-sm text-black sm:text-base">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="text-[#B27A00]">
            Register Now
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Page;
