import { z } from "zod";

export const createStaffSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  accessKey: z
    .string()
    .min(1, "Access key is required")
    .regex(/^EBA-2026-[A-Z0-9]{5}$/, "Invalid access key format"),
  mobileNumber: z.string().min(1, "Mobile number is required"),
  isActive: z.boolean(),
});

export const updateStaffSchema = z.object({
  id: z.string().min(1, "Staff ID is required"),
  fullName: z.string().min(1, "Full name is required"),
  mobileNumber: z.string().min(1, "Mobile number is required"),
  isActive: z.boolean(),
});

export const deleteStaffSchema = z.object({
  id: z.string().min(1, "Staff ID is required"),
});

export const listStaffInputSchema = z.void();

export const staffSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  accessKey: z.string(),
  mobileNumber: z.string(),
  role: z.literal("STAFF"),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export const listStaffOutputSchema = z.object({
  staff: z.array(staffSchema),
});

export const createStaffOutputSchema = staffSchema;
export const updateStaffOutputSchema = staffSchema;

export const deleteStaffOutputSchema = z.object({
  success: z.boolean(),
  id: z.string(),
  message: z.string(),
});
