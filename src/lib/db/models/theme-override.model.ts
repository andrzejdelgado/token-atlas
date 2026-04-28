import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IThemeOverrideDoc {
  _id: mongoose.Types.ObjectId;
  theme: mongoose.Types.ObjectId;
  token: mongoose.Types.ObjectId;
  lightValue?: string;
  darkValue?: string;
  disabled?: boolean;
}

const ThemeOverrideSchema = new Schema<IThemeOverrideDoc>(
  {
    theme: { type: Schema.Types.ObjectId, ref: "Theme", required: true },
    token: { type: Schema.Types.ObjectId, ref: "Token", required: true },
    lightValue: { type: String },
    darkValue: { type: String },
    disabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ThemeOverrideSchema.index({ theme: 1, token: 1 }, { unique: true });
ThemeOverrideSchema.index({ token: 1 });

export const ThemeOverride =
  (models.ThemeOverride as Model<IThemeOverrideDoc> | undefined) ||
  model<IThemeOverrideDoc>("ThemeOverride", ThemeOverrideSchema);
