import { ReactNode } from "react";
import Sidebar from "@/components/sidebar";
import MobileHeader from "@/components/mobile-header";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar (desktop) */}
      <Sidebar />
      
      {/* Mobile header */}
      <MobileHeader />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden pt-0 md:pt-0">
        {children}
      </div>
    </div>
  );
}
