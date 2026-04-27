export interface TokenFilters {
  search?: string;
  tokenTypes?: string[];
  collectionIds?: string[];
  groupIds?: string[];
  themeIds?: string[];
  flagged?: boolean;
  labels?: string[];
  components?: string[];
  modifiedAfter?: string;
  modifiedBefore?: string;
}

export interface ExcludeFilters {
  search?: string;
  collectionId?: string;
  groupId?: string;
  themeId?: string;
  flagged?: boolean;
  tokenTypes?: string[];
  labels?: string[];
  components?: string[];
}
