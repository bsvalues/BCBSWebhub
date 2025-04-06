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
      <div className="flex-1 flex items-center justify-center p-6 bg-muted/5">
        <Card className="w-full max-w-md border-subtle shadow-sm">
          <CardContent className="pt-8 px-8">
            <div className="flex justify-center mb-6">
              <div className="countyaudit-brand text-2xl font-bold flex items-center gap-2">
                <ClipboardList className="h-7 w-7" />
                <span>County Audit Hub</span>
              </div>
            </div>

            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">Benton County Assessor's Office, Washington</p>
            </div>

            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-6 w-full">
                <TabsTrigger value="login" className="text-sm font-medium">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="text-sm font-medium">Create Account</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="mt-0">
                <div className="bg-muted/10 p-3 rounded-md border-subtle mb-4">
                  <h2 className="text-base font-medium">Welcome Back</h2>
                  <p className="text-xs text-muted-foreground">Sign in to access your auditing dashboard</p>
                </div>
                
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-3">
                    <div className="grid-table border-collapse">
                      <div className="grid grid-cols-[120px_1fr] items-center border border-border/40 rounded-t-md overflow-hidden">
                        <div className="bg-muted/30 px-3 py-2 text-sm font-medium border-r border-border/40">
                          Username
                        </div>
                        <div className="px-0">
                          <FormField
                            control={loginForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem className="m-0 border-0">
                                <FormControl>
                                  <Input 
                                    placeholder="Enter username" 
                                    className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-9"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage className="px-3 text-xs" />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-[120px_1fr] items-center border border-t-0 border-border/40 rounded-b-md overflow-hidden">
                        <div className="bg-muted/30 px-3 py-2 text-sm font-medium border-r border-border/40">
                          Password
                        </div>
                        <div className="px-0">
                          <FormField
                            control={loginForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem className="m-0 border-0">
                                <FormControl>
                                  <Input 
                                    type="password" 
                                    placeholder="Enter password" 
                                    className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-9"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage className="px-3 text-xs" />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full mt-6 btn-depth" 
                      disabled={auth.loginMutation.isPending}
                    >
                      {auth.loginMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Authenticating...
                        </span>
                      ) : "Sign In"}
                    </Button>
                  </form>
                </Form>
                
                <div className="mt-6 pt-4 border-t border-border/30 text-center">
                  <p className="text-xs text-muted-foreground mb-2">Test credentials available:</p>
                  <div className="grid-table text-xs w-full mb-4">
                    <div className="grid grid-cols-2 border border-border/40">
                      <div className="px-2 py-1 font-medium bg-muted/20 border-r border-border/40">Username</div>
                      <div className="px-2 py-1 font-medium bg-muted/20">Password</div>
                    </div>
                    <div className="grid grid-cols-2 border border-t-0 border-border/40">
                      <div className="px-2 py-1 border-r border-border/40">admin</div>
                      <div className="px-2 py-1">password123</div>
                    </div>
                    <div className="grid grid-cols-2 border border-t-0 border-border/40">
                      <div className="px-2 py-1 border-r border-border/40">auditor</div>
                      <div className="px-2 py-1">password123</div>
                    </div>
                  </div>
                  
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
                <div className="bg-muted/10 p-3 rounded-md border-subtle mb-4">
                  <h2 className="text-base font-medium">Create New Account</h2>
                  <p className="text-xs text-muted-foreground">Join Benton County's property assessment audit platform</p>
                </div>
                
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3">
                    <div className="grid-table border-collapse">
                      <div className="grid grid-cols-[120px_1fr] items-center border border-border/40 rounded-t-md overflow-hidden">
                        <div className="bg-muted/30 px-3 py-2 text-sm font-medium border-r border-border/40">
                          Username
                        </div>
                        <div className="px-0">
                          <FormField
                            control={registerForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem className="m-0 border-0">
                                <FormControl>
                                  <Input 
                                    placeholder="Choose username" 
                                    className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-9"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage className="px-3 text-xs" />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-[120px_1fr] items-center border border-t-0 border-border/40 overflow-hidden">
                        <div className="bg-muted/30 px-3 py-2 text-sm font-medium border-r border-border/40">
                          Full Name
                        </div>
                        <div className="px-0">
                          <FormField
                            control={registerForm.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem className="m-0 border-0">
                                <FormControl>
                                  <Input 
                                    placeholder="Enter full name" 
                                    className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-9"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage className="px-3 text-xs" />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-[120px_1fr] items-center border border-t-0 border-border/40 overflow-hidden">
                        <div className="bg-muted/30 px-3 py-2 text-sm font-medium border-r border-border/40">
                          Role
                        </div>
                        <div className="px-3 py-1">
                          <FormField
                            control={registerForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem className="m-0 border-0">
                                <Select 
                                  defaultValue={field.value} 
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger className="border-0 shadow-none focus:ring-0 p-0 h-7 bg-transparent">
                                      <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="auditor">Auditor</SelectItem>
                                    <SelectItem value="supervisor">Supervisor</SelectItem>
                                    <SelectItem value="admin">Administrator</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-[120px_1fr] items-center border border-t-0 border-border/40 overflow-hidden">
                        <div className="bg-muted/30 px-3 py-2 text-sm font-medium border-r border-border/40">
                          Password
                        </div>
                        <div className="px-0">
                          <FormField
                            control={registerForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem className="m-0 border-0">
                                <FormControl>
                                  <Input 
                                    type="password" 
                                    placeholder="Create password" 
                                    className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-9"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage className="px-3 text-xs" />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-[120px_1fr] items-center border border-t-0 border-border/40 rounded-b-md overflow-hidden">
                        <div className="bg-muted/30 px-3 py-2 text-sm font-medium border-r border-border/40">
                          Confirm
                        </div>
                        <div className="px-0">
                          <FormField
                            control={registerForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem className="m-0 border-0">
                                <FormControl>
                                  <Input 
                                    type="password" 
                                    placeholder="Confirm password" 
                                    className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-9"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage className="px-3 text-xs" />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full mt-6 btn-depth" 
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
                
                <div className="mt-6 pt-4 border-t border-border/30 text-center">
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
      <div className="hidden md:flex md:w-1/2 bg-primary/90 flex-col justify-center items-center p-12 text-primary-foreground">
        <div className="max-w-md glass-panel p-8 rounded-lg">
          <h1 className="text-3xl font-bold mb-4">County Audit Hub</h1>
          <p className="text-lg mb-6 opacity-90">
            Simplifying auditing workflows for Benton County Assessor's Office
          </p>
          
          {/* Analytics-style metrics section */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="stat-card bg-primary-foreground/10 border-primary-foreground/20">
              <div className="stat-title">Average Audit Time</div>
              <div className="stat-value text-primary-foreground">3.2 days</div>
              <div className="stat-trend positive flex items-center">
                <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 17L17 7M17 7H8M17 7V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                24% faster
              </div>
            </div>
            
            <div className="stat-card bg-primary-foreground/10 border-primary-foreground/20">
              <div className="stat-title">Completion Rate</div>
              <div className="stat-value text-primary-foreground">98.7%</div>
              <div className="stat-trend positive flex items-center">
                <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 17L17 7M17 7H8M17 7V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                3.2% increase
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-primary-foreground/10 p-2 rounded-md mr-4 border border-primary-foreground/20">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Spreadsheet-Like Interface</h3>
                <p className="opacity-80 text-sm">Familiar grid views with sorting, filtering, and export capabilities</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-primary-foreground/10 p-2 rounded-md mr-4 border border-primary-foreground/20">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Interactive Analytics</h3>
                <p className="opacity-80 text-sm">Data visualization tools and performance metrics at your fingertips</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-primary-foreground/10 p-2 rounded-md mr-4 border border-primary-foreground/20">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Streamlined Workflows</h3>
                <p className="opacity-80 text-sm">Simplified approval processes and automated status tracking</p>
              </div>
            </div>
          </div>
          
          {/* Spreadsheet-inspired status timeline */}
          <div className="mt-8 pt-4 border-t border-primary-foreground/20">
            <h4 className="text-sm font-medium mb-2">Audit Process Stages</h4>
            <div className="status-timeline">
              <div className="status-step">
                <div className="status-dot completed"></div>
                <span className="text-xs mt-1">Submit</span>
              </div>
              <div className="status-line completed"></div>
              <div className="status-step">
                <div className="status-dot completed"></div>
                <span className="text-xs mt-1">Review</span>
              </div>
              <div className="status-line completed"></div>
              <div className="status-step">
                <div className="status-dot current"></div>
                <span className="text-xs mt-1">Approve</span>
              </div>
              <div className="status-line"></div>
              <div className="status-step">
                <div className="status-dot"></div>
                <span className="text-xs mt-1">Complete</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-primary-foreground/20">
            <p className="text-sm opacity-70">
              An internal application for Benton County Assessor's Office in Washington state.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
