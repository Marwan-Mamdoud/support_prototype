import mongoose, { Schema, Document } from "mongoose";

export interface IClient extends Document {
  name: string;
  companyName: string;
  phone: string;
  email: string;
  serviceScheme: "WAREHOUSE" | "PICKUP";
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true },
    companyName: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    serviceScheme: { type: String, enum: ["WAREHOUSE", "PICKUP"], default: "WAREHOUSE" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "clients" }
);

export const Client = mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);
