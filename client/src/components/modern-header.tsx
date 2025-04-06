import React, { useState } from "react";
import { Link } from "wouter";
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

export default function ModernHeader() {
  const { user, logoutMutation } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  
  const toggleSearch = () => setSearchOpen(!searchOpen);
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-gradient-to-r from-[#1e3a8a] via-[#2a4ebd] to-[#1e3a8a] border-b border-blue-700/30 sticky top-0 z-40 shadow-md backdrop-blur-sm bg-opacity-95">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <img
            src="https://www.co.benton.wa.us/files/o/r/oregontraillogo_202008071648183323.png"
            alt="Benton County Logo"
            className="h-10 w-auto"
          />
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-white">
              Benton County Assessor
            </h1>
            <p className="text-xs text-blue-200">County Audit Hub</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/">
            <a className="text-blue-100 hover:text-white transition-colors">
              Dashboard
            </a>
          </Link>
          <Link href="/audit-queue">
            <a className="text-blue-100 hover:text-white transition-colors">
              Audit Queue
            </a>
          </Link>
          <Link href="/create-audit">
            <a className="text-blue-100 hover:text-white transition-colors">
              New Audit
            </a>
          </Link>
          <Link href="/audit-history">
            <a className="text-blue-100 hover:text-white transition-colors">
              History
            </a>
          </Link>
          <Link href="/analytics">
            <a className="text-blue-100 hover:text-white transition-colors">
              Analytics
            </a>
          </Link>
          <Link href="/style-demo">
            <a className="text-blue-100 hover:text-white transition-colors">
              Style Guide
            </a>
          </Link>
        </nav>

        {/* Right Section: Search & User Actions */}
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className={cn("relative", searchOpen ? "flex-1" : "")}>
            {searchOpen ? (
              <div className="absolute inset-0 flex items-center bg-blue-800 rounded-md overflow-hidden">
                <input
                  type="text"
                  placeholder="Search audits, properties..."
                  className="w-full h-full px-3 py-1.5 bg-transparent text-white placeholder:text-blue-300 focus:outline-none"
                  autoFocus
                />
                <button 
                  onClick={toggleSearch}
                  className="p-2 text-blue-200 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={toggleSearch}
                className="p-2 text-blue-200 hover:text-white rounded-md transition-colors"
              >
                <Search size={18} />
              </button>
            )}
          </div>

          {/* Notifications */}
          <button className="p-2 text-blue-200 hover:text-white rounded-md transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
          </button>

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="p-1.5 h-auto text-blue-100 hover:text-white hover:bg-blue-800 flex items-center gap-1.5"
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline-block">{user.username}</span>
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
          <button className="md:hidden p-2 text-blue-200 hover:text-white rounded-md transition-colors">
            <Menu size={24} />
          </button>
        </div>
      </div>
    </header>
  );
}