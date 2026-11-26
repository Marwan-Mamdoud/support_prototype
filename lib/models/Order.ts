import mongoose, { Schema, Document, Types } from "mongoose";
import { FINAL_STATUSES } from "../rules/constants";

export interface IIssueFlag {
  _id: Types.ObjectId;
  type: string;
  note: string;
  reportedByRole: string;
  reportedByUser: string;
  reportedAt: Date;
  state: "open" | "resolved";
  resolvedBy?: string;
  resolvedAt?: Date;
  resolveNote?: string;
}

export interface IOrderBase extends Document {
  oid: string;
  clientId: Types.ObjectId;
  status: string;
  statusHistory: Record<string, string>;
  lastStatusChangedAt: Date;
  customerPhone: string;
  customerPhoneNormalized: string;
  customerAddress: string;
  customerGovernorate: string;
  products: { uid: string; name: string; variant: string; quantity: number; price: number }[];
  subtotal: number;
  total: number;
  shippingFees: number;
  shippingHandledBy: string;
  paymentMethod: string;
  paymentStatus: string;
  canOpenPackage: boolean;
  notes: string;
  courierId?: Types.ObjectId | null;
  courierNotes: string;
  deliveryAttempts: number;
  deliveryAttemptTimestamps: any;
  trackingNumber?: string | null;
  currentLocation?: string | null;

  hasOpenIssue: boolean;
  issueFlags: IIssueFlag[];
  cancellationReason?: string;
  cancelledBy?: string;
  cancellationImages: string[];
  cancellationReviewStatus: string;
  cancellationReviewedBy?: string;
  cancellationReviewedAt?: Date;
  cancellationReviewNote?: string;
  dropoffBatchId?: Types.ObjectId | null;
  tripBatchId?: Types.ObjectId | null;
  createdByStaffId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const issueFlagSchema = new Schema<IIssueFlag>(
  {
    type: { type: String, required: true },
    note: { type: String, default: "" },
    reportedByRole: { type: String, required: true },
    reportedByUser: { type: String, default: "" },
    reportedAt: { type: Date, default: Date.now },
    state: { type: String, enum: ["open", "resolved"], default: "open" },
    resolvedBy: { type: String },
    resolvedAt: { type: Date },
    resolveNote: { type: String },
  },
  { _id: true }
);

const productSchema = new Schema(
  {
    uid: { type: String, default: "" },
    name: { type: String, default: "" },
    variant: { type: String, default: "" },
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
  },
  { _id: false }
);

const commonFields: Record<string, any> = {
  oid: { type: String, required: true, unique: true },
  clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
  status: { type: String, required: true, default: "pending" },
  statusHistory: { type: Schema.Types.Mixed, default: {} },
  lastStatusChangedAt: { type: Date, default: Date.now },
  customerPhone: { type: String, default: "" },
  customerPhoneNormalized: { type: String, default: "" },
  customerAddress: { type: String, default: "" },
  customerGovernorate: { type: String, default: "" },
  products: { type: [productSchema], default: [] },
  refundAmount: { type: Number, default: 0 },
  exchangeAmount: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  shippingFees: { type: Number, default: 0 },
  shippingHandledBy: { type: String, default: "CUSTOMER" },
  paymentMethod: { type: String, default: "CASH" },
  paymentStatus: { type: String, default: "UNPAID" },
  canOpenPackage: { type: Boolean, default: false },
  notes: { type: String, default: "" },
  courierId: { type: Schema.Types.ObjectId, ref: "Courier", default: null },
  courierNotes: { type: String, default: "" },
  deliveryAttempts: { type: Number, default: 0 },
  deliveryAttemptTimestamps: { type: Schema.Types.Mixed, default: {} },
  trackingNumber: { type: String, default: null },
  currentLocation: { type: String, default: null },
  hasOpenIssue: { type: Boolean, default: false },
  issueFlags: { type: [issueFlagSchema], default: [] },
  cancellationReason: { type: String, default: null },
  cancelledBy: { type: String, default: null },
  cancellationImages: { type: [String], default: [] },
  cancellationReviewStatus: { type: String, default: "NONE" },
  cancellationReviewedBy: { type: String, default: null },
  cancellationReviewedAt: { type: Date, default: null },
  cancellationReviewNote: { type: String, default: null },
  dropoffBatchId: { type: Schema.Types.ObjectId, ref: "DropoffBatch", default: null },
  tripBatchId: { type: Schema.Types.ObjectId, ref: "TripBatch", default: null },
  createdByStaffId: { type: Schema.Types.ObjectId, ref: "StaffMember", default: null },
};

// Compound index on status + lastStatusChangedAt
function addIndexes(schema: Schema) {
  schema.index({ status: 1, lastStatusChangedAt: 1 });
  schema.index({ status: 1 });
  schema.index({ hasOpenIssue: 1 });
  schema.index({ clientId: 1 });
  schema.index({ courierId: 1 });
  schema.index({ customerPhoneNormalized: 1 });
  schema.index({ oid: 1 }, { unique: true });
  schema.index({ currentLocation: 1 });
}

// Turuq orders
const TuruqOrderSchema = new Schema<IOrderBase & { customerName: string; type: string; courierAssignedAt?: Date }>(
  {
    ...commonFields,
    customerName: { type: String, default: "" },
    type: { type: String, default: "NORMAL" },
    courierAssignedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" }, collection: "turuq_orders" }
);
addIndexes(TuruqOrderSchema);

// Integration orders
const IntegrationOrderSchema = new Schema<IOrderBase & { customerFirstName: string; customerLastName: string; provider: string; externalId: string }>(
  {
    ...commonFields,
    customerFirstName: { type: String, default: "" },
    customerLastName: { type: String, default: "" },
    provider: { type: String, default: "SHOPIFY" },
    externalId: { type: String, default: "" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" }, collection: "integration_orders" }
);
addIndexes(IntegrationOrderSchema);

export const TuruqOrder = mongoose.models.TuruqOrder || mongoose.model("TuruqOrder", TuruqOrderSchema);
export const IntegrationOrder = mongoose.models.IntegrationOrder || mongoose.model("IntegrationOrder", IntegrationOrderSchema);

export function orderModelFor(model: string) {
  if (model === "turuq") return TuruqOrder;
  if (model === "integration") return IntegrationOrder;
  return null;
}

export function orderCollectionName(model: string) {
  return model === "turuq" ? "turuq_orders" : "integration_orders";
}
