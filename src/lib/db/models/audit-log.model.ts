import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IAuditLogDoc {
  _id: mongoose.Types.ObjectId;
  tokenId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action:
    | "created"
    | "renamed"
    | "moved"
    | "value_changed"
    | "flagged"
    | "unflagged"
    | "labeled"
    | "unlabeled"
    | "theme_added"
    | "theme_removed"
    | "deleted";
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLogDoc>(
  {
    tokenId: { type: Schema.Types.ObjectId, ref: "Token", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: [
        "created",
        "renamed",
        "moved",
        "value_changed",
        "flagged",
        "unflagged",
        "labeled",
        "unlabeled",
        "theme_added",
        "theme_removed",
        "deleted",
      ],
      required: true,
    },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

AuditLogSchema.index({ tokenId: 1, timestamp: -1 });

export const AuditLog =
  (models.AuditLog as Model<IAuditLogDoc> | undefined) ||
  model<IAuditLogDoc>("AuditLog", AuditLogSchema);
