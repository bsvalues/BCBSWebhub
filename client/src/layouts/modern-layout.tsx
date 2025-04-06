import React, { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import ModernHeader from "@/components/modern-header";
import ModernSidebar from "@/components/modern-sidebar";
import { Toaster } from "@/components/ui/toaster";
import { useIsMobile } from "@/hooks/use-mobile";

interface ModernLayoutProps {
  children: ReactNode;
}

export default function ModernLayout({ children }: ModernLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800">
      {/* Sidebar */}
      <div className={cn("relative", !sidebarOpen && "hidden md:block")}>
        <ModernSidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <ModernHeader />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Page content */}
            {children}
          </div>
        </main>
        
        <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-4 px-6 text-center text-slate-500 dark:text-slate-400 text-xs">
          <p>© {new Date().getFullYear()} Benton County Assessor's Office. All rights reserved.</p>
        </footer>
      </div>
      
      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}