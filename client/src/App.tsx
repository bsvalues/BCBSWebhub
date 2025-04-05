import { Switch, Route, Redirect } from "wouter";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import AuditQueue from "@/pages/audit-queue";
import Analytics from "@/pages/analytics";
import AuditHistory from "@/pages/audit-history";
import MainLayout from "@/layouts/main-layout";
import { useAuth } from "@/hooks/use-auth";
import ConnectionAlert from "./components/connection-alert";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  return <MainLayout>{children}</MainLayout>;
}

function AuthenticatedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <ProtectedRoute>
      <Component />
    </ProtectedRoute>
  );
}

function LoginRoute() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  if (user) {
    return <Redirect to="/" />;
  }
  
  return <AuthPage />;
}

function App() {
  return (
    <>
      <ConnectionAlert />
      <Switch>
        <Route path="/auth" component={LoginRoute} />
        <Route path="/">
          <AuthenticatedRoute component={Dashboard} />
        </Route>
        <Route path="/audit-queue">
          <AuthenticatedRoute component={AuditQueue} />
        </Route>
        <Route path="/analytics">
          <AuthenticatedRoute component={Analytics} />
        </Route>
        <Route path="/audit-history">
          <AuthenticatedRoute component={AuditHistory} />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

export default App;
