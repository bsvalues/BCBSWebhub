import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertUserSchema } from "@shared/schema";
import { Loader2, CheckCircle, BarChart3, Shield, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Registration schema (extend from the insertUserSchema)
const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [location, navigate] = useLocation();
  const auth = useAuth();

  // Effect to redirect authenticated users
  useEffect(() => {
    if (auth.user) {
      navigate("/");
    }
  }, [auth.user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      role: "auditor",
    },
  });

  // Handle login submission
  const onLoginSubmit = (data: LoginFormValues) => {
    auth.loginMutation.mutate(data, {
      onSuccess: () => {
        navigate("/");
      },
    });
  };

  // Handle registration submission
  const onRegisterSubmit = (data: RegisterFormValues) => {
    // Remove confirmPassword as it's not in the schema
    const { confirmPassword, ...registrationData } = data;
    
    auth.registerMutation.mutate(registrationData, {
      onSuccess: () => {
        navigate("/");
      },
    });
  };

  // Show loading state while checking authentication
  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-foreground font-medium">Validating credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left Section (Form) */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardContent className="pt-8 px-8">
            <div className="flex justify-center mb-8">
              <div className="countyaudit-brand text-2xl font-bold flex items-center gap-2">
                <ClipboardList className="h-7 w-7" />
                <span>County Audit Hub</span>
              </div>
            </div>

            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-8 w-full">
                <TabsTrigger value="login" className="text-sm font-medium">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="text-sm font-medium">Create Account</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="mt-0">
                <h2 className="text-xl font-bold text-center mb-6">Welcome Back</h2>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your username" 
                              className="bg-background hover:bg-card/80 focus:bg-card/80 transition-colors"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter your password" 
                              className="bg-background hover:bg-card/80 focus:bg-card/80 transition-colors"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full mt-6 shadow-sm hover:shadow-md transition-all" 
                      disabled={auth.loginMutation.isPending}
                    >
                      {auth.loginMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Signing In...
                        </span>
                      ) : "Sign In"}
                    </Button>
                  </form>
                </Form>
                <div className="mt-6 text-center">
                  <span className="text-sm text-muted-foreground">Don't have an account? </span>
                  <button 
                    className="text-sm text-primary font-medium hover:underline"
                    onClick={() => setActiveTab("register")}
                  >
                    Create Account
                  </button>
                </div>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register" className="mt-0">
                <h2 className="text-xl font-bold text-center mb-6">Join County Audit Hub</h2>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Choose a unique username" 
                              className="bg-background hover:bg-card/80 focus:bg-card/80 transition-colors"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Full Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your full name" 
                              className="bg-background hover:bg-card/80 focus:bg-card/80 transition-colors"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Role</FormLabel>
                          <Select 
                            defaultValue={field.value} 
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-background hover:bg-card/80 focus:bg-card/80 transition-colors">
                                <SelectValue placeholder="Select your role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="auditor">Auditor</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                              <SelectItem value="admin">Administrator</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Create a secure password" 
                              className="bg-background hover:bg-card/80 focus:bg-card/80 transition-colors"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Confirm your password" 
                              className="bg-background hover:bg-card/80 focus:bg-card/80 transition-colors"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full mt-6 shadow-sm hover:shadow-md transition-all" 
                      disabled={auth.registerMutation.isPending}
                    >
                      {auth.registerMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating Account...
                        </span>
                      ) : "Create Account"}
                    </Button>
                  </form>
                </Form>
                <div className="mt-6 text-center">
                  <span className="text-sm text-muted-foreground">Already have an account? </span>
                  <button 
                    className="text-sm text-primary font-medium hover:underline"
                    onClick={() => setActiveTab("login")}
                  >
                    Sign In
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right Section (Hero) */}
      <div className="hidden md:flex md:w-1/2 bg-primary flex-col justify-center items-center p-12 text-primary-foreground">
        <div className="max-w-md glass-panel p-8 rounded-lg">
          <h1 className="text-4xl font-bold mb-6">County Audit Hub</h1>
          <p className="text-xl mb-8 opacity-90">
            A comprehensive auditing platform for Min County Assessor's Office
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="bg-primary-foreground/20 p-2 rounded-lg mr-4">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Streamlined Workflows</h3>
                <p className="opacity-80">Efficient processes with real-time updates and notifications</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-primary-foreground/20 p-2 rounded-lg mr-4">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Advanced Analytics</h3>
                <p className="opacity-80">Comprehensive dashboards and interactive performance reports</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-primary-foreground/20 p-2 rounded-lg mr-4">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Secure & Compliant</h3>
                <p className="opacity-80">Role-based access control and comprehensive audit trails</p>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-6 border-t border-primary-foreground/20">
            <p className="text-sm opacity-70">
              An internal application for Min County Assessor's Office in Washington, designed to streamline property assessment auditing processes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
