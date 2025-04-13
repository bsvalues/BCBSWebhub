import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  ClipboardCheck,
  Clock,
  Home,
  Plus,
  Layers,
  LineChart,
  Settings,
  Search,
  HelpCircle,
  ChevronRight,
  FileText,
  User,
  Users,
  FolderTree,
  PieChart,
  Mail,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  isCollapsed: boolean;
  isActive?: boolean;
}

function SidebarLink({
  href,
  icon,
  label,
  badge,
  isCollapsed,
  isActive = false,
}: SidebarLinkProps) {
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center group py-2 px-3 rounded-md text-sm mb-1 transition-colors",
          isActive
            ? "bg-gradient-to-r from-blue-600/20 via-blue-600/40 to-blue-600/20 text-white"
            : "text-slate-100/80 hover:text-white hover:bg-gradient-to-r hover:from-blue-600/10 hover:to-blue-600/20"
        )}
      >
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center justify-between w-full",
                  isCollapsed && "justify-center"
                )}
              >
                <div className="flex items-center">
                  <div className={cn("h-5 w-5", isActive ? "text-blue-400" : "text-slate-400")}>
                    {icon}
                  </div>
                  {!isCollapsed && (
                    <span className="ml-3 duration-200">{label}</span>
                  )}
                </div>
                {!isCollapsed && badge && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "ml-auto bg-blue-900/60 border-blue-700 text-xs",
                      isActive && "bg-blue-700/60 border-blue-500"
                    )}
                  >
                    {badge}
                  </Badge>
                )}
              </div>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <div className="flex items-center">
                  <span>{label}</span>
                  {badge && (
                    <Badge
                      variant="outline"
                      className="ml-2 bg-blue-900/60 border-blue-700 text-xs"
                    >
                      {badge}
                    </Badge>
                  )}
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </a>
    </Link>
  );
}

interface SidebarGroupProps {
  title: string;
  children: React.ReactNode;
  isCollapsed: boolean;
}

function SidebarGroup({ title, children, isCollapsed }: SidebarGroupProps) {
  return (
    <div className="mb-6">
      {!isCollapsed && (
        <h3 className="text-xs uppercase text-slate-400 font-medium px-3 mb-2">
          {title}
        </h3>
      )}
      <div>{children}</div>
    </div>
  );
}

