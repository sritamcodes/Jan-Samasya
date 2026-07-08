import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { 
  feedbacks, 
  themes, 
  users,
  registerUser,
  hashPassword,
  seedDatabase, 
  calculatePriorityScore, 
  isGeminiTestedSuccessfully 
} from './server/db';
import { 
  testGeminiConnection, 
  classifySafety, 
  analyzeCivicFeedback, 
  matchThemeSemantically, 
  analyzeComplaintImage, 
  generateThemeAIContent,
  isGeminiActive
} from './server/geminiService';
import { CivicFeedback, CivicTheme, WorkflowStatus, BudgetBreakdownItem, HumanReview } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Increase payload size to support base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cryptographically Secure Session Store
export interface SessionData {
  userId: string;
  username: string;
  displayName: string;
  role: 'citizen' | 'planner';
  expiresAt: number;
}

export const activeSessions = new Map<string, SessionData>();

// Authentication Middleware
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const session = activeSessions.get(token);

  if (session) {
    if (Date.now() > session.expiresAt) {
      activeSessions.delete(token); // expired session
    } else {
      (req as any).user = session;
    }
  }
  next();
}

app.use(authenticate);

// Role Enforcer Middleware
export function requireRole(role: 'citizen' | 'planner') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || user.role !== role) {
      return res.status(401).json({ error: `Unauthorized. Authentication as ${role} required.` });
    }
    next();
  };
}

// Practical rate-limiting state
const ipSubmissionTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_SUBMISSIONS_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (!ipSubmissionTimestamps.has(ip)) {
    ipSubmissionTimestamps.set(ip, [now]);
    return false;
  }
  const timestamps = ipSubmissionTimestamps.get(ip)!.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    return true;
  }
  timestamps.push(now);
  ipSubmissionTimestamps.set(ip, timestamps);
  return false;
}

// Strict input sanitization helper to prevent XSS and tag-based injections
export function sanitizeInput(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '') // Strip out script blocks
    .replace(/<[^>]*>/g, '') // Strip out all other HTML tags
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove non-printable control characters
    .trim();
}

// Strong password policy checker: >= 8 characters, >= 1 uppercase, >= 1 lowercase, >= 1 number
export function isPasswordStrong(password: string): boolean {
  if (password.length < 8) return false;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasUppercase && hasLowercase && hasNumber;
}

// Separate rate-limiting state for Authentication requests to stop brute force
const ipAuthTimestamps = new Map<string, number[]>();
const AUTH_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_AUTH_ATTEMPTS = 10; // Max 10 logins/registrations per minute per IP

function isAuthRateLimited(ip: string): boolean {
  const now = Date.now();
  if (!ipAuthTimestamps.has(ip)) {
    ipAuthTimestamps.set(ip, [now]);
    return false;
  }
  const timestamps = ipAuthTimestamps.get(ip)!.filter(t => now - t < AUTH_WINDOW_MS);
  if (timestamps.length >= MAX_AUTH_ATTEMPTS) {
    return true;
  }
  timestamps.push(now);
  ipAuthTimestamps.set(ip, timestamps);
  return false;
}

// Ensure database is initially seeded
seedDatabase();

// In-memory OTP storage for registration and password reset
export interface OtpRecord {
  otp: string;
  expiresAt: number;
  passwordHash?: string;
  salt?: string;
  displayName?: string;
  password?: string;
}

const registerOtps = new Map<string, OtpRecord>();
const resetOtps = new Map<string, OtpRecord>();

// Helper to generate a secure 6-digit numeric OTP code
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// API Endpoints

// Authentication Endpoints

