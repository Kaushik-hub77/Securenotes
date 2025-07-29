/**
 * Shared types between client and server for Notes application
 */

// Authentication types
export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Note types
export interface Note {
  id: string;
  title: string;
  content: string;
  isPublic: boolean;
  isEncrypted: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  publicUrl?: string;
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  isPublic?: boolean;
  isEncrypted?: boolean;
}

export interface UpdateNoteRequest {
  id: string;
  title?: string;
  content?: string;
  isPublic?: boolean;
  isEncrypted?: boolean;
}

export interface NotesResponse {
  notes: Note[];
  total: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Legacy demo type
export interface DemoResponse {
  message: string;
}
