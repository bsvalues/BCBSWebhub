import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Password reset form schema
const resetPasswordSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordForm() {
  const { user, resetPasswordMutation } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const isAuthenticated = user !== null;

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      username: user?.username || ""
    }
  });

  const onSubmit = (data: ResetPasswordFormValues) => {
    resetPasswordMutation.mutate(data, {
      onSuccess: () => {
        setSubmitted(true);
        form.reset();
      }
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>
          Request a password reset for your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isAuthenticated && !submitted && (
          <div className="p-4 mb-4 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-amber-800 text-sm">
              <strong>Development Mode:</strong> Password resets require authentication in production.
            </p>
          </div>
        )}
      
        {submitted ? (
          <div className="text-center py-4">
            <h3 className="text-lg font-medium mb-2">Request Submitted</h3>
            <p className="text-muted-foreground mb-4">
              If an account exists with that username, you will receive a password reset email shortly.
            </p>
            <Button
              variant="outline"
              onClick={() => setSubmitted(false)}
            >
              Request Another Reset
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send Reset Email
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}