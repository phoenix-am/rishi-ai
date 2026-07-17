/**
 * Core business interfaces and domain structures
 */

export interface ICreator {
  id: string;
  email: string;
  createdAt: Date;
}

export interface IProject {
  id: string;
  creatorId: string;
  title: string;
  state: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IScriptBlock {
  id: string;
  projectId: string;
  sortOrder: number;
  isLocked: boolean;
  title: string;
  content: string;
}
