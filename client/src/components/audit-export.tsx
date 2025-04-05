import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Audit } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Download, FileText, Table } from "lucide-react";
import { format } from "date-fns";

interface AuditExportProps {
  audit: Audit;
}

export default function AuditExport({ audit }: AuditExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const formatDate = (date: Date | string) => {
    return format(new Date(date), "yyyy-MM-dd");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      setIsExporting(true);
      
      const res = await fetch(`/api/audits/${audit.id}/export?format=${format}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error(`Failed to export audit: ${res.status}`);
      }
      
      // Create a download link
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Set the filename
      const today = formatDate(new Date());
      a.download = `audit-${audit.auditNumber}-${today}.${format}`;
      
      // Click the link to trigger the download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: `Audit ${audit.auditNumber} has been exported as ${format.toUpperCase()}.`
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Could not export the audit",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="border rounded-md p-4 space-y-4">
      <h5 className="font-medium">Export Audit Report</h5>
      <p className="text-sm text-neutral-600">
        Download this audit as a PDF or CSV file for offline viewing or sharing.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          Export as PDF
        </button>
        <button
          onClick={() => handleExport('csv')}
          disabled={isExporting}
          className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50 flex items-center"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Table className="h-4 w-4 mr-2" />
          )}
          Export as CSV
        </button>
      </div>
    </div>
  );
}