// 1. Send OTP for Registration
app.post('/api/auth/send-register-otp', (req: Request, res: Response) => {
  const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  if (isAuthRateLimited(ip)) {
    console.warn(`[SECURITY][WARNING] Registration rate limit triggered for IP: ${ip}`);
    return res.status(429).json({ error: "Too many authentication attempts. Please wait a minute and try again." });
  }

  const { username, password, displayName } = req.body;
  if (!username || !password || !displayName) {
    return res.status(400).json({ error: "Username, password, and display name are required." });
  }

  const cleanUsername = sanitizeInput(username).toLowerCase();
  const cleanDisplayName = sanitizeInput(displayName);

  // Check if username already exists in database
  const existing = users.find(u => u.username === cleanUsername);
  if (existing) {
    return res.status(400).json({ error: "Username already registered." });
  }

  // Username validation: alphanumeric, dashes, underscores, length 3 to 20
  const usernameRegex = /^[a-z0-9_\-]{3,20}$/;
  if (!usernameRegex.test(cleanUsername)) {
    return res.status(400).json({ error: "Username must be 3-20 characters long and contain only lowercase letters, numbers, hyphens, or underscores." });
  }

  if (cleanDisplayName.length < 2 || cleanDisplayName.length > 50) {
    return res.status(400).json({ error: "Display name must be between 2 and 50 characters long." });
  }

  if (!isPasswordStrong(password)) {
    return res.status(400).json({ error: "Password does not meet complexity rules. It must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number." });
  }

  // Generate and store OTP
  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity
  registerOtps.set(cleanUsername, {
    otp,
    expiresAt,
    password,
    displayName: cleanDisplayName
  });

  console.info(`[SECURITY][INFO] Registration OTP [${otp}] generated for username: ${cleanUsername}`);

  res.json({
    success: true,
    message: "OTP code successfully generated and simulated. Enter the code to complete registration.",
    otpForTesting: otp
  });
});

// 2. Verify OTP and Complete Registration
app.post('/api/auth/register-verify', (req: Request, res: Response) => {
  const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  if (isAuthRateLimited(ip)) {
    return res.status(429).json({ error: "Too many authentication attempts. Please wait a minute and try again." });
  }

  const { username, otpCode } = req.body;
  if (!username || !otpCode) {
    return res.status(400).json({ error: "Username and OTP code are required." });
  }

  const cleanUsername = sanitizeInput(username).toLowerCase();
  const record = registerOtps.get(cleanUsername);

  if (!record) {
    return res.status(400).json({ error: "No active registration request found for this username." });
  }

  if (Date.now() > record.expiresAt) {
    registerOtps.delete(cleanUsername);
    return res.status(400).json({ error: "OTP has expired. Please request a new code." });
  }

  if (record.otp !== otpCode.trim()) {
    return res.status(400).json({ error: "Invalid OTP code. Please check and try again." });
  }

  try {
    const newUser = registerUser(cleanUsername, record.password!, record.displayName!, 'citizen');
    registerOtps.delete(cleanUsername); // Clear record on success

    console.info(`[SECURITY][INFO] Citizen successfully registered after OTP verification: ${cleanUsername}`);
    res.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.displayName,
        role: newUser.role
      }
    });
  } catch (err: any) {
    console.warn(`[SECURITY][WARNING] Registration verify failed for username ${cleanUsername}: ${err.message}`);
    res.status(400).json({ error: err.message || "Registration failed." });
  }
});

// 3. Send OTP for Forgot Password
app.post('/api/auth/send-forgot-otp', (req: Request, res: Response) => {
  const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  if (isAuthRateLimited(ip)) {
    return res.status(429).json({ error: "Too many attempts. Please wait a minute and try again." });
  }

  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required." });
  }

  const cleanUsername = sanitizeInput(username).toLowerCase().trim();
  const user = users.find(u => u.username === cleanUsername);

  if (!user) {
    // Return subtle success to prevent user enumeration, or direct helpful error if preferred. Let's do clear error since it is a local app.
    return res.status(404).json({ error: "Username not found. Please verify your credentials." });
  }

  // Generate OTP
  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity
  resetOtps.set(cleanUsername, {
    otp,
    expiresAt
  });

  console.info(`[SECURITY][INFO] Password Reset OTP [${otp}] generated for user: ${cleanUsername}`);

  res.json({
    success: true,
    message: "OTP reset code generated successfully.",
    otpForTesting: otp
  });
});

