import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAlert extends Document {
  type: "NEW_FLAG" | "STATUS_UPDATED";
  orderModel: string;
  orderId: Types.ObjectId;
  flagId?: Types.ObjectId | null;
  createdAt: Date;
  handled: boolean;
  handledBy?: string;
  handledAt?: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    type: { type: String, required: true },
    orderModel: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, required: true },
    flagId: { type: Schema.Types.ObjectId, default: null },
    handled: { type: Boolean, default: false },
    handledBy: { type: String, default: null },
    handledAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false }, collection: "alerts" }
);
AlertSchema.index({ handled: 1, createdAt: -1 });

export const Alert = mongoose.models.Alert || mongoose.model<IAlert>("Alert", AlertSchema);
