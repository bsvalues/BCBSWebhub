import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Audit, insertAuditSchema } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

// Extend the insert audit schema with validation rules
const createAuditSchema = insertAuditSchema.extend({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  propertyId: z.string().min(3, "Property ID is required"),
  address: z.string().min(5, "Address is required"),
  currentAssessment: z.number().positive("Current assessment must be greater than 0"),
  proposedAssessment: z.number().positive("Proposed assessment must be greater than 0"),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  dueDate: z.date({
    required_error: "Due date is required",
    invalid_type_error: "Due date must be a valid date"
  }).refine((date) => date > new Date(), {
    message: "Due date must be in the future"
  })
});

type CreateAuditFormValues = z.infer<typeof createAuditSchema>;

interface CreateAuditFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateAuditForm({ onSuccess, onCancel }: CreateAuditFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Current date for min date in date picker
  const today = new Date();
  const formattedToday = format(today, 'yyyy-MM-dd');
  
  // Default values for the form
  const defaultValues: Partial<CreateAuditFormValues> = {
    title: "",
    description: "",
    propertyId: "",
    address: "",
    currentAssessment: 0,
    proposedAssessment: 0,
    taxImpact: 0,
    reason: "",
    priority: "normal",
    dueDate: new Date(today.setDate(today.getDate() + 7)), // Default due date is 7 days from now
    submittedById: user?.id
  };
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateAuditFormValues>({
    resolver: zodResolver(createAuditSchema),
    defaultValues
  });
  
  // Audit creation mutation
  const createAuditMutation = useMutation({
    mutationFn: async (data: CreateAuditFormValues) => {
      // Set the submittedById to the current user's ID
      const auditData = {
        ...data,
        submittedById: user!.id,
        auditNumber: `A-${Date.now().toString().slice(-6)}` // Generate a unique audit number
      };
      
      const res = await apiRequest("POST", "/api/audits", auditData);
      return await res.json();
    },
    onSuccess: (audit: Audit) => {
      toast({
        title: "Audit created",
        description: `Audit #${audit.auditNumber} has been created successfully.`
      });
      
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/audits/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audits/created"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/recent"] });
      
      // Reset the form
      reset();
      
      // Call the onSuccess callback if provided
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create audit: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  const onSubmit = (data: CreateAuditFormValues) => {
    // Calculate the tax impact if it's not provided
    if (!data.taxImpact) {
      const assessmentDiff = data.proposedAssessment - data.currentAssessment;
      // Simplified calculation, would need to be based on actual tax rates
      data.taxImpact = Math.round(assessmentDiff * 0.015); // Assume 1.5% property tax rate
    }
    
    createAuditMutation.mutate(data);
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6">Create New Audit</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Audit Information */}
        <div className="space-y-4">
          <h3 className="text-md font-medium border-b pb-2 mb-2">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Title</label>
              <input
                type="text"
                className={`w-full border ${errors.title ? 'border-red-500' : 'border-neutral-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Audit title"
                {...register("title")}
                disabled={createAuditMutation.isPending}
              />
              {errors.title && (
                <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Priority</label>
              <select
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register("priority")}
                disabled={createAuditMutation.isPending}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
            <textarea
              rows={3}
              className={`w-full border ${errors.description ? 'border-red-500' : 'border-neutral-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Detailed description of the audit"
              {...register("description")}
              disabled={createAuditMutation.isPending}
            ></textarea>
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Property ID</label>
              <input
                type="text"
                className={`w-full border ${errors.propertyId ? 'border-red-500' : 'border-neutral-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Property identification number"
                {...register("propertyId")}
                disabled={createAuditMutation.isPending}
              />
              {errors.propertyId && (
                <p className="text-red-500 text-xs mt-1">{errors.propertyId.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Due Date</label>
              <input
                type="date"
                className={`w-full border ${errors.dueDate ? 'border-red-500' : 'border-neutral-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                min={formattedToday}
                {...register("dueDate", { 
                  setValueAs: (v) => v ? new Date(v) : undefined 
                })}
                disabled={createAuditMutation.isPending}
              />
              {errors.dueDate && (
                <p className="text-red-500 text-xs mt-1">{errors.dueDate.message}</p>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Property Address</label>
            <input
              type="text"
              className={`w-full border ${errors.address ? 'border-red-500' : 'border-neutral-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Full property address"
              {...register("address")}
              disabled={createAuditMutation.isPending}
            />
            {errors.address && (
              <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
            )}
          </div>
        </div>
        
        {/* Assessment Information */}
        <div className="space-y-4">
          <h3 className="text-md font-medium border-b pb-2 mb-2">Assessment Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Current Assessment ($)</label>
              <input
                type="number"
                min="0"
                step="1000"
                className={`w-full border ${errors.currentAssessment ? 'border-red-500' : 'border-neutral-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                {...register("currentAssessment", { valueAsNumber: true })}
                disabled={createAuditMutation.isPending}
              />
              {errors.currentAssessment && (
                <p className="text-red-500 text-xs mt-1">{errors.currentAssessment.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Proposed Assessment ($)</label>
              <input
                type="number"
                min="0"
                step="1000"
                className={`w-full border ${errors.proposedAssessment ? 'border-red-500' : 'border-neutral-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                {...register("proposedAssessment", { valueAsNumber: true })}
                disabled={createAuditMutation.isPending}
              />
              {errors.proposedAssessment && (
                <p className="text-red-500 text-xs mt-1">{errors.proposedAssessment.message}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Estimated Tax Impact ($) <span className="text-neutral-500 text-xs">(Optional)</span></label>
              <input
                type="number"
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Will be calculated if empty"
                {...register("taxImpact", { valueAsNumber: true })}
                disabled={createAuditMutation.isPending}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Reason for Amendment <span className="text-neutral-500 text-xs">(Optional)</span></label>
              <input
                type="text"
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief explanation for the assessment change"
                {...register("reason")}
                disabled={createAuditMutation.isPending}
              />
            </div>
          </div>
        </div>
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-4">
          {onCancel && (
            <button
              type="button"
              className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-md hover:bg-neutral-50"
              onClick={onCancel}
              disabled={createAuditMutation.isPending}
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            disabled={createAuditMutation.isPending}
          >
            {createAuditMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Audit
          </button>
        </div>
      </form>
    </div>
  );
}