// 4. Verify OTP and Reset Password
app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  if (isAuthRateLimited(ip)) {
    return res.status(429).json({ error: "Too many attempts. Please wait a minute and try again." });
  }

  const { username, otpCode, newPassword } = req.body;
  if (!username || !otpCode || !newPassword) {
    return res.status(400).json({ error: "Username, OTP code, and new password are required." });
  }

  const cleanUsername = sanitizeInput(username).toLowerCase().trim();
  const record = resetOtps.get(cleanUsername);

  if (!record) {
    return res.status(400).json({ error: "No password reset request found for this username." });
  }

  if (Date.now() > record.expiresAt) {
    resetOtps.delete(cleanUsername);
    return res.status(400).json({ error: "OTP has expired. Please request a new password reset." });
  }

  if (record.otp !== otpCode.trim()) {
    return res.status(400).json({ error: "Invalid OTP reset code." });
  }

  if (!isPasswordStrong(newPassword)) {
    return res.status(400).json({ error: "New password does not meet complexity rules. It must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number." });
  }

  const user = users.find(u => u.username === cleanUsername);
  if (!user) {
    return res.status(404).json({ error: "User record not found." });
  }

  // Update password hash and salt securely
  const newSalt = crypto.randomBytes(16).toString('hex');
  user.salt = newSalt;
  user.passwordHash = hashPassword(newPassword, newSalt);

  // Clear OTP record
  resetOtps.delete(cleanUsername);

  console.info(`[SECURITY][INFO] Password reset successfully verified for user: ${cleanUsername}`);
  res.json({
    success: true,
    message: "Your password has been reset successfully. You can now log in with your new password."
  });
});

// a. Original Register Direct (fallback / legacy support just in case, but updated for compatibility)
app.post('/api/auth/register', (req: Request, res: Response) => {
  const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  if (isAuthRateLimited(ip)) {
    console.warn(`[SECURITY][WARNING] Registration rate limit triggered for IP: ${ip}`);
    return res.status(429).json({ error: "Too many authentication attempts. Please wait a minute and try again." });
  }

  const { username, password, displayName } = req.body;
  if (!username || !password || !displayName) {
    return res.status(400).json({ error: "Username, password, and display name are required." });
  }

  // Sanitize and validate inputs strictly
  const cleanUsername = sanitizeInput(username).toLowerCase();
  const cleanDisplayName = sanitizeInput(displayName);

  // Username validation: alphanumeric, dashes, underscores, length 3 to 20
  const usernameRegex = /^[a-z0-9_\-]{3,20}$/;
  if (!usernameRegex.test(cleanUsername)) {
    return res.status(400).json({ error: "Username must be 3-20 characters long and contain only lowercase letters, numbers, hyphens, or underscores." });
  }

  if (cleanDisplayName.length < 2 || cleanDisplayName.length > 50) {
    return res.status(400).json({ error: "Display name must be between 2 and 50 characters long." });
  }

  if (!isPasswordStrong(password)) {
    return res.status(400).json({ error: "Password does not meet complexity rules. It must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number." });
  }

  try {
    const newUser = registerUser(cleanUsername, password, cleanDisplayName, 'citizen');
    console.info(`[SECURITY][INFO] Citizen successfully registered: ${cleanUsername}`);
    res.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.displayName,
        role: newUser.role
      }
    });
  } catch (err: any) {
    console.warn(`[SECURITY][WARNING] Registration failed for username ${cleanUsername}: ${err.message}`);
    res.status(400).json({ error: err.message || "Registration failed." });
  }
});

// b. Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  if (isAuthRateLimited(ip)) {
    console.warn(`[SECURITY][WARNING] Login rate limit triggered for IP: ${ip}`);
    return res.status(429).json({ error: "Too many login attempts. Please wait a minute and try again." });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const cleanUsername = sanitizeInput(username).trim().toLowerCase();
  const user = users.find(u => u.username === cleanUsername);

  if (!user || hashPassword(password, user.salt) !== user.passwordHash) {
    console.warn(`[SECURITY][WARNING] Invalid login attempt for username: ${cleanUsername} from IP: ${ip}`);
    return res.status(401).json({ error: "Invalid username or password." });
  }

  // Create highly secure 32-byte cryptographically random session token
  const token = crypto.randomBytes(32).toString('hex');
  const session: SessionData = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    expiresAt: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
  };

  activeSessions.set(token, session);
  console.info(`[SECURITY][INFO] User logged in: ${user.username} (${user.role})`);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    }
  });
});

