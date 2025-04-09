import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { 
  Loader2, 
  MapPin, 
  BarChart3, 
  Check, 
  CheckCircle, 
  ClipboardList, 
  Building, 
  Home, 
  ArrowRight, 
  Building2, 
  Map,
  FileSpreadsheet,
  Landmark,
  ChevronRight,
  UserCircle2,
  FileText,
  LayoutDashboard,
  DollarSign,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LandingPage() {
  const [location, navigate] = useLocation();
  const auth = useAuth();
  const [showLoginForm, setShowLoginForm] = useState(false);

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

  // Handle login submission
  const onLoginSubmit = (data: LoginFormValues) => {
    auth.loginMutation.mutate(data, {
      onSuccess: () => {
        navigate("/");
      },
    });
  };

  // Features section data
  const features = [
    {
      icon: <CheckCircle className="h-6 w-6 text-primary" />,
      title: "Streamlined Auditing",
      description: "Accelerate assessment reviews with an intuitive workflow system"
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-primary" />,
      title: "Advanced Analytics",
      description: "Gain insights with comprehensive reporting and data visualization"
    },
    {
      icon: <Map className="h-6 w-6 text-primary" />,
      title: "Geospatial Integration",
      description: "Visualize property data with interactive mapping capabilities"
    },
    {
      icon: <Building2 className="h-6 w-6 text-primary" />,
      title: "Property Management",
      description: "Track property assessments and tax impact with detailed records"
    }
  ];

  // Show loading state while checking authentication
  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Background Image - Agricultural Field (like Benton County website) */}
        <div className="absolute inset-0 bg-[#34653f] z-0">
          {/* We're using a background style to simulate the wheat field image from the Benton County site */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#34653f]/80 to-[#d4b254]/40 opacity-70"></div>
          <div className="absolute inset-0 bg-cover bg-center opacity-50"
               style={{
                 backgroundImage: "linear-gradient(rgba(52, 101, 63, 0.4), rgba(212, 178, 84, 0.4)), url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23d4b254' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E\")",
                 backgroundSize: "200px 200px"
               }}
          ></div>
        </div>

        {/* Navigation - Benton County Style from Brand Guide */}
        <nav className="relative z-10">
          {/* Top Navigation Bar - Dark Blue/Green */}
          <div className="benton-nav py-3 px-6">
            <div className="container mx-auto flex justify-between items-center">
              {/* Logo - Official Seal Signature */}
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 benton-logo">
                  <div className="benton-text-green text-xs font-bold flex flex-col items-center justify-center">
                    <span className="text-sm benton-heading">COUNTY OF</span>
                    <span className="text-base benton-heading">BENTON</span>
                    <span className="text-[0.5rem] benton-heading">WASHINGTON</span>
                    <span className="text-[0.5rem] benton-heading">EST. 1905</span>
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold benton-heading">BENTON COUNTY</div>
                  <div className="text-sm tracking-wide benton-body">ASSESSOR'S OFFICE | AUDIT HUB</div>
                </div>
              </div>

              {/* Desktop Nav Links - Official Benton County style */}
              <div className="hidden md:flex items-center gap-6">
                <a href="#features" className="text-white hover:benton-text-sand transition-colors benton-body">Services</a>
                <a href="#workflow" className="text-white hover:benton-text-sand transition-colors benton-body">Departments</a>
                <a href="#about" className="text-white hover:benton-text-sand transition-colors benton-body">Government</a>
                
                <div className="flex items-center">
                  <Button 
                    variant="ghost" 
                    className="text-white benton-bg-green/50 hover:benton-bg-green"
                    onClick={() => setShowLoginForm(!showLoginForm)}
                  >
                    <UserCircle2 className="mr-2 h-4 w-4" />
                    <span className="benton-body">{showLoginForm ? "Hide Login" : "Sign In"}</span>
                  </Button>
                </div>
                
                <div className="benton-bg-green/60 rounded-full p-2">
                  <Search className="h-5 w-5" />
                </div>
              </div>

              {/* Mobile Menu Button - Benton County style */}
              <div className="md:hidden flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:benton-bg-green/70"
                  onClick={() => setShowLoginForm(!showLoginForm)}
                >
                  <UserCircle2 className="mr-2 h-4 w-4" />
                  <span className="benton-body">{showLoginForm ? "Hide" : "Sign In"}</span>
                </Button>
                
                <div className="benton-bg-green/60 rounded-full p-1.5">
                  <Search className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Login Form Overlay */}
          {showLoginForm && (
            <div className="absolute right-6 top-20 z-50 w-full max-w-sm md:w-96 shadow-lg rounded-lg animate-in fade-in slide-in-from-top-5 duration-300">
              <Card>
                <CardContent className="pt-6 pb-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold mb-2">Welcome Back</h3>
                    <p className="text-sm text-muted-foreground">Sign in to access your dashboard</p>
                  </div>
                  
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Username" {...field} />
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
                            <FormControl>
                              <Input type="password" placeholder="Password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full btn-depth" 
                        disabled={auth.loginMutation.isPending}
                      >
                        {auth.loginMutation.isPending ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Signing in...
                          </span>
                        ) : "Sign In"}
                      </Button>
                    </form>
                  </Form>
                  
                  <div className="mt-6 pt-4 border-t border-border/30">
                    <p className="text-xs text-muted-foreground mb-2">Test credentials available:</p>
                    <div className="grid grid-cols-2 text-xs border border-border/40 rounded-md overflow-hidden">
                      <div className="px-2 py-1 font-medium bg-muted/20 border-r border-border/40">Username</div>
                      <div className="px-2 py-1 font-medium bg-muted/20">Password</div>
                      <div className="px-2 py-1 border-r border-t border-border/40">admin</div>
                      <div className="px-2 py-1 border-t border-border/40">password123</div>
                      <div className="px-2 py-1 border-r border-t border-border/40">auditor</div>
                      <div className="px-2 py-1 border-t border-border/40">password123</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </nav>

        {/* Hero Content - Benton County Style */}
        <div className="relative z-10 container mx-auto px-6 pt-8 pb-20 md:pt-8 md:pb-32">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center mt-6">
            {/* Main large title overlay - Benton County style */}
            <div className="absolute w-full text-center top-32 left-0 right-0 z-0 pointer-events-none hidden md:block">
              <h1 className="text-8xl font-extrabold tracking-wider text-white/10 uppercase">
                BENTON COUNTY
              </h1>
              <h2 className="text-6xl font-extrabold tracking-wider text-white/10 uppercase">
                WASHINGTON
              </h2>
            </div>
            
            <div className="md:col-span-7 text-center md:text-left relative z-10">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white leading-tight uppercase">
                Property Assessment
                <span className="text-[#d4b254] block mt-1">Audit System</span>
              </h1>
              <p className="text-xl text-white/80 mb-8 max-w-xl mx-auto md:mx-0">
                Streamline county assessment workflows with advanced collaboration, 
                geospatial integration, and analytics tools.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Button 
                  size="lg" 
                  className="text-md benton-bg-sand benton-text-blue hover:benton-bg-light-sand border-0 benton-heading" 
                  onClick={() => setShowLoginForm(true)}
                >
                  <span>Sign In</span>
                  <UserCircle2 className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-md text-white border-white hover:bg-white/20 hover:text-white benton-body" 
                  asChild
                >
                  <a href="#features">Explore Features</a>
                </Button>
              </div>
            </div>
            <div className="md:col-span-5 relative">
              <div className="relative z-10 p-2 rounded-lg bg-gradient-to-br from-background to-muted/40 border border-border/40 shadow-xl">
                <div className="rounded-md overflow-hidden border border-border/20">
                  <div className="aspect-[16/9] bg-muted/80 relative">
                    <div className="absolute inset-0 flex flex-col">
                      {/* Mock GIS Dashboard */}
                      <div className="h-10 bg-primary/10 flex items-center px-3 border-b border-border/20">
                        <div className="w-3 h-3 rounded-full bg-red-400 mr-2"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400 mr-2"></div>
                        <div className="flex-1"></div>
                        <div className="text-xs text-foreground/60">County Audit Hub - GIS Dashboard</div>
                      </div>
                      <div className="flex-1 grid grid-cols-3">
                        {/* Left Panel */}
                        <div className="col-span-1 bg-card border-r border-border/20 p-2">
                          <div className="w-full h-5 bg-muted/60 rounded-sm mb-2"></div>
                          <div className="w-full h-5 bg-muted/60 rounded-sm mb-2"></div>
                          <div className="w-3/4 h-5 bg-muted/60 rounded-sm mb-4"></div>
                          
                          <div className="bg-background/60 p-2 rounded-sm mb-2">
                            <div className="w-full h-3 bg-muted/60 rounded-sm mb-1"></div>
                            <div className="w-3/4 h-3 bg-muted/60 rounded-sm"></div>
                          </div>
                          
                          <div className="bg-background/60 p-2 rounded-sm mb-2">
                            <div className="w-full h-3 bg-muted/60 rounded-sm mb-1"></div>
                            <div className="w-3/4 h-3 bg-muted/60 rounded-sm"></div>
                          </div>
                          
                          <div className="bg-primary/20 p-2 rounded-sm">
                            <div className="w-full h-3 bg-muted/60 rounded-sm mb-1"></div>
                            <div className="w-3/4 h-3 bg-muted/60 rounded-sm"></div>
                          </div>
                        </div>
                        
                        {/* Map Area */}
                        <div className="col-span-2 relative">
                          <div className="absolute inset-0 bg-blue-100 opacity-30"></div>
                          <div className="absolute inset-0" style={{ 
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23000000' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                            backgroundSize: "80px 80px",
                          }}></div>
                          
                          {/* Property Markers */}
                          <div className="absolute left-1/4 top-1/3 w-5 h-5 bg-primary/80 rounded-full shadow-md flex items-center justify-center">
                            <Building className="w-3 h-3 text-white" />
                          </div>
                          
                          <div className="absolute left-2/3 top-1/2 w-5 h-5 bg-primary/80 rounded-full shadow-md flex items-center justify-center">
                            <Home className="w-3 h-3 text-white" />
                          </div>
                          
                          <div className="absolute left-1/2 top-2/3 w-5 h-5 bg-yellow-500/80 rounded-full shadow-md flex items-center justify-center">
                            <MapPin className="w-3 h-3 text-white" />
                          </div>
                          
                          {/* Controls */}
                          <div className="absolute top-2 right-2 bg-card/80 backdrop-blur-sm p-1 rounded-md shadow-sm border border-border/20 flex flex-col gap-1">
                            <div className="w-6 h-6 bg-background/80 rounded-sm flex items-center justify-center text-foreground/60">+</div>
                            <div className="w-6 h-6 bg-background/80 rounded-sm flex items-center justify-center text-foreground/60">−</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/10 rounded-lg -z-10"></div>
                <div className="absolute -top-4 -left-4 w-16 h-16 bg-primary/10 rounded-lg -z-10"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Curved bottom edge */}
        <div className="absolute -bottom-1 left-0 right-0 h-8 bg-background" style={{ 
          borderTopLeftRadius: "50% 100%", 
          borderTopRightRadius: "50% 100%" 
        }}></div>
      </header>

      {/* Quick Access Buttons - Benton County Style */}
      <section className="bg-white py-0 -mt-8 relative z-20">
        <div className="container mx-auto">
          <div className="flex flex-wrap justify-center gap-4 md:gap-0">
            {[
              { 
                title: "Elected Officials", 
                icon: <UserCircle2 className="h-6 w-6" />,
                color: "var(--benton-blue)"
              },
              { 
                title: "Audit Code",
                icon: <FileText className="h-6 w-6" />,
                color: "var(--benton-green)"
              },
              { 
                title: "Meeting Agendas", 
                icon: <LayoutDashboard className="h-6 w-6" />,
                color: "var(--benton-blue)"
              },
              { 
                title: "Job Openings", 
                icon: <Building className="h-6 w-6" />,
                color: "var(--benton-sand)"
              },
              { 
                title: "Budget Documents", 
                icon: <DollarSign className="h-6 w-6" />,
                color: "var(--benton-light-green)"
              }
            ].map((item, index) => (
              <div key={index} className="w-40 flex flex-col items-center cursor-pointer">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-md flex items-center justify-center mb-2" style={{ backgroundColor: item.color }}>
                  <div className="text-white">
                    {item.icon}
                  </div>
                </div>
                <span className="text-center text-sm font-medium">{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 rounded-full benton-bg-green/10 benton-text-green text-sm font-medium mb-4 benton-body">
              Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 benton-heading">Comprehensive Audit Management</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto benton-body">
              Our platform offers a complete solution for county assessors to manage property audits efficiently
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="p-6 rounded-lg border border-border bg-card hover:bg-card/80 transition-colors">
                <div className="w-12 h-12 rounded-lg benton-bg-green/10 flex items-center justify-center mb-4">
                  <div className="benton-text-green">{feature.icon}</div>
                </div>
                <h3 className="text-xl font-semibold mb-2 benton-heading">{feature.title}</h3>
                <p className="text-muted-foreground benton-body">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-20 bg-muted/10">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 rounded-full benton-bg-blue/10 benton-text-blue text-sm font-medium mb-4 benton-body">
              Workflow
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 benton-heading">Streamlined Assessment Process</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto benton-body">
              From submission to approval, our workflow system guides you through each step
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="space-y-8">
                {[
                  { 
                    title: "Audit Creation", 
                    description: "Submit new assessment review requests with all relevant property details",
                    icon: <FileSpreadsheet className="h-5 w-5" />
                  },
                  { 
                    title: "Initial Review", 
                    description: "Auditors perform initial assessment and gather supporting documentation",
                    icon: <ClipboardList className="h-5 w-5" />
                  },
                  { 
                    title: "Supervisor Approval", 
                    description: "Management review ensures accuracy and compliance with regulations",
                    icon: <CheckCircle className="h-5 w-5" />
                  },
                  { 
                    title: "Final Documentation", 
                    description: "Generate final reports with comprehensive audit trail and history",
                    icon: <BarChart3 className="h-5 w-5" />
                  }
                ].map((step, index) => (
                  <div key={index} className="flex gap-4 group">
                    <div className="w-12 h-12 rounded-full border-2 border-benton-blue benton-bg-blue/10 flex-shrink-0 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="benton-text-blue">{step.icon}</div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold flex items-center gap-2 benton-heading">
                        {step.title}
                        <ChevronRight className="h-4 w-4 benton-text-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      <p className="text-muted-foreground mt-2 benton-body">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="relative bg-card rounded-lg border border-border/50 shadow-xl p-6">
                <div className="absolute -top-3 -left-3 bg-primary/10 w-full h-full rounded-lg -z-10"></div>
                
                <div className="space-y-5">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-semibold benton-heading">Audit Queue</h3>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-1 benton-bg-blue/10 benton-text-blue text-xs font-medium rounded-full benton-body">
                        12 Pending
                      </div>
                      <div className="px-2 py-1 benton-bg-sand/10 benton-text-sand text-xs font-medium rounded-full benton-body">
                        5 Urgent
                      </div>
                    </div>
                  </div>
                  
                  {[
                    { 
                      title: "Residential Property Assessment", 
                      id: "A-1001", 
                      status: "In Progress",
                      statusColor: "benton-bg-blue/20 benton-text-blue",
                      address: "123 Main St, County Seat"
                    },
                    { 
                      title: "Commercial Building Valuation", 
                      id: "A-1002", 
                      status: "Needs Info", 
                      statusColor: "benton-bg-sand/20 benton-text-sand",
                      address: "555 Business Ave, County Seat"
                    },
                    { 
                      title: "Agricultural Land Review", 
                      id: "A-1003", 
                      status: "Pending", 
                      statusColor: "benton-bg-green/20 benton-text-green",
                      address: "Rural Route 5, County Seat"
                    }
                  ].map((audit, index) => (
                    <div key={index} className="p-4 rounded-lg border border-border/50 bg-background hover:bg-muted/10 cursor-pointer transition-colors group">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">{audit.title}</span>
                        <span className="text-xs text-muted-foreground">{audit.id}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 mr-1" />
                          {audit.address}
                        </div>
                        <div className={cn("px-2 py-0.5 rounded-full text-xs font-medium", audit.statusColor)}>
                          {audit.status}
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-border/30 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-muted-foreground">Assigned to: Jane Smith</span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-3 py-1 rounded-full benton-bg-light-sand/20 benton-text-sand text-sm font-medium mb-4 benton-body">
                About
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 benton-heading">Built for County Assessors</h2>
              <p className="text-lg text-muted-foreground mb-6 benton-body">
                County Audit Hub was developed specifically for the needs of Benton County assessment departments, with input from experienced assessors and supervisors.
              </p>
              <div className="space-y-4">
                {[
                  "Secure, web-based platform with role-based access control",
                  "Real-time collaboration between assessors and supervisors",
                  "Comprehensive audit trails for all assessment activities",
                  "Detailed reporting and analytics capabilities"
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full benton-bg-sand/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 benton-text-sand" />
                    </div>
                    <p className="text-foreground/80 benton-body">{feature}</p>
                  </div>
                ))}
              </div>
              <Button className="mt-8 btn-depth benton-bg-blue benton-text-white hover:benton-bg-dark-blue benton-heading" onClick={() => setShowLoginForm(true)}>
                Access Dashboard
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 relative">
              <div className="absolute -z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-primary/5 rounded-full blur-xl"></div>
              
              <div className="col-span-2 sm:col-span-1 bg-card shadow-md rounded-lg border border-border/40 p-5 transform hover:-translate-y-1 transition-transform">
                <BarChart3 className="h-10 w-10 benton-text-blue mb-4" />
                <h3 className="text-lg font-semibold mb-2 benton-heading">Performance Metrics</h3>
                <p className="text-sm text-muted-foreground benton-body">Track assessment volume, approval rates, and processing times</p>
              </div>
              
              <div className="col-span-2 sm:col-span-1 bg-card shadow-md rounded-lg border border-border/40 p-5 transform hover:-translate-y-1 transition-transform sm:translate-y-6">
                <Map className="h-10 w-10 benton-text-green mb-4" />
                <h3 className="text-lg font-semibold mb-2 benton-heading">Geospatial Analysis</h3>
                <p className="text-sm text-muted-foreground benton-body">Visualize assessment distribution across the county</p>
              </div>
              
              <div className="col-span-2 sm:col-span-1 bg-card shadow-md rounded-lg border border-border/40 p-5 transform hover:-translate-y-1 transition-transform">
                <FileSpreadsheet className="h-10 w-10 benton-text-sand mb-4" />
                <h3 className="text-lg font-semibold mb-2 benton-heading">Comprehensive Reports</h3>
                <p className="text-sm text-muted-foreground benton-body">Generate detailed reports for county stakeholders</p>
              </div>
              
              <div className="col-span-2 sm:col-span-1 bg-card shadow-md rounded-lg border border-border/40 p-5 transform hover:-translate-y-1 transition-transform sm:translate-y-6">
                <Building className="h-10 w-10 benton-text-light-green mb-4" />
                <h3 className="text-lg font-semibold mb-2 benton-heading">Property Portfolio</h3>
                <p className="text-sm text-muted-foreground benton-body">Manage all property types in a unified system</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-muted/10 border-t border-border/20">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-6 md:mb-0">
              <Landmark className="h-6 w-6 benton-text-blue" />
              <span className="text-xl font-bold benton-heading">County Audit Hub</span>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-6 text-muted-foreground benton-body">
              <a href="#features" className="hover:benton-text-blue transition-colors">Features</a>
              <a href="#workflow" className="hover:benton-text-blue transition-colors">Workflow</a>
              <a href="#about" className="hover:benton-text-blue transition-colors">About</a>
              <Button variant="outline" onClick={() => setShowLoginForm(true)} className="benton-text-blue benton-border-blue hover:benton-bg-blue hover:benton-text-white">Sign In</Button>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-border/20 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground mb-4 md:mb-0 benton-body">
              © {new Date().getFullYear()} Benton County Assessor's Office. All rights reserved.
            </p>
            <div className="flex gap-4 benton-body">
              <span className="text-sm text-muted-foreground hover:benton-text-blue cursor-pointer transition-colors">Privacy Policy</span>
              <span className="text-sm text-muted-foreground hover:benton-text-blue cursor-pointer transition-colors">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}