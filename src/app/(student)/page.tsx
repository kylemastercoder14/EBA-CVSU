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
    <div className="min-h-screen bg-[#C8D6E4] flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-[#C8D6E4] lg:border-2 lg:shadow-xl border-[#0B525B] px-15 py-10"
      >
        <div className="flex flex-col items-center">
          <div className="size-25 relative">
            <Image
              src="/logo.png"
              alt="Logo"
              priority
              fill
              className="size-full"
            />
          </div>

          <h1 className="mt-3 text-center font-serif text-[#0B525B] text-[34px] sm:text-[42px] leading-tight font-bold max-w-130">
            EXTERNAL AND BUSINESS
            <br />
            AFFAIR ORDERING
            <br />
            SYSTEM
          </h1>

          <h2 className="mt-5 sm:mt-6 text-[#0B525B] font-serif font-semibold text-xl sm:text-2xl">
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
              className="h-12 rounded-2xl border border-[#258CFF] bg-transparent pl-12 text-[#0B525B] placeholder:text-[#6C9093]"
            />
          </div>

          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#0B525B]" />
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="h-12 rounded-2xl border border-[#258CFF] bg-transparent pl-12 pr-12 text-[#0B525B] placeholder:text-[#6C9093]"
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
            Forgot password?
          </div>
        </div>

        <Button
          type="submit"
          disabled={loginStudentMutation.isPending}
          size="lg"
          className="mt-5 w-full h-11 text-xl rounded-sm font-bold"
        >
          Login
        </Button>

        <p className="mt-6 text-center text-black">
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
