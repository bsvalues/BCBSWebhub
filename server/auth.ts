import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import * as bcrypt from "bcrypt";
import { emailService } from "./email-service";

// Extend SessionData interface to include our custom properties
declare module 'express-session' {
  interface SessionData {
    authenticated?: boolean;
    userInfo?: {
      id: number;
      username: string;
      role: string;
    };
  }
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  // Use bcrypt for new passwords
  return bcrypt.hash(password, 10);
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    // Check if stored password is using bcrypt (starts with $2b$)
    if (stored.startsWith('$2b$')) {
      return await bcrypt.compare(supplied, stored);
    } else {
      // Legacy format using our own hashing (fallback)
      const [hashed, salt] = stored.split(".");
      if (!salt) {
        throw new Error("Invalid password format");
      }
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      return timingSafeEqual(hashedBuf, suppliedBuf);
    }
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  // Use a fixed session secret for development
  const SESSION_SECRET = "county-audit-hub-secret-key-very-secure-and-long-enough";

  const sessionSettings: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: true, // Save the session even if unmodified
    saveUninitialized: true, // Save uninitialized sessions
    rolling: true, // Reset cookie expiration on each request
    store: storage.sessionStore,
    name: 'connect.sid', // Use default name for compatibility
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false, // Must be false for HTTP development
      sameSite: 'lax',
      httpOnly: true,
      path: '/',
      domain: undefined // Allow browser to set this automatically to match current domain
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    console.log("Register attempt for user:", req.body.username);
    console.log("Session ID at register start:", req.sessionID);
    
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // For non-SSO users, generate a temporary password if needed
      let temporaryPassword: string | undefined;
      const isExternalAuth = req.body.externalAuth === true;
      
