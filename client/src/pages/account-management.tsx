import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import UpdateEmailForm from "@/components/account/update-email-form";
import ResetPasswordForm from "@/components/account/reset-password-form";

export default function AccountManagement() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  // During development, don't redirect if not authenticated
  // useEffect(() => {
  //   if (!isLoading && !user) {
  //     navigate("/auth");
  //   }
  // }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // For development, show non-authenticated message instead of redirecting
  const isAuthenticated = user !== null;

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Account Management</h1>
      <p className="text-muted-foreground mb-8">Manage your account settings and preferences</p>
      
      {!isAuthenticated ? (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg mb-8">
          <h3 className="text-lg font-medium text-blue-800 mb-2">Development Mode</h3>
          <p className="text-blue-700 mb-4">
            You are currently not logged in. In production, this page would require authentication.
            For development purposes, you can still view and interact with the account management features.
          </p>
          <p className="text-blue-700">
            Note: Some functionality may not work fully without authentication.
          </p>
        </div>
      ) : null}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <div className="bg-card p-6 rounded-lg shadow-sm border mb-6">
            <div className="mb-4">
              <label className="text-sm font-medium text-muted-foreground">Username</label>
              <p className="text-foreground">{user?.username || "Not logged in"}</p>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <p className="text-foreground">{user?.fullName || "Not available"}</p>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <p className="text-foreground capitalize">{user?.role || "Not available"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-foreground">{user?.email || "No email address set"}</p>
            </div>
          </div>
          
          <UpdateEmailForm />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Security</h2>
          <ResetPasswordForm />
          
          <div className="mt-8 bg-amber-50 border border-amber-200 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-amber-800 mb-2">Account Security Best Practices</h3>
            <ul className="list-disc pl-5 space-y-2 text-amber-700">
              <li>Use a strong, unique password that you don't reuse on other sites</li>
              <li>Never share your account credentials with anyone</li>
              <li>Ensure your email address is current to receive important notifications</li>
              <li>Log out when using shared computers</li>
              <li>Report any suspicious activity to the IT department</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}