// c. Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    activeSessions.delete(token);
  }
  res.json({ success: true, message: "Logged out successfully." });
});

// d. Get current user
app.get('/api/auth/me', (req: Request, res: Response) => {
  const sessionUser = (req as any).user;
  if (!sessionUser) {
    return res.json({ user: null });
  }
  res.json({
    user: {
      id: sessionUser.userId,
      username: sessionUser.username,
      displayName: sessionUser.displayName,
      role: sessionUser.role
    }
  });
});

// e. Get feedbacks submitted by currently logged in citizen
app.get('/api/my-feedbacks', (req: Request, res: Response) => {
  const sessionUser = (req as any).user;
  if (!sessionUser) {
    return res.status(401).json({ error: "Authentication required." });
  }
  const citizenFeedbacks = feedbacks.filter(f => f.createdBy === sessionUser.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(citizenFeedbacks);
});


// 1. Get status of server and Gemini API
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    serverOnline: true,
    geminiActive: isGeminiActive(),
    geminiTestedSuccessfully: isGeminiTestedSuccessfully,
    environment: process.env.NODE_ENV || 'development',
    configurationRequired: !isGeminiActive(),
    configMessage: isGeminiActive() ? "Gemini service is configured and ready." : "Gemini service is not configured. Add the required API secret in the project configuration."
  });
});

// 2. Test Gemini connection explicitly
app.post('/api/test-gemini', requireRole('planner'), async (req: Request, res: Response) => {
  const result = await testGeminiConnection();
  res.json(result);
});

// 3. Reseed Database
app.post('/api/seed', requireRole('planner'), (req: Request, res: Response) => {
  seedDatabase();
  res.json({ success: true, message: "Database re-seeded with realistic Indian constituency data." });
});

// 4. Get all themes
app.get('/api/themes', (req: Request, res: Response) => {
  // Sort themes by priority score descending
  const sortedThemes = [...themes].sort((a, b) => b.priorityScore - a.priorityScore);
  res.json(sortedThemes);
});

// 5. Get details of a single theme
app.get('/api/themes/:id', (req: Request, res: Response) => {
  const theme = themes.find(t => t.id === req.params.id);
  if (!theme) {
    return res.status(404).json({ error: "Theme not found" });
  }
  // Get all associated reports
  const associatedFeedbacks = feedbacks.filter(f => f.themeId === theme.id);
  res.json({
    theme,
    reports: associatedFeedbacks
  });
});

