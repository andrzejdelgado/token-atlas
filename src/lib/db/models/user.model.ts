import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IUserDoc {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash?: string;
  googleId?: string;
  role: "admin" | "user";
  name?: string;
  avatarUrl?: string;
  preferences?: {
    language: "en" | "es";
    darkMode: boolean;
  };
  createdAt: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String },
    googleId: { type: String },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    name: { type: String },
    avatarUrl: { type: String },
    preferences: {
      language: { type: String, enum: ["en", "es"], default: "en" },
      darkMode: { type: Boolean, default: false },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const User =
  (models.User as Model<IUserDoc> | undefined) || model<IUserDoc>("User", UserSchema);
