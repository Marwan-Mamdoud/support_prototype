import mongoose, { Schema, Document, Types } from "mongoose";

export interface IStaffMember extends Document {
  name: string;
  username: string;
  email: string;
  phone: string;
  role: "SUPPORT" | "ADMIN";
  active: boolean;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const StaffMemberSchema = new Schema<IStaffMember>(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ["SUPPORT", "ADMIN"], default: "SUPPORT" },
    active: { type: Boolean, default: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true, collection: "staff_members" }
);

export const StaffMember =
  mongoose.models.StaffMember || mongoose.model<IStaffMember>("StaffMember", StaffMemberSchema);