// 6. Get all citizen feedbacks
app.get('/api/feedbacks', requireRole('planner'), (req: Request, res: Response) => {
  // Return sorted by creation date descending
  const sortedFeedbacks = [...feedbacks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(sortedFeedbacks);
});

// 7. Submit civic report (text and optional photo)
app.post('/api/submit-feedback', async (req: Request, res: Response) => {
  const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  if (isRateLimited(ip)) {
    console.warn(`[SECURITY][WARNING] Feedback submission rate limit triggered for IP: ${ip}`);
    return res.status(429).json({
      error: "Rate limit exceeded. Please wait a minute before sending another report.",
      safeCategory: "RATE_LIMIT"
    });
  }

  const { rawFeedback, inputMethod, language, locality, imageBase64, imageMimeType } = req.body;

  if (!rawFeedback || typeof rawFeedback !== 'string') {
    return res.status(400).json({ error: "Feedback content is required and must be a string." });
  }

  // Strict sanitization of raw feedback text
  const cleanFeedback = sanitizeInput(rawFeedback);
  if (cleanFeedback.length === 0) {
    return res.status(400).json({ error: "Feedback content is invalid after sanitization." });
  }
  if (cleanFeedback.length > 1000) {
    return res.status(400).json({ error: "Feedback content exceeds the maximum allowed length of 1000 characters." });
  }

  // Enforce allowed input methods
  const allowedInputMethods = ['TYPE', 'SPEAK'];
  const finalInputMethod = (inputMethod || 'TYPE').toUpperCase();
  if (!allowedInputMethods.includes(finalInputMethod)) {
    return res.status(400).json({ error: `Invalid input method. Allowed values: ${allowedInputMethods.join(', ')}` });
  }

  // Enforce allowed language codes
  const allowedLanguages = ['en', 'hi', 'or'];
  const detectedLanguage = language || 'en';
  if (!allowedLanguages.includes(detectedLanguage)) {
    return res.status(400).json({ error: `Invalid language code. Allowed values: ${allowedLanguages.join(', ')}` });
  }

  // Sanitize and limit locality
  const cleanLocality = sanitizeInput(locality || 'Unknown Locality');
  if (cleanLocality.length > 100) {
    return res.status(400).json({ error: "Locality text exceeds the maximum allowed length of 100 characters." });
  }

  // Image upload guardrails
  if (imageBase64 && !imageMimeType) {
    return res.status(400).json({ error: "imageMimeType is required when sending an image." });
  }
  if (imageMimeType) {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(imageMimeType.toLowerCase())) {
      return res.status(400).json({ error: `Unsupported image type. Allowed formats: ${allowedMimeTypes.join(', ')}` });
    }
    // Limit image size estimation from base64 string length (~3/4 of raw size)
    const base64Length = imageBase64 ? imageBase64.length : 0;
    const sizeInBytes = (base64Length * 3) / 4;
    if (sizeInBytes > 10 * 1024 * 1024) { // 10 MB limit
      return res.status(400).json({ error: "Image size exceeds the maximum limit of 10MB." });
    }
  }

  // Create feedback scaffold
  const feedbackId = `fb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const sessionUser = (req as any).user;
  const newFeedback: CivicFeedback = {
    id: feedbackId,
    rawFeedback: cleanFeedback,
    inputMethod: finalInputMethod as 'TYPE' | 'SPEAK',
    language: detectedLanguage,
    locality: cleanLocality,
    createdAt: new Date().toISOString(),
    processingStatus: 'PENDING_SAFETY',
    evidence: {
      hasImage: false,
      evidenceStatus: 'NO_VISUAL_EVIDENCE'
    },
    ...(sessionUser ? {
      createdBy: sessionUser.userId,
      createdByName: sessionUser.displayName
    } : {})
  };

  try {
    // Step 1: Safety Classification
    const safety = await classifySafety(cleanFeedback);
    newFeedback.safetyResult = safety;

    if (!safety.allowProcessing) {
      newFeedback.processingStatus = 'REJECTED_SAFETY';
      feedbacks.push(newFeedback);
      return res.json({
        success: false,
        safetyRejected: true,
        feedback: newFeedback,
        message: safety.userMessage || "Your submission was flagged by the automated safety system."
      });
    }

    newFeedback.processingStatus = 'SAFE_CIVIC';

    // Step 2: Civic Analysis with Gemini
    const analysis = await analyzeCivicFeedback(cleanFeedback, detectedLanguage);
    // Overrides locality if extracted is more specific, otherwise use user input
    if (analysis.locality && analysis.locality !== 'Unknown Locality') {
      newFeedback.locality = analysis.locality;
    } else {
      analysis.locality = newFeedback.locality; // keep the user inputted locality
    }
    newFeedback.analysis = analysis;
    newFeedback.processingStatus = 'PENDING_MATCH';

    // Step 3: Handle photo evidence if provided
    if (imageBase64 && imageMimeType) {
      newFeedback.evidence = {
        hasImage: true,
        imageReference: imageBase64, // Keep in memory/state
        evidenceStatus: 'PENDING_AI_SCREENING'
      };

      // Perform Gemini Multimodal analysis
      const screening = await analyzeComplaintImage(imageBase64, imageMimeType, cleanFeedback);
      newFeedback.evidence.aiScreening = screening;
      newFeedback.evidence.evidenceStatus = 'PENDING_HUMAN_VERIFICATION';
      newFeedback.evidence.humanReview = {
        reviewed: false,
        decision: null,
        reviewerNote: '',
        reviewedAt: null,
        externalCheckUsed: false,
        externalCheckProvider: null,
        externalCheckResultSummary: null
      };
    }

    // Step 4: Semantic Community Need Matching
    const matchResult = await matchThemeSemantically(analysis, themes);
    
    if (matchResult.matched && matchResult.themeId) {
      // Add to existing theme
      newFeedback.themeId = matchResult.themeId;
      newFeedback.processingStatus = 'MATCHED';
      
      const theme = themes.find(t => t.id === matchResult.themeId);
      if (theme) {
        // Increment reports and recalculate metrics
        theme.reportCount += 1;
        
        // Find all matched feedbacks to average urgency/severity
        const matchedFeedbacks = feedbacks.filter(f => f.themeId === theme.id && f.analysis);
        matchedFeedbacks.push(newFeedback); // Include the new one
        
        const totalUrgency = matchedFeedbacks.reduce((sum, f) => sum + (f.analysis?.urgency || 3), 0);
        const totalSeverity = matchedFeedbacks.reduce((sum, f) => sum + (f.analysis?.severity || 3), 0);
        
        theme.averageUrgency = parseFloat((totalUrgency / matchedFeedbacks.length).toFixed(1));
        theme.averageSeverity = parseFloat((totalSeverity / matchedFeedbacks.length).toFixed(1));
        
        // Recalculate deterministic score
        const scoreResult = calculatePriorityScore(theme.reportCount, theme.averageUrgency, theme.averageSeverity);
        theme.priorityScore = scoreResult.score;
        theme.priorityClassification = scoreResult.classification;
        theme.updatedAt = new Date().toISOString();

        if (newFeedback.evidence.evidenceStatus === 'VERIFIED_EVIDENCE') {
          theme.verifiedEvidenceCount += 1;
        }
      }
    } else {
      // Create new theme
      const newThemeId = `theme-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      newFeedback.themeId = newThemeId;
      newFeedback.processingStatus = 'MATCHED';

      const initialUrgency = analysis.urgency || 3;
      const initialSeverity = analysis.severity || 3;
      const scoreResult = calculatePriorityScore(1, initialUrgency, initialSeverity);

      // Generate custom AI recommendations and insights for the new theme
      const aiContent = await generateThemeAIContent(
        analysis.suggestedTheme || analysis.canonicalIssue,
        analysis.category,
        newFeedback.locality,
        [cleanFeedback]
      );

      const newTheme: CivicTheme = {
        id: newThemeId,
        canonicalTitle: analysis.suggestedTheme || analysis.canonicalIssue,
        category: analysis.category,
        locality: newFeedback.locality,
        reportCount: 1,
        averageUrgency: initialUrgency,
        averageSeverity: initialSeverity,
        priorityScore: scoreResult.score,
        priorityClassification: scoreResult.classification,
        workflowStatus: 'IDENTIFIED',
        verifiedEvidenceCount: 0,
        recommendation: aiContent.recommendation,
        aiInsight: aiContent.aiInsight,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      themes.push(newTheme);
    }

    feedbacks.push(newFeedback);

    res.json({
      success: true,
      feedback: {
        id: newFeedback.id,
        rawFeedback: newFeedback.rawFeedback,
        inputMethod: newFeedback.inputMethod,
        language: newFeedback.language,
        locality: newFeedback.locality,
        createdAt: newFeedback.createdAt,
        processingStatus: newFeedback.processingStatus,
        analysis: newFeedback.analysis,
        evidence: {
          hasImage: newFeedback.evidence.hasImage,
          evidenceStatus: newFeedback.evidence.evidenceStatus,
          aiScreening: newFeedback.evidence.aiScreening
        }
      }
    });

  } catch (err: any) {
    console.error("[ERROR] submit-feedback failed:", err);
    res.status(500).json({ error: "An unexpected error occurred while processing your report. Please try again." });
  }
});

