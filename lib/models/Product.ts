import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  uid: string;
  itemDescription: string;
  primaryClientId: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  size: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    uid: { type: String, required: true, unique: true },
    itemDescription: { type: String, required: true },
    primaryClientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    size: { type: String, default: "" },
    color: { type: String, default: "" },
  },
  { timestamps: true, collection: "products" }
);

export const Product = mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
