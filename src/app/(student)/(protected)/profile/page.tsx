"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LockIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { orpc } from "@/lib/orpc";

type StudentSession = {
  id?: string | null;
  fullName?: string | null;
  mobileNumber?: string | null;
  studentNumber?: string | null;
  cvsuEmail?: string | null;
};

const Page = () => {
  const [studentSession, setStudentSession] = useState<StudentSession>(() => {
    if (typeof window === "undefined") return {};

    const raw = localStorage.getItem("eba_student_session");
    if (!raw) return {};

    try {
      return JSON.parse(raw) as StudentSession;
    } catch {
      return {};
    }
  });
  const [fullName, setFullName] = useState(studentSession.fullName ?? "");
  const [mobileNumber, setMobileNumber] = useState(
    studentSession.mobileNumber ?? "",
  );
  const [newPassword, setNewPassword] = useState("");
  const cvsuEmail = studentSession.cvsuEmail ?? "No CvSU email";

  const updateStudentProfileMutation = useMutation(
    orpc.auth.updateStudentProfile.mutationOptions({
      onSuccess: (result) => {
        localStorage.setItem("eba_student_session", JSON.stringify(result.student));
        window.dispatchEvent(new Event("student-session-updated"));
        setStudentSession(result.student);
        setFullName(result.student.fullName ?? "");
        setMobileNumber(result.student.mobileNumber ?? "");
        setNewPassword("");
        toast.success(result.message || "Profile updated successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update profile");
      },
    }),
  );

  const handleSave = () => {
    if (!studentSession.id) {
      toast.error("Session not found. Please login again.");
      return;
    }

    if (!fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }

    if (!mobileNumber.trim()) {
      toast.error("Mobile number is required.");
      return;
    }

    updateStudentProfileMutation.mutate({
      userId: studentSession.id,
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.trim(),
      ...(newPassword.trim() ? { password: newPassword.trim() } : {}),
    });
  };

  return (
    <main className="min-h-[calc(100dvh-80px)] bg-[#C8D6E4] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-[#0B525B]/15 bg-white/25 p-4 shadow-[0_10px_24px_rgba(11,82,91,0.06)] backdrop-blur-sm sm:p-6 lg:p-8">
        <h1 className="text-center font-serif text-2xl font-bold text-[#0B525B] sm:text-3xl lg:text-4xl">
          My Profile
        </h1>

        <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
          <div>
            <p className="mb-1 text-base text-[#0D5A67] sm:text-lg lg:text-xl">Full Name</p>
            <Input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="h-11 rounded-[14px] border border-[#2D7CD4] bg-[#F4F6F8] px-4 text-sm text-[#0B525B] sm:h-12 sm:text-base lg:h-13 lg:text-lg"
            />
          </div>

          <div>
            <p className="mb-1 text-base text-[#0D5A67] sm:text-lg lg:text-xl">CVSU Email</p>
            <Input
              readOnly
              value={cvsuEmail}
              className="h-11 rounded-[14px] border border-[#2D7CD4] bg-[#F4F6F8] px-4 text-sm text-[#0B525B] sm:h-12 sm:text-base lg:h-13 lg:text-lg"
            />
          </div>

          <div>
            <p className="mb-1 text-base text-[#0D5A67] sm:text-lg lg:text-xl">Mobile Number</p>
            <Input
              value={mobileNumber}
              onChange={(event) => setMobileNumber(event.target.value)}
              className="h-11 rounded-[14px] border border-[#2D7CD4] bg-[#F4F6F8] px-4 text-sm text-[#0B525B] sm:h-12 sm:text-base lg:h-13 lg:text-lg"
            />
          </div>

          <div>
            <p className="mb-1 text-base text-[#0D5A67] sm:text-lg lg:text-xl">Password</p>
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter new password"
              className="h-11 rounded-[14px] border border-[#2D7CD4] bg-[#F4F6F8] px-4 text-sm text-[#0B525B] sm:h-12 sm:text-base lg:h-13 lg:text-lg"
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={updateStudentProfileMutation.isPending}
          className="mt-8 h-11 w-full rounded-full border border-[#073F42] bg-[#07545A] text-sm font-semibold text-white hover:bg-[#064D52] sm:mt-10 sm:h-12 sm:text-base lg:h-13 lg:text-lg"
        >
          {updateStudentProfileMutation.isPending ? "Saving..." : "Save Changes"}
          <LockIcon className="size-5" />
        </Button>
      </section>
    </main>
  );
};

export default Page;
