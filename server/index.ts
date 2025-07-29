import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleLogin, handleRegister } from "./routes/auth";
import { 
  handleGetNotes, 
  handleGetNote, 
  handleCreateNote, 
  handleUpdateNote, 
  handleDeleteNote,
  handleGetPublicNote,
  handleGetPublicNotes,
  authenticateToken 
} from "./routes/notes";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Authentication routes
  app.post("/api/auth/register", handleRegister);
  app.post("/api/auth/login", handleLogin);

  // Protected notes routes
  app.get("/api/notes", authenticateToken, handleGetNotes);
  app.get("/api/notes/:id", authenticateToken, handleGetNote);
  app.post("/api/notes", authenticateToken, handleCreateNote);
  app.put("/api/notes/:id", authenticateToken, handleUpdateNote);
  app.delete("/api/notes/:id", authenticateToken, handleDeleteNote);

  // Public note routes (no authentication required)
  app.get("/api/public-notes", handleGetPublicNotes);
  app.get("/api/public/:publicUrl", handleGetPublicNote);

  return app;
}
