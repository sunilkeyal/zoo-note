export interface Folder {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  _id: string;
  title: string;
  content: string;
  folderId?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
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