export default function ModernSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Pending items counts (for badges)
  const pendingAudits = 3;
  
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-gradient-to-b from-[#1a2e62] via-[#192b5e] to-[#132144] border-r border-blue-900/40 sticky top-0 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Sidebar header - only shown when expanded */}
      {!isCollapsed && (
        <div className="h-16 flex items-center px-4 mb-2 border-b border-blue-900/40">
          <img
            src="https://www.co.benton.wa.us/files/o/r/oregontraillogo_202008071648183323.png"
            alt="Benton County Logo"
            className="h-8 w-auto mr-2"
          />
          <div>
            <h1 className="text-md font-semibold text-white">County Audit Hub</h1>
            <p className="text-xs text-blue-300">Benton County, WA</p>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute top-3 -right-3 bg-blue-600 text-white p-1 rounded-full shadow-md hover:bg-blue-700 transition-colors"
      >
        <ChevronRight
          size={16}
          className={cn(
            "transition-transform duration-300",
            isCollapsed ? "" : "rotate-180"
          )}
        />
      </button>

      {/* Scrollable sidebar content */}
      <ScrollArea className="flex-1 px-2 py-3">
        {isCollapsed ? (
          // Collapsed view - simplified navigation
          <div className="flex flex-col items-center space-y-4 py-4">
            <SidebarLink
              href="/"
              icon={<Home size={20} />}
              label="Dashboard"
              isCollapsed={true}
              isActive={location === "/"}
            />
            <SidebarLink
              href="/audit-queue"
              icon={<ClipboardCheck size={20} />}
              label="Audit Queue"
              badge={pendingAudits}
              isCollapsed={true}
              isActive={location === "/audit-queue"}
            />
            <SidebarLink
              href="/create-audit"
              icon={<Plus size={20} />}
              label="Create Audit"
              isCollapsed={true}
              isActive={location === "/create-audit"}
            />
            <SidebarLink
              href="/audit-history"
              icon={<Clock size={20} />}
              label="Audit History"
              isCollapsed={true}
              isActive={location === "/audit-history"}
            />
            <SidebarLink
              href="/analytics"
              icon={<BarChart3 size={20} />}
              label="Analytics"
              isCollapsed={true}
              isActive={location === "/analytics"}
            />
            <SidebarLink
              href="/gis-dashboard"
              icon={<MapPin size={20} />}
              label="GIS Dashboard"
              isCollapsed={true}
              isActive={location === "/gis-dashboard"}
            />
            <SidebarLink
              href="/style-demo"
              icon={<Layers size={20} />}
              label="Style Guide"
              isCollapsed={true}
              isActive={location === "/style-demo"}
            />
          </div>
        ) : (
          // Expanded view - full navigation with groups
          <>
            <SidebarGroup title="Main Navigation" isCollapsed={isCollapsed}>
              <SidebarLink
                href="/"
                icon={<Home size={18} />}
                label="Dashboard"
                isCollapsed={isCollapsed}
                isActive={location === "/"}
              />
              <SidebarLink
                href="/audit-queue"
                icon={<ClipboardCheck size={18} />}
                label="Audit Queue"
                badge={pendingAudits}
                isCollapsed={isCollapsed}
                isActive={location === "/audit-queue"}
              />
              <SidebarLink
                href="/create-audit"
                icon={<Plus size={18} />}
                label="Create Audit"
                isCollapsed={isCollapsed}
                isActive={location === "/create-audit"}
              />
              <SidebarLink
                href="/audit-history"
                icon={<Clock size={18} />}
                label="Audit History"
                isCollapsed={isCollapsed}
                isActive={location === "/audit-history"}
              />
            </SidebarGroup>

            <SidebarGroup title="Insights" isCollapsed={isCollapsed}>
              <SidebarLink
                href="/analytics"
                icon={<BarChart3 size={18} />}
                label="Analytics Dashboard"
                isCollapsed={isCollapsed}
                isActive={location === "/analytics"}
              />
              <SidebarLink
                href="/advanced-analytics"
                icon={<LineChart size={18} />}
                label="Advanced Analytics"
                isCollapsed={isCollapsed}
                isActive={location === "/advanced-analytics"}
              />
              <SidebarLink
                href="/reports"
                icon={<FileText size={18} />}
                label="Reports"
                isCollapsed={isCollapsed}
                isActive={location === "/reports"}
              />
              <SidebarLink
                href="/metrics"
                icon={<PieChart size={18} />}
                label="Performance Metrics"
                isCollapsed={isCollapsed}
                isActive={location === "/metrics"}
              />
              <SidebarLink
                href="/gis-dashboard"
                icon={<MapPin size={18} />}
                label="GIS Dashboard"
                isCollapsed={isCollapsed}
                isActive={location === "/gis-dashboard"}
              />
            </SidebarGroup>

            <SidebarGroup title="Administration" isCollapsed={isCollapsed}>
              <SidebarLink
                href="/user-management"
                icon={<Users size={18} />}
                label="User Management"
                isCollapsed={isCollapsed}
                isActive={location === "/user-management"}
              />
              <SidebarLink
                href="/settings"
                icon={<Settings size={18} />}
                label="System Settings"
                isCollapsed={isCollapsed}
                isActive={location === "/settings"}
              />
              <SidebarLink
                href="/properties"
                icon={<FolderTree size={18} />}
                label="Property Database"
                isCollapsed={isCollapsed}
                isActive={location === "/properties"}
              />
            </SidebarGroup>
            
            <SidebarGroup title="Resources" isCollapsed={isCollapsed}>
              <SidebarLink
                href="/style-demo"
                icon={<Layers size={18} />}
                label="Style Guide"
                isCollapsed={isCollapsed}
                isActive={location === "/style-demo"}
              />
              <SidebarLink
                href="/search"
                icon={<Search size={18} />}
                label="Advanced Search"
                isCollapsed={isCollapsed}
                isActive={location === "/search"}
              />
              <SidebarLink
                href="/help"
                icon={<HelpCircle size={18} />}
                label="Help Center"
                isCollapsed={isCollapsed}
                isActive={location === "/help"}
              />
              <SidebarLink
                href="/support"
                icon={<Mail size={18} />}
                label="Contact Support"
                isCollapsed={isCollapsed}
                isActive={location === "/support"}
              />
            </SidebarGroup>
          </>
        )}
      </ScrollArea>

      {/* User profile section at bottom */}
      {!isCollapsed && user && (
        <div className="px-3 py-4 mt-auto border-t border-blue-900/40">
          <div className="flex items-center">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{user.username}</p>
              <p className="text-xs text-blue-300">Administrator</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}