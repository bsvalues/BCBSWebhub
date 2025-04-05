import { Switch, Route, Redirect, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
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

// Basic authenticated route component
const PrivateRoute = ({ component: Component }: { component: React.ComponentType }) => {
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
  
  return (
    <MainLayout>
      <Component />
    </MainLayout>
  );
};

// Auth route - redirects to dashboard if already logged in
const AuthRoute = () => {
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
};

function App() {
  return (
    <>
      <Switch>
        <Route path="/auth">
          <AuthRoute />
        </Route>
        <Route path="/">
          <PrivateRoute component={Dashboard} />
        </Route>
        <Route path="/audit-queue">
          <PrivateRoute component={AuditQueue} />
        </Route>
        <Route path="/analytics">
          <PrivateRoute component={Analytics} />
        </Route>
        <Route path="/audit-history">
          <PrivateRoute component={AuditHistory} />
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
      <Toaster />
      <ConnectionAlert />
    </>
  );
}

export default App;
