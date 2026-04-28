export type NotificationType =
  | "token_created"
  | "token_deleted"
  | "import"
  | "export"
  | "figma_sync"
  | "storybook_sync"
  | "sync_error"
  | "peer_review_assigned";

export interface INotification {
  _id: string;
  userId: string;
  type: NotificationType;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
