import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// The type of the authentication context
type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  updateEmailMutation: UseMutationResult<{ email: string }, Error, { email: string }>;
  resetPasswordMutation: UseMutationResult<{ message: string }, Error, { username: string }>;
};

// Type for login data 
type LoginData = Pick<InsertUser, "username" | "password">;

// Create the auth context without default values
export const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [initialized, setInitialized] = useState(false);

  // Get current user data
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 2, // More retries for auth state since it's important
    retryDelay: 1000, // Retry with a 1s delay
    refetchOnWindowFocus: true, // Enable refetch on window focus to detect changes in auth state
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Login attempt:", credentials.username);
      try {
        // Make the login request
        const res = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache"
          },
          body: JSON.stringify(credentials),
          credentials: "include"
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Login failed");
        }
        
        // Wait for the session to be fully established before continuing
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const userData = await res.json();
        console.log("Login response:", userData);
        return userData;
      } catch (error) {
        console.error("Login error:", error);
        throw new Error(error instanceof Error ? error.message : "Login failed");
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log("Login successful:", user.username);
      
      // Update cache with user data
      queryClient.setQueryData(["/api/user"], user);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.fullName}!`,
      });
      
      // During development, we don't need to validate the session or redirect
      // This will be uncommented before deployment
      /*
      // Instead of directly changing window.location, we'll first test if the session is valid
      // by making another request to get the user data
      fetch("/api/user", {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache"
        },
        credentials: "include"
      })
      .then(res => {
        if (!res.ok) {
          console.error("Session validation failed after login:", res.status);
          throw new Error("Session validation failed");
        }
        return res.json();
      })
      .then(validatedUser => {
        console.log("Session validated successfully:", validatedUser);
        // Force full page reload to ensure proper session handling
        window.location.href = "/";
      })
      .catch(err => {
        console.error("Error validating session after login:", err);
        // Try one more time with different approach - hard reload
        window.location.replace("/");
      });
      */
      
      // Refetch the user data to update the UI
      refetch();
    },
    onError: (error: Error) => {
      console.error("Login error:", error.message);
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      console.log("Registration attempt:", credentials.username);
      try {
        // Make the registration request
        const res = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache"
          },
          body: JSON.stringify(credentials),
          credentials: "include"
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Registration failed");
        }
        
        const userData = await res.json();
        console.log("Registration response:", userData);
        return userData;
      } catch (error) {
        console.error("Registration error:", error);
        throw new Error(error instanceof Error ? error.message : "Registration failed");
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log("Registration successful:", user.username);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.fullName}!`,
      });
      
      // During development, we don't need to validate the session or redirect
      // This will be uncommented before deployment
      /*
      // Use the same session validation approach as with login
      fetch("/api/user", {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache"
        },
        credentials: "include"
      })
      .then(res => {
        if (!res.ok) {
          console.error("Session validation failed after registration:", res.status);
          throw new Error("Session validation failed");
        }
        return res.json();
      })
      .then(validatedUser => {
        console.log("Session validated successfully:", validatedUser);
        // Force full page reload to ensure proper session handling
        window.location.href = "/";
      })
      .catch(err => {
        console.error("Error validating session after registration:", err);
        // Try one more time with different approach - hard reload
        window.location.replace("/");
      });
      */
      
      // Refetch the user data to update the UI
      refetch();
    },
    onError: (error: Error) => {
      console.error("Registration error:", error.message);
      toast({
        title: "Registration failed",
        description: error.message || "Could not create your account",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Logout attempt");
      try {
        // Make the logout request
        const res = await fetch("/api/logout", {
          method: "POST",
          headers: {
            "Cache-Control": "no-cache"
          },
          credentials: "include"
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Logout failed");
        }
        
        return;
      } catch (error) {
        console.error("Logout error:", error);
        throw new Error(error instanceof Error ? error.message : "Logout failed");
      }
    },
    onSuccess: () => {
      console.log("Logout successful");
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      
      // During development, we don't want to redirect after logout
      // This will be uncommented before deployment
      /*
      // Redirect to auth page after logout
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
      */
      
      // Refetch the user data to update the UI
      refetch();
    },
    onError: (error: Error) => {
      console.error("Logout error:", error.message);
      toast({
        title: "Logout failed",
        description: error.message || "Could not log you out",
        variant: "destructive",
      });
    },
  });
  
  // Update email mutation
  const updateEmailMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      console.log("Email update attempt:", data.email);
      try {
        const res = await apiRequest("POST", "/api/update-email", data);
        return await res.json();
      } catch (error) {
        console.error("Email update error:", error);
        throw error instanceof Error ? error : new Error("Failed to update email");
      }
    },
    onSuccess: (data) => {
      console.log("Email update successful:", data.email);
      
      // Update the user data in the cache to include the new email
      if (user) {
        const updatedUser = { ...user, email: data.email };
        queryClient.setQueryData(["/api/user"], updatedUser);
      }
      
      toast({
        title: "Email updated",
        description: "Your email address has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      console.error("Email update error:", error.message);
      toast({
        title: "Failed to update email",
        description: error.message || "Could not update your email address",
        variant: "destructive",
      });
    },
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { username: string }) => {
      console.log("Password reset attempt for:", data.username);
      try {
        const res = await apiRequest("POST", "/api/reset-password", data);
        return await res.json();
      } catch (error) {
        console.error("Password reset error:", error);
        throw error instanceof Error ? error : new Error("Failed to reset password");
      }
    },
    onSuccess: (data) => {
      console.log("Password reset request successful");
      toast({
        title: "Password reset initiated",
        description: data.message || "If your account exists, a password reset email has been sent.",
      });
    },
    onError: (error: Error) => {
      console.error("Password reset error:", error.message);
      toast({
        title: "Password reset failed",
        description: error.message || "Could not process your password reset request",
        variant: "destructive",
      });
    },
  });

  // Log the user status on state changes for debugging
  useEffect(() => {
    if (initialized) {
      console.log("Auth state:", { 
        user: user ? `${user.username} (${user.role})` : "not logged in",
        isLoading, 
        hasError: !!error
      });
    }
  }, [user, isLoading, error, initialized]);

  // Set initialized after first render
  useEffect(() => {
    setInitialized(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        updateEmailMutation,
        resetPasswordMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
