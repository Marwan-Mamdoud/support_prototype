import mongoose, { Schema, Document } from "mongoose";

export interface ICourier extends Document {
  name: string;
  phone: string;
  username: string;
  outsourced: boolean;
  zone: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CourierSchema = new Schema<ICourier>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    username: { type: String, required: true },
    outsourced: { type: Boolean, default: false },
    zone: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "couriers" }
);

export const Courier = mongoose.models.Courier || mongoose.model<ICourier>("Courier", CourierSchema);
