import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAuditLog extends Document {
  orderModel: string;
  orderId: Types.ObjectId;
  action: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  userId?: string;
  userName?: string;
  userRole?: string;
  at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    orderModel: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, required: true },
    field: { type: String, default: null },
    oldValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
    userId: { type: String, default: null },
    userName: { type: String, default: null },
    userRole: { type: String, default: null },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false, collection: "order_audit_log" }
);
AuditLogSchema.index({ orderModel: 1, orderId: 1, at: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
