import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import * as bcrypt from "bcrypt";

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
    resave: true, // Forces the session to be saved back to the store
    saveUninitialized: true, // Forces a session that is "uninitialized" to be saved to the store
    rolling: true, // Reset cookie expiration on each request
    store: storage.sessionStore,
    name: 'county_audit_sid', // Custom name to avoid conflicts
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false, // Must be false for HTTP development
      sameSite: 'lax',
      httpOnly: true,
      path: '/'
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
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Remove password from the response
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt for user:", req.body.username);
    console.log("Current session ID:", req.sessionID);
    
    // Make sure we have valid parameters
    if (!req.body.username || !req.body.password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        console.error("Login authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Invalid credentials for user:", req.body.username);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      console.log("Authentication successful for user:", user.username);
      
      // Regenerate the session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error("Error regenerating session:", err);
          return next(err);
        }
        
        // Log the user in and save their data to the session
        req.login(user, (err) => {
          if (err) {
            console.error("Error in req.login():", err);
            return next(err);
          }
          
          console.log("User logged in:", user.username);
          console.log("New session ID:", req.sessionID);
          
          // Set a session flag to make sure we know it's authenticated
          req.session.authenticated = true;
          req.session.userInfo = {
            id: user.id,
            username: user.username,
            role: user.role
          };
          
          // Force a session save to ensure it's properly stored before returning
          req.session.save((err) => {
            if (err) {
              console.error("Error saving session:", err);
              return next(err);
            }
            
            // Add helpful headers for debugging
            res.header('X-Auth-Status', 'Authenticated');
            res.header('X-Session-ID', req.sessionID);
            
            // Remove password from the response
            const { password, ...userWithoutPassword } = user;
            
            // Log the session data for debugging
            console.log("Session data after login:", {
              id: req.sessionID,
              authenticated: req.session.authenticated,
              user: req.user ? req.user.username : 'none'
            });
            
            // Delay the response slightly to ensure cookie is set
            setTimeout(() => {
              res.status(200).json(userWithoutPassword);
            }, 100);
          });
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
        res.clearCookie('county_audit_sid');
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    // Detailed logging for debugging session issues
    console.log("GET /api/user - Session ID:", req.sessionID);
    console.log("Session cookie:", req.headers.cookie);
    console.log("Session data:", JSON.stringify(req.session));
    console.log("Is authenticated:", req.isAuthenticated());
    console.log("Passport session:", req.session.passport);
    
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
