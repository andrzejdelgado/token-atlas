import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IGroupDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  collection: mongoose.Types.ObjectId;
  parent: mongoose.Types.ObjectId | null;
  path: string;
  depth: number;
  position: number;
  sortPath: string;
}

const GroupSchema = new Schema<IGroupDoc>(
  {
    name: { type: String, required: true },
    collection: {
      type: Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
    },
    parent: { type: Schema.Types.ObjectId, ref: "Group", default: null },
    path: { type: String, required: true },
    depth: { type: Number, required: true, default: 0 },
    position: { type: Number, default: 0 },
    sortPath: { type: String, default: "" },
  },
  { timestamps: false }
);

GroupSchema.index({ collection: 1, path: 1 });

export const Group =
  (models.Group as Model<IGroupDoc> | undefined) || model<IGroupDoc>("Group", GroupSchema);
