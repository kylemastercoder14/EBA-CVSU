import { prisma } from "@/lib/prisma";
import { createSystemLog } from "@/lib/system-log";
import { base } from "@/middlewares/base";
import {
  createStaffOutputSchema,
  createStaffSchema,
  deleteStaffOutputSchema,
  deleteStaffSchema,
  listStaffInputSchema,
  listStaffOutputSchema,
  updateStaffOutputSchema,
  updateStaffSchema,
} from "@/validators/staff";

export const listStaff = base
  .route({
    method: "GET",
    path: "/staff",
    summary: "list all staff",
    tags: ["staff"],
  })
  .input(listStaffInputSchema)
  .output(listStaffOutputSchema)
  .handler(async () => {
    const staff = await prisma.staff.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      staff: staff.map((member) => ({
        id: member.id,
        fullName: member.fullName,
        accessKey: member.accessKey,
        mobileNumber: member.mobileNumber,
        role: "STAFF" as const,
        isActive: member.isActive,
        createdAt: member.createdAt.toISOString(),
      })),
    };
  });

export const createStaff = base
  .route({
    method: "POST",
    path: "/staff",
    summary: "create a staff member",
    tags: ["staff"],
  })
  .input(createStaffSchema)
  .output(createStaffOutputSchema)
  .handler(async ({ input, errors }) => {
    const existingByKey = await prisma.staff.findUnique({
      where: {
        accessKey: input.accessKey,
      },
    });

    if (existingByKey) {
      throw errors.BAD_REQUEST();
    }

    const lastStaff = await prisma.staff.findFirst({
      where: {
        id: {
          startsWith: "STF",
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    let nextStaffNumber = 1;
    if (lastStaff) {
      const currentNumber = parseInt(lastStaff.id.replace("STF", ""), 10);
      nextStaffNumber = currentNumber + 1;
    }

    const staffId = `STF${nextStaffNumber.toString().padStart(3, "0")}`;

    const createdStaff = await prisma.staff.create({
      data: {
        id: staffId,
        fullName: input.fullName.trim(),
        accessKey: input.accessKey,
        mobileNumber: input.mobileNumber.trim(),
        role: "STAFF",
        isActive: input.isActive,
      },
    });

    await createSystemLog(prisma, {
      type: "ACTIVITY",
      category: "PAYMENT_PENDING",
      description: `Staff "${createdStaff.fullName}" was created.`,
      status: "SUCCESS",
      actorName: "Admin",
    });

    return {
      id: createdStaff.id,
      fullName: createdStaff.fullName,
      accessKey: createdStaff.accessKey,
      mobileNumber: createdStaff.mobileNumber,
      role: "STAFF" as const,
      isActive: createdStaff.isActive,
      createdAt: createdStaff.createdAt.toISOString(),
    };
  });

export const updateStaff = base
  .route({
    method: "PUT",
    path: "/staff/{id}",
    summary: "update a staff member",
    tags: ["staff"],
  })
  .input(updateStaffSchema)
  .output(updateStaffOutputSchema)
  .handler(async ({ input, errors }) => {
    const existingStaff = await prisma.staff.findUnique({
      where: {
        id: input.id,
      },
    });

    if (!existingStaff) {
      throw errors.NOT_FOUND();
    }

    const updatedStaff = await prisma.staff.update({
      where: {
        id: input.id,
      },
      data: {
        fullName: input.fullName.trim(),
        mobileNumber: input.mobileNumber.trim(),
        isActive: input.isActive,
        role: "STAFF",
      },
    });

    await createSystemLog(prisma, {
      type: "ACTIVITY",
      category: "PAYMENT_PENDING",
      description: `Staff "${existingStaff.fullName}" updated to "${updatedStaff.fullName}".`,
      status: "SUCCESS",
      actorName: "Admin",
    });

    return {
      id: updatedStaff.id,
      fullName: updatedStaff.fullName,
      accessKey: updatedStaff.accessKey,
      mobileNumber: updatedStaff.mobileNumber,
      role: "STAFF" as const,
      isActive: updatedStaff.isActive,
      createdAt: updatedStaff.createdAt.toISOString(),
    };
  });

export const deleteStaff = base
  .route({
    method: "DELETE",
    path: "/staff/{id}",
    summary: "delete a staff member",
    tags: ["staff"],
  })
  .input(deleteStaffSchema)
  .output(deleteStaffOutputSchema)
  .handler(async ({ input, errors }) => {
    const existingStaff = await prisma.staff.findUnique({
      where: {
        id: input.id,
      },
      select: {
        id: true,
        fullName: true,
      },
    });

    if (!existingStaff) {
      throw errors.NOT_FOUND();
    }

    await prisma.staff.delete({
      where: {
        id: input.id,
      },
    });

    await createSystemLog(prisma, {
      type: "ACTIVITY",
      category: "PAYMENT_PENDING",
      description: `Staff "${existingStaff.fullName}" was deleted.`,
      status: "SUCCESS",
      actorName: "Admin",
    });

    return {
      success: true,
      id: input.id,
      message: `Staff "${existingStaff.fullName}" deleted successfully`,
    };
  });
