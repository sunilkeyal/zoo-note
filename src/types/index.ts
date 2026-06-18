export interface Folder {
  _id: string;
  name: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface Note {
  _id: string;
  title: string;
  content: string;
  folderId?: string;
  folderName?: string;
  userId?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface NoteInput {
  title: string;
  content?: string;
  folderId?: string;
  position?: number;
}

export interface NoteUpdate {
  title?: string;
  content?: string;
  folderId?: string;
  position?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TrashRestoreRequest {
  noteIds: string[];
  folderIds: string[];
}

export interface TrashDeleteRequest {
  noteIds: string[];
  folderIds: string[];
}