      if (!isExternalAuth && !req.body.password) {
        // Generate a secure temporary password for accounts that need one
        temporaryPassword = emailService.generateTemporaryPassword(12);
        req.body.password = temporaryPassword;
      }
      
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Send welcome email with temporary password if applicable
      if (user.email) {
        try {
          await emailService.sendWelcomeEmail(user, temporaryPassword);
          console.log("Welcome email sent to:", user.username);
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
          // Continue with registration even if email fails
        }
      }

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Save the session explicitly to ensure it's stored before response
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Error saving session after registration:", saveErr);
            return next(saveErr);
          }
          
          console.log("User registered and logged in successfully:", user.username);
          console.log("Session ID after registration:", req.sessionID);
          console.log("Session saved:", !!req.session);
          console.log("User in session:", !!req.user);
          
          // Set additional headers to help debug
          res.header('X-Auth-Session-ID', req.sessionID);
          res.header('X-Auth-Status', 'Authenticated');
          
          // Remove password from the response
          const { password, ...userWithoutPassword } = user;
          
          // Include information about email notification in the response
          const emailSent = !!user.email;
          res.status(201).json({ 
            ...userWithoutPassword, 
            emailSent,
            temporaryPasswordGenerated: !!temporaryPassword 
          });
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt for user:", req.body.username);
    console.log("Session ID at login start:", req.sessionID);
    
    // Make sure we have valid parameters
    if (!req.body.username || !req.body.password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    
    // Use basic passport authenticate with simpler approach
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        console.error("Login authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Invalid credentials for user:", req.body.username);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Log the user in (simple approach)
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Error in req.login():", loginErr);
          return next(loginErr);
        }
        
        // Save the session explicitly to ensure it's stored before response
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Error saving session after login:", saveErr);
            return next(saveErr);
          }
          
          console.log("User logged in successfully:", user.username);
          console.log("Session ID after login:", req.sessionID);
          console.log("Session saved:", !!req.session);
          console.log("User in session:", !!req.user);
          
          // Set additional headers to help debug
          res.header('X-Auth-Session-ID', req.sessionID);
          res.header('X-Auth-Status', 'Authenticated');
          
          // Remove password from the response
          const { password, ...userWithoutPassword } = user;
          
          res.status(200).json(userWithoutPassword);
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    console.log("Logout request for user:", req.user?.username);
    console.log("Session ID for logout:", req.sessionID);
    
    if (!req.isAuthenticated()) {
      console.log("Not authenticated, nothing to log out");
      return res.sendStatus(200);
    }
    
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }
      
      // Also destroy the session
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return next(err);
        }
        
        console.log("User logged out successfully and session destroyed");
        res.clearCookie('connect.sid');
        res.sendStatus(200);
      });
    });
  });

  app.post("/api/reset-password", async (req, res, next) => {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }
    
    try {
      // Find the user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        // For security reasons, don't reveal that the user doesn't exist
        // Just return a generic success message
        return res.status(200).json({ 
          message: "If the account exists, a password reset email has been sent" 
        });
      }
      
      // Generate a temporary password
      const temporaryPassword = emailService.generateTemporaryPassword(12);
      
      // Update the user's password
      const updatedUser = await storage.updateUserPassword(
        user.id, 
        await hashPassword(temporaryPassword)
      );
      
      // Check if the password was successfully updated
      if (!updatedUser) {
        console.error("Failed to update password for user:", username);
        return res.status(500).json({ error: "Failed to reset password" });
      }
      
      // Send the password reset email with the temporary password
      if (user.email) {
        try {
          await emailService.sendPasswordResetEmail(user, temporaryPassword);
          console.log("Password reset email sent to:", user.username);
        } catch (emailError) {
          console.error("Failed to send password reset email:", emailError);
          // Continue even if email fails
        }
      } else {
        console.log("User has no email address to send password reset to:", user.username);
      }
      
      // Return success message without revealing details
      return res.status(200).json({ 
        message: "If the account exists, a password reset email has been sent" 
      });
    } catch (error) {
      console.error("Password reset error:", error);
      next(error);
    }
  });
  
  // Update user email endpoint - requires authentication
  app.post("/api/update-email", (req, res, next) => {
    // Ensure user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const { email } = req.body;
    
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Valid email address is required" });
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    
    try {
      (async () => {
        // Update user's email in the database
        const updatedUser = await storage.updateUserEmail(req.user!.id, email);
        
        if (!updatedUser) {
          return res.status(500).json({ error: "Failed to update email address" });
        }
        
        // Log the change
        console.log(`User ${req.user!.username} updated email to: ${email}`);
        
        // Return success response
        res.status(200).json({ 
          message: "Email address updated successfully",
          email: updatedUser.email
        });
      })();
    } catch (error) {
      console.error("Email update error:", error);
      next(error);
    }
  });

  app.get("/api/user", (req, res) => {
    // Detailed logging for debugging session issues
    console.log("GET /api/user - Session ID:", req.sessionID);
    console.log("Session cookie:", req.headers.cookie);
    console.log("Session data:", JSON.stringify(req.session));
    console.log("Is authenticated:", req.isAuthenticated());
    
    // Add debug headers
    res.header('X-Session-ID', req.sessionID);
    res.header('X-Auth-Status', req.isAuthenticated() ? 'Authenticated' : 'Not-Authenticated');
    
    // Check if we have session and user
    if (!req.session) {
      console.error("No session found");
      return res.status(401).json({ error: "No session found" });
    }
    
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      console.log("User not authenticated");
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // Log authenticated user
    console.log("User authenticated:", req.user?.username);
    
    // Check for valid user object in the request
    if (!req.user) {
      console.error("User authenticated but req.user is undefined");
      
      // Try to recover if we have the user info in the session
      if (req.session.userInfo) {
        console.log("Attempting to recover from session userInfo");
        // You would implement proper recovery here, but for now just return the error
      }
      
      return res.status(500).json({ error: "User session is invalid" });
    }
    
    // All checks passed, return user data
    try {
      // Remove password from the response
      const { password, ...userWithoutPassword } = req.user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error preparing user response:", error);
      res.status(500).json({ error: "Could not process user data" });
    }
  });
}
