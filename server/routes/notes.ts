import { RequestHandler } from "express";
import { CreateNoteRequest, UpdateNoteRequest, NotesResponse, ApiResponse } from "@shared/api";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../db";
import { notes, users } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "your-encryption-key-32-chars-long!!";

// JWT authentication middleware
export const authenticateToken: RequestHandler = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Access token required"
    } as ApiResponse);
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: "Invalid or expired token"
      } as ApiResponse);
    }
    req.user = decoded;
    next();
  });
};

// Encryption/Decryption utilities
const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
};

const decrypt = (encryptedText: string): string => {
  try {
    const textParts = encryptedText.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encrypted = textParts.join(":");
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    return "[Decryption Failed]";
  }
};

export const handleGetNotes: RequestHandler = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const userNotes = await db.select().from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.updatedAt));

    // Decrypt encrypted notes with error handling
    const decryptedNotes = userNotes.map(note => {
      try {
        return {
          ...note,
          content: note.isEncrypted ? decrypt(note.content) : note.content
        };
      } catch (error) {
        console.error('Error decrypting note:', note.id, error);
        return {
          ...note,
          content: note.isEncrypted ? "[Decryption Error - Content may be corrupted]" : note.content
        };
      }
    });

    res.json({
      success: true,
      data: {
        notes: decryptedNotes,
        total: decryptedNotes.length
      }
    } as ApiResponse<NotesResponse>);
  } catch (error) {
    console.error("Get notes error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch notes"
    } as ApiResponse);
  }
};

export const handleGetNote: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const [note] = await db.select().from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1);

    if (!note) {
      return res.status(404).json({
        success: false,
        error: "Note not found"
      } as ApiResponse);
    }

    // Decrypt if encrypted
    const decryptedNote = {
      ...note,
      content: note.isEncrypted ? decrypt(note.content) : note.content
    };

    res.json({
      success: true,
      data: decryptedNote
    } as ApiResponse);
  } catch (error) {
    console.error("Get note error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch note"
    } as ApiResponse);
  }
};

export const handleCreateNote: RequestHandler = async (req, res) => {
  try {
    const { title, content, isPublic = false, isEncrypted = false }: CreateNoteRequest = req.body;
    const userId = req.user.userId;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: "Title and content are required"
      } as ApiResponse);
    }

    const [newNote] = await db.insert(notes).values({
      title,
      content: isEncrypted ? encrypt(content) : content,
      isPublic,
      isEncrypted,
      userId,
      publicUrl: isPublic ? crypto.randomBytes(16).toString("hex") : null,
    }).returning();

    // Return decrypted content for response
    const responseNote = {
      ...newNote,
      content: isEncrypted ? content : newNote.content
    };

    res.status(201).json({
      success: true,
      data: responseNote
    } as ApiResponse);
  } catch (error) {
    console.error("Create note error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create note"
    } as ApiResponse);
  }
};

export const handleUpdateNote: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, isPublic, isEncrypted }: UpdateNoteRequest = req.body;
    const userId = req.user.userId;

    const [existingNote] = await db.select().from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1);

    if (!existingNote) {
      return res.status(404).json({
        success: false,
        error: "Note not found"
      } as ApiResponse);
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) {
      updateData.content = isEncrypted !== false ? encrypt(content) : content;
    }
    if (isPublic !== undefined) {
      updateData.isPublic = isPublic;
      if (isPublic && !existingNote.publicUrl) {
        updateData.publicUrl = crypto.randomBytes(16).toString("hex");
      }
    }
    if (isEncrypted !== undefined) updateData.isEncrypted = isEncrypted;

    const [updatedNote] = await db.update(notes)
      .set(updateData)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();

    // Return decrypted content for response
    const responseNote = {
      ...updatedNote,
      content: updatedNote.isEncrypted ? decrypt(updatedNote.content) : updatedNote.content
    };

    res.json({
      success: true,
      data: responseNote
    } as ApiResponse);
  } catch (error) {
    console.error("Update note error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update note"
    } as ApiResponse);
  }
};

export const handleDeleteNote: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const deletedNotes = await db.delete(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();

    if (deletedNotes.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Note not found"
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: { message: "Note deleted successfully" }
    } as ApiResponse);
  } catch (error) {
    console.error("Delete note error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete note"
    } as ApiResponse);
  }
};

export const handleGetPublicNote: RequestHandler = async (req, res) => {
  try {
    const { publicUrl } = req.params;

    const [note] = await db.select().from(notes)
      .where(and(eq(notes.publicUrl, publicUrl), eq(notes.isPublic, true)))
      .limit(1);

    if (!note) {
      return res.status(404).json({
        success: false,
        error: "Public note not found"
      } as ApiResponse);
    }

    // Don't decrypt public notes - they shouldn't be encrypted for sharing
    const publicNote = {
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    };

    res.json({
      success: true,
      data: publicNote
    } as ApiResponse);
  } catch (error) {
    console.error("Get public note error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch public note"
    } as ApiResponse);
  }
};

export const handleGetPublicNotes: RequestHandler = async (req, res) => {
  try {
    const publicNotes = await db.select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      publicUrl: notes.publicUrl,
    }).from(notes)
      .where(eq(notes.isPublic, true))
      .orderBy(desc(notes.updatedAt))
      .limit(50); // Limit for performance

    res.json({
      success: true,
      data: {
        notes: publicNotes,
        total: publicNotes.length
      }
    } as ApiResponse<NotesResponse>);
  } catch (error) {
    console.error("Get public notes error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch public notes"
    } as ApiResponse);
  }
};
