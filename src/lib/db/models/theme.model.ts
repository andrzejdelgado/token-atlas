import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IThemeDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  isBase: boolean;
  description?: string;
  createdAt: Date;
  position: number;
}

const ThemeSchema = new Schema<IThemeDoc>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    isBase: { type: Boolean, default: false },
    description: { type: String },
    position: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Theme =
  (models.Theme as Model<IThemeDoc> | undefined) || model<IThemeDoc>("Theme", ThemeSchema);
