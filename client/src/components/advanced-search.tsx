import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Search, X, Filter, Loader2 } from "lucide-react";
import { Audit } from "@shared/schema";

interface AdvancedSearchProps {
  onSearch: (results: Audit[]) => void;
  onClose?: () => void;
}

type SearchCriteria = {
  auditNumber?: string;
  propertyId?: string;
  title?: string;
  description?: string;
  address?: string;
  reason?: string;
  status?: string;
  priority?: string;
  submittedDateStart?: Date;
  submittedDateEnd?: Date;
  dueDateStart?: Date;
  dueDateEnd?: Date;
  assignedToId?: number;
  submittedById?: number;
  assessmentMin?: number;
  assessmentMax?: number;
};

export default function AdvancedSearch({ onSearch, onClose }: AdvancedSearchProps) {
  const [criteria, setCriteria] = useState<SearchCriteria>({});
  const [activeTab, setActiveTab] = useState<"basic" | "advanced">("basic");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get users for select boxes
  const users = queryClient.getQueryData<any[]>(["/api/users"]) || [];

  const searchMutation = useMutation({
    mutationFn: async (searchParams: SearchCriteria) => {
      const res = await apiRequest("POST", "/api/audits/search", searchParams);
      return res.json();
    },
    onSuccess: (data: Audit[]) => {
      toast({
        title: "Search complete",
        description: `Found ${data.length} audit(s) matching your criteria`
      });
      onSearch(data);
      if (onClose) onClose();
    },
    onError: (error) => {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSearch = () => {
    // Remove any empty criteria to clean up the query
    const cleanCriteria = Object.fromEntries(
      Object.entries(criteria).filter(([_, value]) => {
        if (value === undefined || value === "") return false;
        if (typeof value === "string" && value.trim() === "") return false;
        return true;
      })
    );
    
    searchMutation.mutate(cleanCriteria);
  };

  const handleReset = () => {
    setCriteria({});
  };

  const updateCriteria = (key: keyof SearchCriteria, value: any) => {
    setCriteria((prev) => ({ ...prev, [key]: value }));
  };
  
  const handleDateRangeSelect = (key: "submitted" | "due", range: { from?: Date; to?: Date }) => {
    if (range.from) {
      setCriteria(prev => ({
        ...prev,
        [`${key}DateStart`]: range.from,
        [`${key}DateEnd`]: range.to || range.from
      }));
    }
  };
  
  const formatDateRange = (start?: Date, end?: Date) => {
    if (!start) return "Select date range";
    if (end && end.getTime() !== start.getTime()) {
      return `${format(start, "PP")} - ${format(end, "PP")}`;
    }
    return format(start, "PP");
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <Search className="h-5 w-5 mr-2" />
          Advanced Audit Search
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="flex border-b border-neutral-200">
          <button
            className={`py-2 px-4 ${
              activeTab === "basic"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-neutral-600"
            }`}
            onClick={() => setActiveTab("basic")}
          >
            Basic Search
          </button>
          <button
            className={`py-2 px-4 ${
              activeTab === "advanced"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-neutral-600"
            }`}
            onClick={() => setActiveTab("advanced")}
          >
            Advanced Filters
          </button>
        </div>
      </div>

      {activeTab === "basic" ? (
        <div className="space-y-4">
          <div className="relative">
            <Input
              id="searchAll"
              placeholder="Search all fields (fuzzy search for title, description, property ID, address, etc.)"
              value={criteria.title || ""}
              onChange={(e) => updateCriteria("title", e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <div className="text-xs text-neutral-500 mt-1">
              Smart search: System will find matches even with typos or partial terms
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="auditNumber">Audit Number</Label>
              <Input
                id="auditNumber"
                placeholder="Search by audit number"
                value={criteria.auditNumber || ""}
                onChange={(e) => updateCriteria("auditNumber", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyId">Property ID</Label>
              <Input
                id="propertyId"
                placeholder="Search by property ID"
                value={criteria.propertyId || ""}
                onChange={(e) => updateCriteria("propertyId", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Property Address</Label>
              <Input
                id="address"
                placeholder="Search by property address"
                value={criteria.address || ""}
                onChange={(e) => updateCriteria("address", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Audit Reason</Label>
              <Input
                id="reason"
                placeholder="Search by audit reason"
                value={criteria.reason || ""}
                onChange={(e) => updateCriteria("reason", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={criteria.status || ""}
                onValueChange={(value) => updateCriteria("status", value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="needs_info">Needs Information</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={criteria.priority || ""}
                onValueChange={(value) => updateCriteria("priority", value)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Submitted Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-normal h-10"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateRange(criteria.submittedDateStart, criteria.submittedDateEnd)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{
                      from: criteria.submittedDateStart,
                      to: criteria.submittedDateEnd
                    }}
                    onSelect={(range) => handleDateRangeSelect("submitted", range || {})}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Due Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-normal h-10"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateRange(criteria.dueDateStart, criteria.dueDateEnd)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{
                      from: criteria.dueDateStart,
                      to: criteria.dueDateEnd
                    }}
                    onSelect={(range) => handleDateRangeSelect("due", range || {})}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedToId">Assigned To</Label>
              <Select
                value={criteria.assignedToId?.toString() || ""}
                onValueChange={(value) => 
                  updateCriteria("assignedToId", value ? parseInt(value) : undefined)
                }
              >
                <SelectTrigger id="assignedToId">
                  <SelectValue placeholder="Any Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Assignee</SelectItem>
                  <SelectItem value="null">Unassigned</SelectItem>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="submittedById">Submitted By</Label>
              <Select
                value={criteria.submittedById?.toString() || ""}
                onValueChange={(value) => 
                  updateCriteria("submittedById", value ? parseInt(value) : undefined)
                }
              >
                <SelectTrigger id="submittedById">
                  <SelectValue placeholder="Any Submitter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Submitter</SelectItem>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assessmentMin">Min Assessment Value</Label>
              <Input
                id="assessmentMin"
                type="number"
                placeholder="Minimum value"
                value={criteria.assessmentMin?.toString() || ""}
                onChange={(e) => updateCriteria("assessmentMin", e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assessmentMax">Max Assessment Value</Label>
              <Input
                id="assessmentMax"
                type="number"
                placeholder="Maximum value"
                value={criteria.assessmentMax?.toString() || ""}
                onChange={(e) => updateCriteria("assessmentMax", e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2 mt-6">
        <Button variant="outline" onClick={handleReset}>
          Reset
        </Button>
        <Button 
          onClick={handleSearch}
          disabled={searchMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {searchMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Search
            </>
          )}
        </Button>
      </div>
    </div>
  );
}