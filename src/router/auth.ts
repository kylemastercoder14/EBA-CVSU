import { prisma } from "@/lib/prisma";
import { createSystemLog } from "@/lib/system-log";
import { base } from "@/middlewares/base";
import {
  authInputSchema,
  getStaffSessionOutputSchema,
  loginStudentOutputSchema,
  loginStaffOutputSchema,
  registerStudentInputSchema,
  registerStudentOutputSchema,
  studentLoginInputSchema,
  updateStudentProfileInputSchema,
  updateStudentProfileOutputSchema,
} from "@/validators/auth";
import { createHash } from "crypto";

const hashPassword = (password: string) =>
  createHash("sha256").update(password).digest("hex");

export const loginStaff = base
  .route({
    method: "POST",
    path: "/auth/login",
    summary: "login staff by access key",
    tags: ["auth"],
  })
  .input(authInputSchema)
  .output(loginStaffOutputSchema)
  .handler(async ({ input, errors }) => {
    const staff = await prisma.staff.findUnique({
      where: {
        accessKey: input.accessKey,
      },
    });

    if (!staff || !staff.isActive) {
      await createSystemLog(prisma, {
        type: "ACTIVITY",
        category: "PAYMENT_PENDING",
        description: `Failed staff login attempt for access key "${input.accessKey}".`,
        status: "WARNING",
        actorName: "System",
      });
      throw errors.UNAUTHORIZED();
    }

    await createSystemLog(prisma, {
      type: "ACTIVITY",
      category: "PAYMENT_PENDING",
      description: `Staff "${staff.fullName}" logged in successfully.`,
      status: "SUCCESS",
      actorName: staff.fullName,
    });

    return {
      loggedIn: true,
      message: "Access granted",
      staff: {
        id: staff.id,
        fullName: staff.fullName,
        accessKey: staff.accessKey,
        mobileNumber: staff.mobileNumber,
        role: "STAFF" as const,
        isActive: staff.isActive,
      },
    };
  });

