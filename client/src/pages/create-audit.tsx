import Header from "@/components/header";
import CreateAuditForm from "@/components/create-audit-form";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function CreateAuditPage() {
  const [_, setLocation] = useLocation();

  const handleSuccess = () => {
    // Redirect to the audit queue after successful audit creation
    setLocation("/audit-queue");
  };

  const handleCancel = () => {
    // Go back to the audit queue
    setLocation("/audit-queue");
  };

  const goToAuditQueue = () => {
    setLocation("/audit-queue");
  };

  return (
    <>
      <Header title="Create New Audit" />
      
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 pb-4 px-4 md:px-6">
        <div className="my-6">
          <button 
            onClick={goToAuditQueue}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Audit Queue
          </button>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Create New Audit</h2>
            <CreateAuditForm onSuccess={handleSuccess} onCancel={handleCancel} />
          </div>
        </div>
      </main>
    </>
  );
}