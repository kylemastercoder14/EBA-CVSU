import { z } from "zod";

export const authInputSchema = z.object({
  accessKey: z.string().min(1, "Access key is required"),
});

export const staffSessionSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  accessKey: z.string(),
  mobileNumber: z.string(),
  role: z.literal("STAFF"),
  isActive: z.boolean(),
});

export const loginStaffOutputSchema = z.object({
  loggedIn: z.boolean(),
  message: z.string(),
  staff: staffSessionSchema,
});

export const getStaffSessionOutputSchema = z.object({
  loggedIn: z.boolean(),
  staff: staffSessionSchema.nullable(),
});

export const registerStudentInputSchema = z.object({
  fullName: z.string().min(1).optional(),
  cvsuEmail: z
    .string()
    .email("Valid CvSU email is required")
    .refine(
      (email) => email.toLowerCase().endsWith("@cvsu.edu.ph"),
      "Email must use the CvSU domain",
    ),
  mobileNumber: z.string().min(1, "Mobile number is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const studentLoginInputSchema = z.object({
  identifier: z.string().min(1, "Student number or CvSU email is required"),
  password: z.string().min(1, "Password is required"),
});

export const resetStudentPasswordInputSchema = z.object({
  identifier: z.string().min(1, "Student number or CvSU email is required"),
  mobileNumber: z.string().min(1, "Mobile number is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const verifyStudentResetIdentityInputSchema = z.object({
  identifier: z.string().min(1, "Student number or CvSU email is required"),
  mobileNumber: z.string().min(1, "Mobile number is required"),
});

export const studentSessionSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  mobileNumber: z.string(),
  studentNumber: z.string().nullable(),
  cvsuEmail: z.string().nullable(),
  type: z.literal("STUDENT"),
});

export const registerStudentOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  student: studentSessionSchema,
});

export const loginStudentOutputSchema = z.object({
  loggedIn: z.boolean(),
  message: z.string(),
  student: studentSessionSchema,
});

export const resetStudentPasswordOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const verifyStudentResetIdentityOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const updateStudentProfileInputSchema = z
  .object({
    userId: z.string().min(1, "User ID is required"),
    fullName: z.string().min(1, "Full name is required").optional(),
    mobileNumber: z.string().min(1, "Mobile number is required").optional(),
    password: z.string().min(8, "Password must be at least 8 characters").optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.fullName?.trim() || value.mobileNumber?.trim() || value.password?.trim(),
      ),
    {
      message: "At least one profile field is required",
      path: ["fullName"],
    },
  );

export const updateStudentProfileOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  student: studentSessionSchema,
});
