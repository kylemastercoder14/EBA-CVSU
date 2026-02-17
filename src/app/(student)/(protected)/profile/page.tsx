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
    <main className="min-h-[calc(100dvh-80px)] bg-[#C8D6E4] px-6 py-10">
      <section className="mx-auto w-full max-w-120">
        <h1 className="text-center font-serif text-5xl font-bold text-[#0B525B]">
          My Profile
        </h1>

        <div className="mt-12 space-y-5">
          <div>
            <p className="mb-1 text-[29px] text-[#0D5A67]">Full Name</p>
            <Input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="h-15 rounded-[14px] border border-[#2D7CD4] bg-[#F4F6F8] px-4 text-3xl text-[#0B525B]"
            />
          </div>

          <div>
            <p className="mb-1 text-[29px] text-[#0D5A67]">CVSU Email</p>
            <Input
              readOnly
              value={cvsuEmail}
              className="h-15 rounded-[14px] border border-[#2D7CD4] bg-[#F4F6F8] px-4 text-3xl text-[#0B525B]"
            />
          </div>

          <div>
            <p className="mb-1 text-[29px] text-[#0D5A67]">Mobile Number</p>
            <Input
              value={mobileNumber}
              onChange={(event) => setMobileNumber(event.target.value)}
              className="h-15 rounded-[14px] border border-[#2D7CD4] bg-[#F4F6F8] px-4 text-3xl text-[#0B525B]"
            />
          </div>

          <div>
            <p className="mb-1 text-[29px] text-[#0D5A67]">Password</p>
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter new password"
              className="h-15 rounded-[14px] border border-[#2D7CD4] bg-[#F4F6F8] px-4 text-3xl text-[#0B525B]"
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={updateStudentProfileMutation.isPending}
          className="mt-10 h-16 w-full rounded-full border border-[#073F42] bg-[#07545A] text-3xl font-semibold text-white hover:bg-[#064D52]"
        >
          {updateStudentProfileMutation.isPending ? "Saving..." : "Save Changes"}
          <LockIcon className="size-5" />
        </Button>
      </section>
    </main>
  );
};

export default Page;
