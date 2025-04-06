import React, { useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import AuditQueue from "@/pages/audit-queue";
import CreateAudit from "@/pages/create-audit";
import Analytics from "@/pages/analytics";
import AuditHistory from "@/pages/audit-history";
import StyleDemo from "@/pages/style-demo";
import ModernStyleDemo from "@/pages/modern-style-demo";
import GISDashboard from "@/pages/gis-dashboard";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import ConnectionAlert from "./components/connection-alert";
import { Loader2 } from "lucide-react";
import MainLayout from "@/layouts/main-layout";

// Inner App component that relies on AuthContext
function AuthenticatedApp() {
  const auth = useAuth();
  const [location, navigate] = useLocation();
  
  // Use useEffect for navigation to avoid state updates during render
  useEffect(() => {
    if (auth.isLoading) return; // Skip navigation logic during loading
    
    if (!auth.user && location !== "/auth") {
      navigate("/auth");
    } else if (auth.user && location === "/auth") {
      navigate("/");
    }
  }, [auth.user, auth.isLoading, location, navigate]);
  
  // Show loading spinner while checking authentication
  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  // Render the appropriate page based on the route
  return (
    <>
      <ConnectionAlert />
      {auth.user ? (
        <MainLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/audit-queue" component={AuditQueue} />
            <Route path="/create-audit" component={CreateAudit} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/audit-history" component={AuditHistory} />
            <Route path="/modern-style-demo" component={ModernStyleDemo} />
            <Route path="/gis-dashboard" component={GISDashboard} />
            <Route component={NotFound} />
          </Switch>
        </MainLayout>
      ) : (
        <Switch>
          <Route path="/auth" component={AuthPage} />
          <Route path="/style-demo" component={StyleDemo} />
          <Route path="/modern-style-demo" component={ModernStyleDemo} />
          <Route path="/gis-dashboard" component={GISDashboard} />
          <Route>
            <Redirect to="/auth" />
          </Route>
        </Switch>
      )}
    </>
  );
}

// Root App component that provides the AuthProvider
function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