// 8. Human Evidence Review Decision
app.post('/api/evidence-review', requireRole('planner'), (req: Request, res: Response) => {
  const { feedbackId, decision, reviewerNote, externalCheckUsed, externalCheckProvider, externalCheckResultSummary } = req.body;

  if (!feedbackId || !decision) {
    return res.status(400).json({ error: "feedbackId and decision are required." });
  }

  // Strict decision validation
  const allowedDecisions = ['VERIFIED_EVIDENCE', 'EVIDENCE_NOT_VERIFIED', 'NEEDS_FURTHER_REVIEW'];
  if (!allowedDecisions.includes(decision)) {
    return res.status(400).json({ error: `Invalid decision. Allowed values are: ${allowedDecisions.join(', ')}` });
  }

  const feedback = feedbacks.find(f => f.id === feedbackId);
  if (!feedback) {
    return res.status(404).json({ error: "Feedback report not found." });
  }

  if (!feedback.evidence.hasImage) {
    return res.status(400).json({ error: "This report has no visual evidence to review." });
  }

  // Sanitize texts strictly
  const sanitizedNote = sanitizeInput(reviewerNote || '');
  if (sanitizedNote.length > 500) {
    return res.status(400).json({ error: "Reviewer note exceeds maximum length of 500 characters." });
  }

  const sanitizedProvider = sanitizeInput(externalCheckProvider || '');
  if (sanitizedProvider.length > 100) {
    return res.status(400).json({ error: "External check provider name exceeds maximum length of 100 characters." });
  }

  const sanitizedSummary = sanitizeInput(externalCheckResultSummary || '');
  if (sanitizedSummary.length > 500) {
    return res.status(400).json({ error: "External check result summary exceeds maximum length of 500 characters." });
  }

  // Record human review decision
  const review: HumanReview = {
    reviewed: true,
    decision: decision as 'VERIFIED_EVIDENCE' | 'NEEDS_FURTHER_REVIEW' | 'EVIDENCE_NOT_VERIFIED',
    reviewerNote: sanitizedNote,
    reviewedAt: new Date().toISOString(),
    externalCheckUsed: !!externalCheckUsed,
    externalCheckProvider: sanitizedProvider || null,
    externalCheckResultSummary: sanitizedSummary || null
  };

  feedback.evidence.humanReview = review;
  feedback.evidence.evidenceStatus = decision as 'VERIFIED_EVIDENCE' | 'NEEDS_FURTHER_REVIEW' | 'EVIDENCE_NOT_VERIFIED';

  // Update verified evidence count in theme if verified
  if (feedback.themeId) {
    const theme = themes.find(t => t.id === feedback.themeId);
    if (theme) {
      // Recalculate verified count
      const themeFeedbacks = feedbacks.filter(f => f.themeId === theme.id);
      theme.verifiedEvidenceCount = themeFeedbacks.filter(f => f.evidence.hasImage && f.evidence.evidenceStatus === 'VERIFIED_EVIDENCE').length;
      theme.updatedAt = new Date().toISOString();
    }
  }

  res.json({ success: true, feedback });
});

