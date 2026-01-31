import React from 'react';
import { WifiOff, LogOut, User as UserIcon, ShieldAlert, ArrowRight, LayoutGrid, CheckSquare, LogOut as LogOutIcon, SlidersHorizontal, Code } from 'lucide-react';
import { User, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  activeScreen: string;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  activeScreen,
  onNavigate,
  onLogout
}) => {

  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutGrid },
    { id: 'CHECK_IN', label: 'Check In', icon: CheckSquare },
    { id: 'CHECK_OUT', label: 'Check Out', icon: LogOutIcon },
  ];

  if (user?.role === UserRole.ADMIN || user?.role === UserRole.DEVELOPER) {
    navItems.push({ id: 'ADMIN', label: 'Admin', icon: SlidersHorizontal });
  }
  if (user?.role === UserRole.DEVELOPER) {
    navItems.push({ id: 'DEVELOPER', label: 'Developer', icon: Code });
  }

  return (
    <div className="min-h-screen w-full flex flex-col text-white font-sans items-center">
      <main className="flex-1 w-full max-w-[700px] pb-[100px]">
        {children}
      </main>

      {/* Navbar Container - Fixed to bottom */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-transparent pointer-events-none">
        <div className="w-full max-w-[700px] bg-[#1C1C1E]/80 backdrop-blur-xl border-t border-[var(--ios-separator)] pointer-events-auto">
            <div className="flex justify-around items-start h-20 pt-2 pb-1">
            {navItems.map(item => (
                <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-start gap-1 w-full h-full transition-colors ios-press ${
                    activeScreen === item.id ? 'text-[var(--ios-blue)]' : 'text-[var(--ios-secondary-label)]'
                }`}
                >
                <item.icon size={24} strokeWidth={activeScreen === item.id ? 2.5 : 2} />
                <span className="text-[10px] font-semibold">{item.label}</span>
                </button>
            ))}
            </div>
            <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </nav>
    </div>
  );
};