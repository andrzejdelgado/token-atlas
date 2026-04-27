export type TokenType = "Color" | "Number" | "String" | "Boolean";

export interface IToken {
  _id: string;
  name: string;
  tokenType: TokenType;
  collection: string | ICollection;
  group: string | IGroup;
  lightValue: string;
  darkValue?: string;
  associatedComponents: string[];
  flagged: boolean;
  labels: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | IUser;
  updatedBy: string | IUser;
  /** Present when the token was fetched with a non-base theme selected. */
  _overridden?: boolean;
}

export interface ICollection {
  _id: string;
  name: "Global" | "Text";
  description?: string;
  position?: number;
}

export interface IGroup {
  _id: string;
  name: string;
  collection: string | ICollection;
  parent: string | IGroup | null;
  path: string;
  depth: number;
  position?: number;
  sortPath?: string;
}

export interface ITheme {
  _id: string;
  name: string;
  slug: string;
  isBase: boolean;
  description?: string;
  createdAt: Date;
  position?: number;
}

export interface IThemeOverride {
  _id: string;
  theme: string | ITheme;
  token: string | IToken;
  lightValue?: string;
  darkValue?: string;
}

export interface IUser {
  _id: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  role: UserRole;
  name?: string;
  avatarUrl?: string;
  preferences?: {
    language: "en" | "es";
    darkMode: boolean;
  };
  createdAt: Date;
}

export type UserRole = "admin" | "user";

export interface GroupTree extends IGroup {
  children: GroupTree[];
  tokenCount: number;
  position: number;
  sortPath: string;
}

export interface BulkRenameOptions {
  prefix?: string;
  suffix?: string;
  swap?: { find: string; replace: string };
  remove?: string;
}

export interface BulkRenamePreview {
  tokenId: string;
  originalName: string;
  newName: string;
  changes: Array<{
    type: "prefix" | "suffix" | "swap" | "remove";
    segment: string;
  }>;
}
