import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface ISettingsDoc {
  _id: mongoose.Types.ObjectId;
  figmaPersonalAccessToken?: string;
  figmaFileKey?: string;
  storybookGithubToken?: string;
  storybookRepoUrl?: string;
  storybookBranch: string;
  storybookTokenPath: string;
  lastFigmaSync?: Date;
  lastStorybookSync?: Date;
}

const SettingsSchema = new Schema<ISettingsDoc>(
  {
    figmaPersonalAccessToken: { type: String },
    figmaFileKey: { type: String },
    storybookGithubToken: { type: String },
    storybookRepoUrl: { type: String },
    storybookBranch: { type: String, default: "main" },
    storybookTokenPath: {
      type: String,
      default: "tokens/tokens.json",
    },
    lastFigmaSync: { type: Date },
    lastStorybookSync: { type: Date },
  },
  { timestamps: false }
);

export const Settings =
  (models.Settings as Model<ISettingsDoc> | undefined) ||
  model<ISettingsDoc>("Settings", SettingsSchema);