export const registerStudent = base
  .route({
    method: "POST",
    path: "/auth/student/register",
    summary: "register student account",
    tags: ["auth"],
  })
  .input(registerStudentInputSchema)
  .output(registerStudentOutputSchema)
  .handler(async ({ input, errors }) => {
    const existingStudent = await prisma.user.findFirst({
      where: {
        cvsuEmail: input.cvsuEmail,
        type: "STUDENT",
      },
    });

    if (existingStudent) {
      throw errors.BAD_REQUEST();
    }

    const lastUser = await prisma.user.findFirst({
      where: {
        id: {
          startsWith: "STUD",
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    let nextUserNumber = 1;
    if (lastUser) {
      const currentNumber = parseInt(lastUser.id.replace("STUD", ""), 10);
      nextUserNumber = currentNumber + 1;
    }
    const userId = `STUD${nextUserNumber.toString().padStart(3, "0")}`;

    const hashedPassword = hashPassword(input.password);
    const derivedName = input.cvsuEmail.split("@")[0].replace(/[._-]/g, " ");

    const student = await prisma.user.create({
      data: {
        id: userId,
        type: "STUDENT",
        fullName: input.fullName?.trim() || derivedName,
        mobileNumber: input.mobileNumber.trim(),
        studentNumber: null,
        cvsuEmail: input.cvsuEmail.trim().toLowerCase(),
        password: hashedPassword,
      },
    });

    await createSystemLog(prisma, {
      type: "ACTIVITY",
      category: "PAYMENT_PENDING",
      description: `Student account registered for "${student.fullName}" (${student.cvsuEmail ?? "no-email"}).`,
      status: "SUCCESS",
      actorName: student.fullName,
      actorUserId: student.id,
    });

    return {
      success: true,
      message: "Student account registered successfully",
      student: {
        id: student.id,
        fullName: student.fullName,
        mobileNumber: student.mobileNumber,
        studentNumber: student.studentNumber,
        cvsuEmail: student.cvsuEmail,
        type: "STUDENT" as const,
      },
    };
  });

export const loginStudent = base
  .route({
    method: "POST",
    path: "/auth/student/login",
    summary: "login student by student number or cvsu email",
    tags: ["auth"],
  })
  .input(studentLoginInputSchema)
  .output(loginStudentOutputSchema)
  .handler(async ({ input, errors }) => {
    const normalizedIdentifier = input.identifier.trim();

    const student = await prisma.user.findFirst({
      where: {
        type: "STUDENT",
        OR: [
          { studentNumber: normalizedIdentifier },
          { cvsuEmail: normalizedIdentifier.toLowerCase() },
        ],
      },
    });

    if (!student || !student.password) {
      await createSystemLog(prisma, {
        type: "ACTIVITY",
        category: "PAYMENT_PENDING",
        description: `Failed student login attempt for identifier "${normalizedIdentifier}".`,
        status: "WARNING",
        actorName: "System",
      });
      throw errors.UNAUTHORIZED();
    }

    const hashedPassword = hashPassword(input.password);
    const passwordMatches =
      student.password === hashedPassword ||
      student.password === input.password;

    if (!passwordMatches) {
      await createSystemLog(prisma, {
        type: "ACTIVITY",
        category: "PAYMENT_PENDING",
        description: `Failed student login password check for identifier "${normalizedIdentifier}".`,
        status: "WARNING",
        actorName: student.fullName,
        actorUserId: student.id,
      });
      throw errors.UNAUTHORIZED();
    }

    await createSystemLog(prisma, {
      type: "ACTIVITY",
      category: "PAYMENT_PENDING",
      description: `Student "${student.fullName}" logged in successfully.`,
      status: "SUCCESS",
      actorName: student.fullName,
      actorUserId: student.id,
    });

    return {
      loggedIn: true,
      message: "Student login successful",
      student: {
        id: student.id,
        fullName: student.fullName,
        mobileNumber: student.mobileNumber,
        studentNumber: student.studentNumber,
        cvsuEmail: student.cvsuEmail,
        type: "STUDENT" as const,
      },
    };
  });

export const getStaffSession = base
  .route({
    method: "POST",
    path: "/auth/session",
    summary: "get staff session by access key",
    tags: ["auth"],
  })
  .input(authInputSchema)
  .output(getStaffSessionOutputSchema)
  .handler(async ({ input }) => {
    const staff = await prisma.staff.findUnique({
      where: {
        accessKey: input.accessKey,
      },
    });

    if (!staff || !staff.isActive) {
      return {
        loggedIn: false,
        staff: null,
      };
    }

    return {
      loggedIn: true,
      staff: {
        id: staff.id,
        fullName: staff.fullName,
        accessKey: staff.accessKey,
        mobileNumber: staff.mobileNumber,
        role: "STAFF" as const,
        isActive: staff.isActive,
      },
    };
  });

export const updateStudentProfile = base
  .route({
    method: "PUT",
    path: "/auth/student/profile",
    summary: "update student profile fields (full name, mobile, password)",
    tags: ["auth"],
  })
  .input(updateStudentProfileInputSchema)
  .output(updateStudentProfileOutputSchema)
  .handler(async ({ input, errors }) => {
    const existingStudent = await prisma.user.findFirst({
      where: {
        id: input.userId,
        type: "STUDENT",
      },
    });

    if (!existingStudent) {
      throw errors.NOT_FOUND();
    }

    const updatedStudent = await prisma.user.update({
      where: {
        id: input.userId,
      },
      data: {
        ...(input.fullName?.trim() ? { fullName: input.fullName.trim() } : {}),
        ...(input.mobileNumber?.trim()
          ? { mobileNumber: input.mobileNumber.trim() }
          : {}),
        ...(input.password?.trim()
          ? { password: hashPassword(input.password.trim()) }
          : {}),
      },
    });

    await createSystemLog(prisma, {
      type: "ACTIVITY",
      category: "PAYMENT_PENDING",
      description: `Student "${updatedStudent.fullName}" updated profile information.`,
      status: "SUCCESS",
      actorName: updatedStudent.fullName,
      actorUserId: updatedStudent.id,
    });

    return {
      success: true,
      message: "Student profile updated successfully",
      student: {
        id: updatedStudent.id,
        fullName: updatedStudent.fullName,
        mobileNumber: updatedStudent.mobileNumber,
        studentNumber: updatedStudent.studentNumber,
        cvsuEmail: updatedStudent.cvsuEmail,
        type: "STUDENT" as const,
      },
    };
  });
