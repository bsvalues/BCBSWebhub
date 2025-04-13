import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Search,
  Menu,
  X,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Map,
  BarChart3,
  ClipboardCheck,
  FilePlus2,
  History,
  Layers,
  Home,
  PanelLeftClose,
  BookOpen,
  LineChart
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function ModernHeader() {
  const { user, logoutMutation } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [expandMenu, setExpandMenu] = useState(false);
  const [location] = useLocation();
  
  const toggleSearch = () => setSearchOpen(!searchOpen);
  const toggleMenu = () => setExpandMenu(!expandMenu);
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Function to generate navigation links with active states and icons
  const NavLink = ({ 
    href, 
    icon: Icon, 
    label, 
    badge 
  }: { 
    href: string; 
    icon: React.ElementType; 
    label: string; 
    badge?: number | string 
  }) => {
    const isActive = location === href;
    
    return (
      <Link href={href}>
        <a className={cn(
          "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-[var(--transition-medium)]",
          isActive 
            ? "bg-primary/15 text-primary"
            : "text-blue-100 hover:text-white hover:bg-white/10"
        )}>
          <Icon className={cn("mr-2 h-4 w-4", isActive ? "text-primary" : "")} />
          <span>{label}</span>
          {badge && (
            <Badge className="ml-2 bg-primary/90 hover:bg-primary text-white" variant="outline">
              {badge}
            </Badge>
          )}
        </a>
      </Link>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-50">
        {/* Main Header Bar */}
        <div className="bg-gradient-to-r from-[#093576] via-[#1e4590] to-[#093576] shadow-md backdrop-blur-sm bg-opacity-95 border-b border-blue-900/20">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            {/* Logo and Title with subtle topographic pattern */}
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-sm p-1.5">
                <img
                  src="https://www.co.benton.wa.us/files/o/r/oregontraillogo_202008071648183323.png"
                  alt="Benton County Logo"
                  className="h-full w-auto"
                />
              </div>
              <div>
                <h1 className="text-base font-semibold text-white">
                  <span className="hidden sm:inline">Benton County</span> Assessor
                </h1>
                <div className="flex items-center space-x-1">
                  <div className="bg-blue-600 h-1.5 w-1.5 rounded-full"></div>
                  <p className="text-xs text-blue-200 font-medium tracking-wide uppercase">County Audit Hub</p>
                </div>
              </div>
            </div>

            {/* Centered Navigation - Desktop */}
            <nav className="hidden lg:flex items-center space-x-1">
              <NavLink href="/" icon={Home} label="Dashboard" />
              <NavLink href="/audit-queue" icon={ClipboardCheck} label="Audit Queue" badge={3} />
              <NavLink href="/create-audit" icon={FilePlus2} label="New Audit" />
              <NavLink href="/audit-history" icon={History} label="History" />
              <NavLink href="/analytics" icon={BarChart3} label="Analytics" />
              <NavLink href="/advanced-analytics" icon={LineChart} label="Advanced Analytics" />
              <NavLink href="/modern-style-demo" icon={Layers} label="GIS View" />
              <NavLink href="/style-demo" icon={BookOpen} label="Style Guide" />
            </nav>

            {/* Right Section: Search & User Actions */}
            <div className="flex items-center space-x-2">
              {/* Search - Collapsed by default, expands with animation */}
              <div className={cn(
                "relative overflow-hidden transition-all duration-300 ease-[var(--ease-out-expo)]", 
                searchOpen ? "w-64" : "w-9"
              )}>
                <div className="absolute inset-0 flex items-center rounded-full bg-white/10 border border-white/20">
                  <input
                    type="text"
                    placeholder="Search parcels, audits, addresses..."
                    className={cn(
                      "w-full h-full pl-9 pr-4 py-1.5 bg-transparent text-white placeholder:text-blue-200 focus:outline-none",
                      !searchOpen && "opacity-0"
                    )}
                  />
                  <button 
                    onClick={toggleSearch}
                    className="absolute left-2 text-blue-200 hover:text-white p-1"
                  >
                    <Search size={16} />
                  </button>
                  
                  {searchOpen && (
                    <button 
                      onClick={toggleSearch}
                      className="absolute right-2 text-blue-200 hover:text-white p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications with indicator */}
              <Button 
                variant="ghost" 
                size="sm"
                className="relative p-2 rounded-full h-9 w-9 text-blue-200 hover:text-white hover:bg-white/10"
              >
                <Bell size={16} />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-blue-900"></span>
              </Button>

              {/* Map Toggle Button */}
              <Button 
                variant="ghost" 
                size="sm"
                className="relative p-2 rounded-full h-9 w-9 text-blue-200 hover:text-white hover:bg-white/10 hidden sm:flex"
              >
                <Map size={16} />
              </Button>

              {/* User Menu */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="p-1.5 h-9 rounded-full text-blue-100 hover:text-white hover:bg-white/10 flex items-center gap-1.5"
                    >
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-inner">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="hidden sm:inline-block max-w-24 truncate text-sm">{user.username}</span>
                      <ChevronDown className="hidden sm:block" size={12} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 mt-1" align="end">
                    <DropdownMenuLabel className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.username}</span>
                        <span className="text-xs text-muted-foreground">{user.role}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="cursor-pointer text-red-500 focus:text-red-500"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Mobile Menu Button */}
              <Button
                onClick={toggleMenu}
                variant="ghost"
                size="sm"
                className="lg:hidden p-2 rounded-full h-9 w-9 text-blue-200 hover:text-white hover:bg-white/10"
              >
                {expandMenu ? <X size={16} /> : <Menu size={16} />}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation - Overlay */}
        <div className={cn(
          "fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
          expandMenu ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <div className={cn(
            "w-full max-w-xs bg-gradient-to-br from-[#0c3975] to-[#052555] h-full transform transition-transform duration-300 ease-[var(--ease-out-expo)] border-r border-blue-900/20",
            expandMenu ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Navigation</h2>
                <Button
                  onClick={toggleMenu}
                  variant="ghost"
                  size="sm"
                  className="p-2 rounded-full h-8 w-8 text-blue-200 hover:text-white hover:bg-white/10"
                >
                  <PanelLeftClose size={16} />
                </Button>
              </div>
              
              <div className="space-y-1">
                <NavLink href="/" icon={Home} label="Dashboard" />
                <NavLink href="/audit-queue" icon={ClipboardCheck} label="Audit Queue" badge={3} />
                <NavLink href="/create-audit" icon={FilePlus2} label="New Audit" />
                <NavLink href="/audit-history" icon={History} label="History" />
                <NavLink href="/analytics" icon={BarChart3} label="Analytics" />
                <NavLink href="/advanced-analytics" icon={LineChart} label="Advanced Analytics" />
                <NavLink href="/modern-style-demo" icon={Layers} label="GIS View" />
                <NavLink href="/style-demo" icon={BookOpen} label="Style Guide" />
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center space-x-2 px-3 py-2 bg-white/5 rounded-md">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
                    {user?.username.charAt(0).toUpperCase() || 'G'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-white font-medium">{user?.username || 'Guest'}</span>
                    <span className="text-xs text-blue-200">{user?.role || 'Not logged in'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Coordinate display bar - GIS contexts */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 border-b border-blue-800/30 text-xs text-blue-200 py-1 hidden lg:block">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="coordinate-display">
              <span className="text-blue-400 mr-1">Lat/Lon:</span> 46.2304° N, 119.2368° W
            </div>
            <div className="coordinate-display">
              <span className="text-blue-400 mr-1">PLSS:</span> T9N R29E S21
            </div>
            <div className="coordinate-display">
              <span className="text-blue-400 mr-1">Zoom:</span> 14
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span>Active Layer:</span>
            <Badge variant="outline" className="bg-blue-800/50 text-blue-100 border-blue-700 hover:bg-blue-800 py-0">
              2024 Parcel Base
            </Badge>
          </div>
        </div>
      </div>
    </>
  );
}