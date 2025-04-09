import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Email update form schema
const updateEmailSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Must be a valid email address")
});

type UpdateEmailFormValues = z.infer<typeof updateEmailSchema>;

export default function UpdateEmailForm() {
  const { user, updateEmailMutation } = useAuth();
  const [success, setSuccess] = useState(false);
  const isAuthenticated = user !== null;

  // Initialize form with current email if available
  const form = useForm<UpdateEmailFormValues>({
    resolver: zodResolver(updateEmailSchema),
    defaultValues: {
      email: user?.email || ""
    }
  });

  const onSubmit = (data: UpdateEmailFormValues) => {
    updateEmailMutation.mutate(data, {
      onSuccess: () => {
        setSuccess(true);
        
        // Reset success message after 3 seconds
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      }
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Update Email Address</CardTitle>
        <CardDescription>
          Change the email address associated with your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isAuthenticated && (
          <div className="p-4 mb-4 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-amber-800 text-sm">
              <strong>Development Mode:</strong> Email updates require authentication in production.
            </p>
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="your.email@bentoncounty.gov" {...field} />
                  </FormControl>
                  <FormDescription>
                    This email will be used for password resets and notifications
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center justify-between">
              <Button 
                type="submit" 
                disabled={updateEmailMutation.isPending || !isAuthenticated}
              >
                {updateEmailMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Email
              </Button>
              
              {success && (
                <p className="text-sm text-green-600 font-medium">
                  Email updated successfully!
                </p>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}