import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface ICollectionDoc {
  _id: mongoose.Types.ObjectId;
  name: "Global" | "Text";
  description?: string;
  position: number;
}

const CollectionSchema = new Schema<ICollectionDoc>(
  {
    name: {
      type: String,
      enum: ["Global", "Text"],
      required: true,
      unique: true,
    },
    description: { type: String },
    position: { type: Number, default: 0 },
  },
  { timestamps: false }
);

export const Collection =
  (models.Collection as Model<ICollectionDoc> | undefined) ||
  model<ICollectionDoc>("Collection", CollectionSchema);
