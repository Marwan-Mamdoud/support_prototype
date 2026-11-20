import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISupportNote extends Document {
  staffId: Types.ObjectId;
  text: string;
  done: boolean;
  createdAt: Date;
  doneAt?: Date;
}

const SupportNoteSchema = new Schema<ISupportNote>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "StaffMember", required: true, index: true },
    text: { type: String, required: true },
    done: { type: Boolean, default: false },
    doneAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false }, collection: "support_notes" }
);

export const SupportNote = mongoose.models.SupportNote || mongoose.model<ISupportNote>("SupportNote", SupportNoteSchema);