// 9. Update Planning Workflow status
app.post('/api/update-workflow', requireRole('planner'), (req: Request, res: Response) => {
  const { themeId, workflowStatus, budgetBreakdown, totalAllocatedBudget } = req.body;

  if (!themeId || !workflowStatus) {
    return res.status(400).json({ error: "themeId and workflowStatus are required." });
  }

  // Strict workflow status validation
  const allowedStatuses = ['IDENTIFIED', 'PROPOSED', 'UNDER_REVIEW', 'APPROVED_DEMO', 'COMMISSIONED', 'COMPLETED'];
  if (!allowedStatuses.includes(workflowStatus)) {
    return res.status(400).json({ error: `Invalid workflowStatus. Allowed values are: ${allowedStatuses.join(', ')}` });
  }

  const theme = themes.find(t => t.id === themeId);
  if (!theme) {
    return res.status(404).json({ error: "Theme not found." });
  }

  // Parse and validate budget numbers strictly
  let parsedTotalBudget = 0;
  if (totalAllocatedBudget !== undefined) {
    parsedTotalBudget = parseInt(totalAllocatedBudget, 10);
    if (isNaN(parsedTotalBudget) || parsedTotalBudget < 0) {
      return res.status(400).json({ error: "totalAllocatedBudget must be a non-negative integer." });
    }
  }

  // Validate budgetBreakdown if provided
  let validatedBreakdown: BudgetBreakdownItem[] | null = null;
  if (budgetBreakdown) {
    if (!Array.isArray(budgetBreakdown)) {
      return res.status(400).json({ error: "budgetBreakdown must be an array of category items." });
    }

    validatedBreakdown = [];
    let breakdownSum = 0;

    for (const item of budgetBreakdown) {
      if (!item.category || typeof item.category !== 'string' || item.category.trim().length === 0) {
        return res.status(400).json({ error: "Each budget breakdown item must have a valid category title." });
      }
      if (item.amount === undefined || isNaN(parseInt(item.amount, 10)) || parseInt(item.amount, 10) < 0) {
        return res.status(400).json({ error: `Budget breakdown item amount for category '${item.category}' must be a non-negative integer.` });
      }

      const itemAmount = parseInt(item.amount, 10);
      breakdownSum += itemAmount;

      validatedBreakdown.push({
        category: sanitizeInput(item.category),
        amount: itemAmount,
        description: sanitizeInput(item.description || '')
      });
    }

    // Mathematical integrity constraint: Sum of categories must match total budget
    if (totalAllocatedBudget !== undefined && breakdownSum !== parsedTotalBudget) {
      return res.status(400).json({
        error: `Financial validation error: The sum of budget breakdown categories (₹${breakdownSum}) must match the total allocated budget (₹${parsedTotalBudget}).`
      });
    }

    // If total budget was not provided, derive it from sum
    if (totalAllocatedBudget === undefined) {
      parsedTotalBudget = breakdownSum;
    }
  }

  theme.workflowStatus = workflowStatus as WorkflowStatus;
  theme.updatedAt = new Date().toISOString();

  // If status is APPROVED_DEMO, set budget (either custom validated or fallback default)
  if (workflowStatus === 'APPROVED_DEMO' || validatedBreakdown || totalAllocatedBudget !== undefined) {
    const defaultBudget: BudgetBreakdownItem[] = [
      { category: 'Primary infrastructure materials', amount: Math.round(parsedTotalBudget * 0.45) || 500000, description: 'Sourced local components and foundational layers.' },
      { category: 'Contracted local labor', amount: Math.round(parsedTotalBudget * 0.25) || 300000, description: 'Constituency-based workforce mobilization.' },
      { category: 'Civil engineering oversight', amount: Math.round(parsedTotalBudget * 0.15) || 200000, description: 'Supervision and quality inspections.' },
      { category: 'Safety signages and contingencies', amount: Math.round(parsedTotalBudget * 0.15) || 150000, description: 'Public notices, testing, and general reserves.' }
    ];

    const finalBudget = validatedBreakdown || defaultBudget;
    const finalTotal = totalAllocatedBudget !== undefined ? parsedTotalBudget : finalBudget.reduce((sum: number, item: BudgetBreakdownItem) => sum + item.amount, 0);

    theme.planningData = {
      isDemoData: true,
      totalAllocatedBudget: finalTotal,
      currency: "INR",
      planningDate: new Date().toISOString(),
      expectedStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      expectedCompletionDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      budgetBreakdown: finalBudget
    };
  }

  res.json({ success: true, theme });
});


// Serves static assets/vite development server in development mode
const startServer = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Serve client static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.use('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[SERVER] Jan Samasya full-stack application running on port ${port}`);
  });
};

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
