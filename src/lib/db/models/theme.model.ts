import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IThemeDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  isBase: boolean;
  description?: string;
  createdAt: Date;
  position: number;
  status: "draft" | "approved";
  reviewerId?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
}

const ThemeSchema = new Schema<IThemeDoc>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    isBase: { type: Boolean, default: false },
    description: { type: String },
    position: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "approved"], default: "approved" },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

delete (models as Record<string, unknown>)["Theme"];
export const Theme = model<IThemeDoc>("Theme", ThemeSchema);
