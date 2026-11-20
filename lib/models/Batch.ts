import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITripBatch extends Document {
  bid: string;
  courierId: Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  ordersCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const TripBatchSchema = new Schema<ITripBatch>(
  {
    bid: { type: String, required: true },
    courierId: { type: Schema.Types.ObjectId, ref: "Courier", required: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
    ordersCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "trip_batches" }
);

export const TripBatch = mongoose.models.TripBatch || mongoose.model<ITripBatch>("TripBatch", TripBatchSchema);

export interface IDropoffBatch extends Document {
  bid: string;
  courierId: Types.ObjectId;
  destinationType: "BRAND" | "WAREHOUSE";
  clientId?: Types.ObjectId | null;
  startDate: Date;
  endDate?: Date;
  status: "OPEN" | "CLOSED";
  otp: string;
  handedOverBy?: string;
  finishedBy?: string;
  ordersCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DropoffBatchSchema = new Schema<IDropoffBatch>(
  {
    bid: { type: String, required: true },
    courierId: { type: Schema.Types.ObjectId, ref: "Courier", required: true },
    destinationType: { type: String, enum: ["BRAND", "WAREHOUSE"], default: "BRAND" },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", default: null },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
    status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN" },
    otp: { type: String, required: true },
    handedOverBy: { type: String, default: null },
    finishedBy: { type: String, default: null },
    ordersCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "dropoff_batches" }
);

export const DropoffBatch = mongoose.models.DropoffBatch || mongoose.model<IDropoffBatch>("DropoffBatch", DropoffBatchSchema);
