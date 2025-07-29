import { RequestHandler } from "express";
import { LoginRequest, RegisterRequest, AuthResponse, ApiResponse } from "@shared/api";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export const handleRegister: RequestHandler = async (req, res) => {
  try {
    const { email, password }: RegisterRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      } as ApiResponse);
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long"
      } as ApiResponse);
    }

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        error: "User already exists"
      } as ApiResponse);
    }

    // Hash password with bcrypt
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in database
    const [newUser] = await db.insert(users).values({
      email,
      password: hashedPassword,
    }).returning({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
    });

    // Generate JWT token
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: "7d" });

    const response: AuthResponse = {
      user: {
        id: newUser.id,
        email: newUser.email,
        createdAt: newUser.createdAt
      },
      token
    };

    res.status(201).json({
      success: true,
      data: response
    } as ApiResponse<AuthResponse>);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    } as ApiResponse);
  }
};

export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      } as ApiResponse);
    }

    // Find user in database
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials"
      } as ApiResponse);
    }

    // Verify password with bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials"
      } as ApiResponse);
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt
      },
      token
    };

    res.json({
      success: true,
      data: response
    } as ApiResponse<AuthResponse>);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    } as ApiResponse);
  }
};
