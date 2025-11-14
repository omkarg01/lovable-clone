import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.js';
import { signupSchema, signinSchema, type SignupInput, type SigninInput } from '../validations/auth.validation.js';
import { ZodIssue } from 'zod';
import prisma from '../lib/prisma.js';

export const signin = async (req: Request, res: Response) => {
  try {
    // Validate input using Zod schema
    const validationResult = signinSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue: ZodIssue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errorMessages 
      });
    }

    const { username, password } = req.body;

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
    });

    // Check if user exists
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = generateToken({ id: user.id, username: user.username });

    // Return user data (excluding password) and token
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(200).json({
      id: userWithoutPassword.id,
      username : userWithoutPassword.username,
      token
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'An error occurred during signin' });
  }
};

export const signup = async (req: Request, res: Response) => {
  try {
    console.log("req.body", req.body);
    // Validate input using Zod schema
    const validationResult = signupSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue: ZodIssue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errorMessages 
      });
    }
    
    const { username, password } = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: [{ field: 'username', message: 'Username already exists' }] 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username
    });

    // Return user data and token (excluding password)
    const { password: _, ...userData } = user;
    res.status(201).json({ 
      success: true,
      data: { 
        user: userData, 
        token 
      } 
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
};
