import { prisma } from "@/lib/prisma";
import { createSystemLog } from "@/lib/system-log";
import { base } from "@/middlewares/base";
import {
  authInputSchema,
  getStaffSessionOutputSchema,
  loginStudentOutputSchema,
  loginStaffOutputSchema,
  resetStudentPasswordInputSchema,
  resetStudentPasswordOutputSchema,
  registerStudentInputSchema,
  registerStudentOutputSchema,
  studentLoginInputSchema,
  verifyStudentResetIdentityInputSchema,
  verifyStudentResetIdentityOutputSchema,
  updateStudentProfileInputSchema,
  updateStudentProfileOutputSchema,
} from "@/validators/auth";
import { createHash } from "crypto";

const hashPassword = (password: string) =>
  createHash("sha256").update(password).digest("hex");

const normalizeMobileDigits = (value: string) =>
  value.replace(/[^\d]/g, "");

const mobileNumbersMatch = (a: string, b: string) => {
  const left = normalizeMobileDigits(a);
  const right = normalizeMobileDigits(b);
  if (!left || !right) return false;

  const normalizePh = (digits: string) => {
    if (digits.startsWith("63")) return `0${digits.slice(2)}`;
    return digits;
  };

  return normalizePh(left) === normalizePh(right);
};

const findStudentByIdentifier = async (identifier: string) => {
  const normalizedIdentifier = identifier.trim();
  return prisma.user.findFirst({
    where: {
      type: "STUDENT",
      OR: [
        { studentNumber: normalizedIdentifier },
        { cvsuEmail: normalizedIdentifier.toLowerCase() },
      ],
    },
    select: {
      id: true,
      fullName: true,
      mobileNumber: true,
    },
  });
};

const getStudentIdentifierValidationMessage = (identifier: string) => {
  const trimmed = identifier.trim();
  if (!trimmed) return "Student number or CvSU email is required.";

  if (trimmed.includes("@")) {
    const isEmailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(trimmed);
    if (!isEmailLike) {
      return "Please enter a valid email address.";
    }
    if (!trimmed.toLowerCase().endsWith("@cvsu.edu.ph")) {
      return "Email must use the CvSU domain (@cvsu.edu.ph).";
    }
  }

  return null;
};

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

    const student = await prisma.$transaction(async (tx) => {
      const createdStudent = await tx.user.create({
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

      await createSystemLog(tx, {
        type: "ACTIVITY",
        category: "PAYMENT_PENDING",
        description: `Student account registered for "${createdStudent.fullName}" (${createdStudent.cvsuEmail ?? "no-email"}).`,
        status: "SUCCESS",
        actorName: createdStudent.fullName,
        actorUserId: createdStudent.id,
      });

      return createdStudent;
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

export const resetStudentPassword = base
  .route({
    method: "PUT",
    path: "/auth/student/reset-password",
    summary: "reset student password using identifier and mobile number",
    tags: ["auth"],
  })
  .input(resetStudentPasswordInputSchema)
  .output(resetStudentPasswordOutputSchema)
  .handler(async ({ input, errors }) => {
    const normalizedIdentifier = input.identifier.trim();
    const normalizedMobile = input.mobileNumber.trim();
    const identifierValidationMessage =
      getStudentIdentifierValidationMessage(normalizedIdentifier);

    if (identifierValidationMessage) {
      throw errors.BAD_REQUEST({
        message: identifierValidationMessage,
      });
    }

    const student = await findStudentByIdentifier(normalizedIdentifier);

    if (!student) {
      await createSystemLog(prisma, {
        type: "ACTIVITY",
        category: "PAYMENT_PENDING",
        description: `Failed student password reset attempt for identifier "${normalizedIdentifier}".`,
        status: "WARNING",
        actorName: "System",
      });
      throw errors.BAD_REQUEST({
        message:
          "Student number or CvSU email was not found. Please check your details.",
      });
    }

    if (!mobileNumbersMatch(student.mobileNumber, normalizedMobile)) {
      await createSystemLog(prisma, {
        type: "ACTIVITY",
        category: "PAYMENT_PENDING",
        description: `Failed student password reset mobile verification for identifier "${normalizedIdentifier}".`,
        status: "WARNING",
        actorName: student.fullName,
        actorUserId: student.id,
      });
      throw errors.BAD_REQUEST({
        message:
          "Mobile number does not match our records for this account.",
      });
    }

    await prisma.user.update({
      where: {
        id: student.id,
      },
      data: {
        password: hashPassword(input.newPassword.trim()),
      },
    });

    await createSystemLog(prisma, {
      type: "ACTIVITY",
      category: "PAYMENT_PENDING",
      description: `Student "${student.fullName}" reset account password via forgot password.`,
      status: "SUCCESS",
      actorName: student.fullName,
      actorUserId: student.id,
    });

    return {
      success: true,
      message: "Password reset successful. You can now log in.",
    };
  });

export const verifyStudentResetIdentity = base
  .route({
    method: "POST",
    path: "/auth/student/reset-password/verify-identity",
    summary: "verify student identity for forgot password using identifier and mobile number",
    tags: ["auth"],
  })
  .input(verifyStudentResetIdentityInputSchema)
  .output(verifyStudentResetIdentityOutputSchema)
  .handler(async ({ input, errors }) => {
    const normalizedIdentifier = input.identifier.trim();
    const normalizedMobile = input.mobileNumber.trim();
    const identifierValidationMessage =
      getStudentIdentifierValidationMessage(normalizedIdentifier);

    if (identifierValidationMessage) {
      throw errors.BAD_REQUEST({
        message: identifierValidationMessage,
      });
    }

    const student = await findStudentByIdentifier(normalizedIdentifier);

    if (!student) {
      throw errors.BAD_REQUEST({
        message:
          "Student number or CvSU email was not found. Please check your details.",
      });
    }

    if (!mobileNumbersMatch(student.mobileNumber, normalizedMobile)) {
      throw errors.BAD_REQUEST({
        message:
          "Mobile number does not match our records for this account.",
      });
    }

    return {
      success: true,
      message: "Identity verified. You can now set a new password.",
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
