import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

export default function MobileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
    setMenuOpen(false);
  };

  const isActive = (path: string) => location === path;
  
  // Derive page title from current location
  const getPageTitle = () => {
    switch(location) {
      case '/': return 'Dashboard';
      case '/audit-queue': return 'Audit Queue';
      case '/analytics': return 'Analytics';
      case '/audit-history': return 'Audit History';
      case '/account': return 'Account Management';
      case '/settings': return 'Settings';
      default: return 'County Audit Hub';
    }
  };

  return (
    <>
      <div className="bg-neutral-900 text-white w-full p-4 md:hidden fixed top-0 z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center">
            <span className="material-icons mr-2">account_balance</span>
            {getPageTitle()}
          </h1>
          <button className="p-1" onClick={() => setMenuOpen(!menuOpen)}>
            <span className="material-icons">{menuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {menuOpen && (
        <div className="fixed inset-0 bg-neutral-900 z-20 pt-16 md:hidden">
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-neutral-400 text-xs uppercase font-semibold px-2 py-2">
                Main
              </div>
              
              <Link href="/">
                <a className={`flex items-center px-4 py-3 mt-1 rounded-lg ${isActive("/") ? "bg-blue-700 text-white" : "text-neutral-300"}`} onClick={() => setMenuOpen(false)}>
                  <span className="material-icons mr-3">dashboard</span>
                  Dashboard
                </a>
              </Link>
              
              <Link href="/audit-queue">
                <a className={`flex items-center px-4 py-3 mt-1 rounded-lg ${isActive("/audit-queue") ? "bg-blue-700 text-white" : "text-neutral-300"}`} onClick={() => setMenuOpen(false)}>
                  <span className="material-icons mr-3">list_alt</span>
                  Audit Queue
                </a>
              </Link>
              
              <Link href="/analytics">
                <a className={`flex items-center px-4 py-3 mt-1 rounded-lg ${isActive("/analytics") ? "bg-blue-700 text-white" : "text-neutral-300"}`} onClick={() => setMenuOpen(false)}>
                  <span className="material-icons mr-3">insights</span>
                  Analytics
                </a>
              </Link>
              
              <div className="text-neutral-400 text-xs uppercase font-semibold px-2 py-2 mt-4">
                Management
              </div>
              
              <Link href="/audit-history">
                <a className={`flex items-center px-4 py-3 mt-1 rounded-lg ${isActive("/audit-history") ? "bg-blue-700 text-white" : "text-neutral-300"}`} onClick={() => setMenuOpen(false)}>
                  <span className="material-icons mr-3">history</span>
                  Audit History
                </a>
              </Link>
              
              <Link href="/account">
                <a className={`flex items-center px-4 py-3 mt-1 rounded-lg ${isActive("/account") ? "bg-blue-700 text-white" : "text-neutral-300"}`} onClick={() => setMenuOpen(false)}>
                  <span className="material-icons mr-3">person</span>
                  Account
                </a>
              </Link>
              
              <Link href="/settings">
                <a className={`flex items-center px-4 py-3 mt-1 rounded-lg ${isActive("/settings") ? "bg-blue-700 text-white" : "text-neutral-300"}`} onClick={() => setMenuOpen(false)}>
                  <span className="material-icons mr-3">settings</span>
                  Settings
                </a>
              </Link>
            </div>
            
            <div className="bg-neutral-800 p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white mr-3">
                  {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="text-sm">
                  <p className="text-white font-medium">{user?.fullName || 'User'}</p>
                  <p className="text-neutral-400">{user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'Role'}</p>
                </div>
                <div className="ml-auto">
                  <button 
                    className="p-1 text-neutral-400 hover:text-white"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                  >
                    <span className="material-icons text-xl">logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
