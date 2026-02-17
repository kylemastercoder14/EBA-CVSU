export type StaffRole = "STAFF";

export type Staff = {
  id: string;
  fullName: string;
  accessKey: string;
  mobileNumber: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
};
