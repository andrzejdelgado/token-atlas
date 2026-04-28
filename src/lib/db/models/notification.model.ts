import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface INotificationDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type:
    | "token_created"
    | "token_deleted"
    | "import"
    | "export"
    | "figma_sync"
    | "storybook_sync"
    | "sync_error"
    | "peer_review_assigned";
  message: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotificationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "token_created",
        "token_deleted",
        "import",
        "export",
        "figma_sync",
        "storybook_sync",
        "sync_error",
        "peer_review_assigned",
      ],
      required: true,
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Notification =
  (models.Notification as Model<INotificationDoc> | undefined) ||
  model<INotificationDoc>("Notification", NotificationSchema);
