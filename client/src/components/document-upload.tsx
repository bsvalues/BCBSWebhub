import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Audit } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Upload, File, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface DocumentUploadProps {
  auditId: number;
}

interface Document {
  id: number;
  auditId: number;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadedById: number;
  uploadedAt: string;
  url: string;
}

export default function DocumentUpload({ auditId }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch documents
  const { data: documents, isLoading: isLoadingDocs } = useQuery<Document[]>({
    queryKey: [`/api/audits/${auditId}/documents`],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      return response.json();
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ auditId, file }: { auditId: number, file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`/api/audits/${auditId}/documents`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to upload document');
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Document uploaded",
        description: "The document has been uploaded successfully."
      });
      
      // Clear the file input
      setFile(null);
      
      // Invalidate the documents query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/audits/${auditId}/documents`] });
      queryClient.invalidateQueries({ queryKey: [`/api/audits/${auditId}/events`] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/recent"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to upload document: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ documentId }: { documentId: number }) => {
      const res = await apiRequest("DELETE", `/api/documents/${documentId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully."
      });
      
      // Invalidate the documents query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/audits/${auditId}/documents`] });
      queryClient.invalidateQueries({ queryKey: [`/api/audits/${auditId}/events`] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/recent"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete document: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }
    
    uploadMutation.mutate({
      auditId,
      file
    });
  };

  const handleDelete = (documentId: number) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteMutation.mutate({ documentId });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "MMM d, yyyy, h:mm a");
  };

  return (
    <div>
      <div className="mb-6">
        <h5 className="font-medium mb-4">Upload New Document</h5>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            id="document-upload"
            className="block w-full text-sm text-neutral-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            onChange={handleFileChange}
            disabled={uploadMutation.isPending}
          />
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            onClick={handleUpload}
            disabled={!file || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload
          </button>
        </div>
      </div>
      
      <h5 className="font-medium mb-4">Attached Documents</h5>
      
      {isLoadingDocs ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
          <span>Loading documents...</span>
        </div>
      ) : documents && documents.length > 0 ? (
        <div className="border rounded-md divide-y">
          {documents.map(doc => (
            <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-neutral-50">
              <div className="flex items-center">
                <File className="h-5 w-5 text-neutral-500 mr-3" />
                <div>
                  <h6 className="font-medium text-sm">{doc.filename}</h6>
                  <div className="flex items-center space-x-3 text-xs text-neutral-500 mt-1">
                    <span>{doc.fileType}</span>
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                >
                  View
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1 text-red-600 rounded hover:bg-red-50"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-neutral-50 rounded-lg border border-dashed border-neutral-300">
          <File className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
          <h5 className="font-medium text-neutral-800 mb-2">No Documents Attached</h5>
          <p className="text-sm text-neutral-500 mb-4">
            There are no documents attached to this audit yet. Upload a document to get started.
          </p>
        </div>
      )}
    </div>
  );
}