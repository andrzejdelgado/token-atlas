import mongoose, { Schema, model, models, type Model } from "mongoose";

interface ICriterion {
  field: string;
  operator: string;
  value: string;
}

export interface ISavedQueryDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  criteria: ICriterion[];
  excludeCriteria: ICriterion[];
  createdAt: Date;
  updatedAt: Date;
}

const CriterionSchema = new Schema<ICriterion>(
  {
    field: { type: String, required: true },
    operator: { type: String, required: true },
    value: { type: String, default: "" },
  },
  { _id: false }
);

const SavedQuerySchema = new Schema<ISavedQueryDoc>(
  {
    name: { type: String, required: true },
    criteria: { type: [CriterionSchema], default: [] },
    excludeCriteria: { type: [CriterionSchema], default: [] },
  },
  { timestamps: true }
);

export const SavedQuery =
  (models.SavedQuery as Model<ISavedQueryDoc> | undefined) ||
  model<ISavedQueryDoc>("SavedQuery", SavedQuerySchema);
