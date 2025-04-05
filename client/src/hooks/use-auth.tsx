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
    retry: false,
    refetchOnWindowFocus: true, // Enable refetch on window focus to detect changes in auth state
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Login attempt:", credentials.username);
      const res = await apiRequest("POST", "/api/login", credentials);
      const userData = await res.json();
      console.log("Login response:", userData);
      return userData;
    },
    onSuccess: (user: SelectUser) => {
      console.log("Login successful:", user.username);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.fullName}!`,
      });
      
      // Force immediate refetch of user data to ensure session is established
      setTimeout(() => {
        console.log("Refetching user data after login");
        refetch();
      }, 100);
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
      const res = await apiRequest("POST", "/api/register", credentials);
      const userData = await res.json();
      console.log("Registration response:", userData);
      return userData;
    },
    onSuccess: (user: SelectUser) => {
      console.log("Registration successful:", user.username);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.fullName}!`,
      });
      
      // Force immediate refetch of user data to ensure session is established
      setTimeout(() => {
        console.log("Refetching user data after registration");
        refetch();
      }, 100);
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
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      console.log("Logout successful");
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      
      // Force immediate refetch of user data to confirm logout
      setTimeout(() => {
        console.log("Refetching user data after logout");
        refetch();
      }, 100);
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
