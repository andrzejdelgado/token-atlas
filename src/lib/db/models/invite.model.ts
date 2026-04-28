import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IInviteDoc {
  _id: mongoose.Types.ObjectId;
  email: string;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const InviteSchema = new Schema<IInviteDoc>(
  {
    email: { type: String, required: true, lowercase: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Invite =
  (models.Invite as Model<IInviteDoc> | undefined) || model<IInviteDoc>("Invite", InviteSchema);
