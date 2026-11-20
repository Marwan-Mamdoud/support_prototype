import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBrandEmailOutbox extends Document {
  clientId: Types.ObjectId;
  toEmail: string;
  subject: string;
  body: string;
  createdAt: Date;
}

const BrandEmailOutboxSchema = new Schema<IBrandEmailOutbox>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    toEmail: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false }, collection: "brand_email_outbox" }
);

export const BrandEmailOutbox =
  mongoose.models.BrandEmailOutbox || mongoose.model<IBrandEmailOutbox>("BrandEmailOutbox", BrandEmailOutboxSchema);
