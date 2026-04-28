import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface ITokenDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  tokenType: "Color" | "Number" | "String" | "Boolean";
  collection: mongoose.Types.ObjectId;
  group: mongoose.Types.ObjectId;
  lightValue: string;
  darkValue?: string;
  associatedComponents: string[];
  flagged: boolean;
  labels: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
}

const TokenSchema = new Schema<ITokenDoc>(
  {
    name: { type: String, required: true },
    tokenType: {
      type: String,
      enum: ["Color", "Number", "String", "Boolean"],
      required: true,
    },
    collection: {
      type: Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    lightValue: { type: String, required: true },
    darkValue: { type: String },
    associatedComponents: [{ type: String }],
    flagged: { type: Boolean, default: false },
    labels: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

TokenSchema.index({ name: "text" });
TokenSchema.index({ labels: 1 });
TokenSchema.index({ collection: 1, group: 1 });
TokenSchema.index({ flagged: 1 });

export const Token =
  (models.Token as Model<ITokenDoc> | undefined) || model<ITokenDoc>("Token", TokenSchema);
