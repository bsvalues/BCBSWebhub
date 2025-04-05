import { Switch, Route, Redirect, useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import AuditQueue from "@/pages/audit-queue";
import Analytics from "@/pages/analytics";
import AuditHistory from "@/pages/audit-history";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import ConnectionAlert from "./components/connection-alert";
import { Loader2 } from "lucide-react";
import MainLayout from "@/layouts/main-layout";

// Inner App component that relies on AuthContext
function AuthenticatedApp() {
  const auth = useAuth();
  const [location, navigate] = useLocation();
  
  // Show loading spinner while checking authentication
  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  // Handle auth redirects
  if (!auth.user && location !== "/auth") {
    navigate("/auth");
    return null;
  } else if (auth.user && location === "/auth") {
    navigate("/");
    return null;
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
            <Route path="/analytics" component={Analytics} />
            <Route path="/audit-history" component={AuditHistory} />
            <Route component={NotFound} />
          </Switch>
        </MainLayout>
      ) : (
        <Switch>
          <Route path="/auth" component={AuthPage} />
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
