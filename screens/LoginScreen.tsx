import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shield, ChevronLeft, Code, Building, Delete, UserCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { User, UserRole } from '../types';
import { dbService } from '../services/db';
import { Camera } from '../components/Camera';

interface LoginScreenProps {
  onLogin: (user: User, photo: string) => void;
}

type LoginView = 'USER_SELECTION' | 'PIN_ENTRY' | 'CAMERA_ENTRY';

const BPSLogo = ({ className = "w-32 h-32" }: { className?: string }) => (
    <img 
        src="https://i.postimg.cc/nM02qfQD/logo.png" 
        alt="BPS" 
        className={`${className} mb-8 drop-shadow-2xl object-contain`}
    />
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [view, setView] = useState<LoginView>('USER_SELECTION');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [cameraError, setCameraError] = useState('');

  // Setup Inactivity Timeout for PIN Entry
  useEffect(() => {
    let timeout: any;
    if (view === 'PIN_ENTRY' && pin.length > 0) {
        timeout = setTimeout(() => {
            setPin('');
            setError('Session Timeout');
        }, 30000); // 30 seconds auto-clear
    }
    return () => clearTimeout(timeout);
  }, [pin, view]);

  useEffect(() => {
    const fetchUsers = async () => {
        const allUsers = await dbService.getUsers();
        setUsers(allUsers);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (pin.length === 4 && selectedUser) {
      verifyPin();
    }
  }, [pin]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setView('PIN_ENTRY');
    setError('');
    setPin('');
    setLoginName('');
  };

  const handleNumpadInput = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      if (typeof navigator.vibrate === 'function') navigator.vibrate(5);
    }
  };

  const handleNumpadDelete = () => {
    setPin(prev => prev.slice(0, -1));
    if (typeof navigator.vibrate === 'function') navigator.vibrate(5);
  };

  const verifyPin = async () => {
    if (isProcessing || !selectedUser) return;
    setIsProcessing(true);
    setError('');
    
    await new Promise(r => setTimeout(r, 250));

    if (selectedUser.pin === pin) {
        setView('CAMERA_ENTRY');
        setCameraError('');
    } else {
        setError('Incorrect Passcode');
        setPin('');
        if (typeof navigator.vibrate === 'function') navigator.vibrate([50, 50, 50]);
    }
    
    setIsProcessing(false);
  };

  const handlePhotoCapture = (photoBase64: string) => {
    if (!loginName.trim()) {
        setCameraError('Name is required to log in');
        if (typeof navigator.vibrate === 'function') navigator.vibrate([50, 50, 50]);
        return;
    }

    if (selectedUser) {
        const finalName = loginName.trim().toUpperCase();
        const finalUser = { ...selectedUser, name: finalName };
        onLogin(finalUser, photoBase64);
    }
  };
  
  const getRoleIcon = (role: UserRole) => {
      switch(role) {
          case UserRole.GUARD: return { icon: Shield, color: 'text-green-400', label: 'Security' };
          case UserRole.ADMIN: return { icon: Building, color: 'text-blue-400', label: 'Admin' };
          case UserRole.DEVELOPER: return { icon: Code, color: 'text-purple-400', label: 'Dev' };
          default: return { icon: UserCircle2, color: 'text-gray-400', label: 'User' };
      }
  };

  if (view === 'USER_SELECTION') {
    return (
      <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-900 to-black select-none overflow-y-auto">
        <div className="flex flex-col items-center mb-12">
            <BPSLogo className="w-40 h-40" />
            <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-md">Welcome Back</h1>
            <p className="text-white/50 mt-2 text-sm font-bold uppercase tracking-[0.2em]">Select Access Profile</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-7xl">
            {users.length === 0 ? (
                 <div className="col-span-full p-8 text-center text-white/60 animate-pulse">Initializing System Users...</div>
            ) : (
                users.map((user) => {
                    const { icon: Icon, color, label } = getRoleIcon(user.role);
                    return (
                        <button 
                            key={user.id} 
                            onClick={() => handleUserSelect(user)} 
                            className="group relative overflow-hidden glass-panel rounded-[2rem] p-8 text-left transition-all duration-300 hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/20"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors border border-white/5`}>
                                    <Icon className={color} size={32} />
                                </div>
                                <div className={`px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-wider ${color}`}>
                                    {label}
                                </div>
                            </div>
                            
                            <div>
                                <p className="text-2xl text-white font-bold uppercase tracking-wide group-hover:translate-x-1 transition-transform">{user.name}</p>
                                <p className="text-sm text-white/40 font-medium mt-1">{user.role}</p>
                            </div>
                        </button>
                    );
                })
            )}
        </div>
      </div>
    );
  }

  if (view === 'CAMERA_ENTRY') {
      return createPortal(
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-ios-push">
             <div className="w-full max-w-[360px] glass-panel rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10">
                 <div className="relative aspect-square bg-black">
                    <Camera 
                        onCapture={handlePhotoCapture} 
                        onClose={() => {
                            setView('PIN_ENTRY');
                            setPin('');
                        }} 
                        facingMode="user"
                    />
                 </div>
                 <div className="p-6 flex flex-col gap-4">
                    <div className="relative">
                        <input 
                            type="text"
                            placeholder="VERIFY YOUR NAME"
                            value={loginName}
                            onChange={(e) => {
                                setLoginName(e.target.value.toUpperCase());
                                if (e.target.value) setCameraError('');
                            }}
                            className={`w-full bg-white/5 text-white text-center py-4 rounded-2xl font-bold text-lg uppercase placeholder:text-white/20 focus:outline-none focus:ring-2 transition-all ${cameraError ? 'ring-2 ring-red-500/50 bg-red-500/10' : 'focus:ring-[var(--ios-blue)] focus:bg-white/10'}`}
                            autoFocus
                        />
                        {cameraError && (
                            <div className="absolute top-full left-0 right-0 mt-2 flex items-center justify-center gap-1 text-[var(--ios-red)] text-xs font-bold tracking-wide animate-bounce">
                                <AlertCircle size={14} />
                                <span>{cameraError}</span>
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => { setView('PIN_ENTRY'); setPin(''); }} 
                        className="text-white/40 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors py-2"
                    >
                        Cancel Verification
                    </button>
                 </div>
             </div>
          </div>,
          document.body
      );
  }

  const { icon: RoleIcon, color: roleColor } = selectedUser ? getRoleIcon(selectedUser.role) : { icon: UserCircle2, color: 'text-white' };

  return (
      <div className="fixed inset-0 w-full h-full flex flex-col md:flex-row bg-black overflow-hidden select-none">
          
          {/* INFO PANE - Portrait: Top 40% (approx), Landscape: Left 50% */}
          <div className="h-[38vh] md:h-auto md:flex-1 flex flex-col items-center justify-center p-8 md:items-start md:pl-24 lg:pl-32 relative">
              <button 
                onClick={() => { setView('USER_SELECTION'); setSelectedUser(null); }} 
                className="absolute top-8 left-8 md:top-12 md:left-12 flex items-center gap-2 text-white/40 hover:text-white transition-colors group z-50"
              >
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <ArrowLeft size={20} />
                  </div>
                  <span className="hidden md:inline font-medium text-sm">Switch Account</span>
              </button>

              <div className="text-center md:text-left mt-8 md:mt-0 animate-ios-push">
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/5 border border-white/10 mb-6 ${roleColor}`}>
                      {selectedUser && <RoleIcon size={40} />}
                  </div>
                  <h1 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-tight mb-2">
                      {selectedUser?.name}
                  </h1>
                  <p className="text-white/50 text-sm md:text-base font-medium uppercase tracking-[0.2em] mb-8">
                      Enter Security PIN
                  </p>
                  
                  {/* PIN Dots */}
                  <div className="flex items-center justify-center md:justify-start gap-6 h-8">
                      {[0, 1, 2, 3].map(i => (
                          <div 
                            key={i} 
                            className={`transition-all duration-300 rounded-full ${
                                pin.length > i 
                                    ? `w-4 h-4 bg-[var(--ios-blue)] shadow-[0_0_15px_rgba(10,132,255,0.6)]` 
                                    : 'w-3 h-3 bg-white/10'
                            }`} 
                          />
                      ))}
                  </div>

                  <div className={`mt-6 h-6 transition-all duration-300 ${error ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                      <span className="flex items-center gap-2 text-[var(--ios-red)] font-bold text-sm bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
                          <AlertCircle size={16} /> {error}
                      </span>
                  </div>
              </div>
          </div>

          {/* KEYPAD PANE - Portrait: Bottom 60% (starts at 40% line), Landscape: Right 50% */}
          <div className="flex-1 md:flex-1 flex flex-col items-center justify-start pt-8 md:pt-0 md:justify-center md:items-end p-8 pb-16 md:pr-24 lg:pr-32">
              <div className="w-full max-w-[340px]">
                  <div className="grid grid-cols-3 gap-x-6 gap-y-6 md:gap-x-8 md:gap-y-8">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((num, i) => {
                          if (num === null) return <div key={i} />;
                          const isDel = num === 'del';
                          return (
                              <div key={i} className="flex justify-center items-center">
                                 <button 
                                      onClick={() => isDel ? handleNumpadDelete() : handleNumpadInput(num.toString())}
                                      className={`
                                        w-20 h-20 md:w-[84px] md:h-[84px] rounded-full flex items-center justify-center text-3xl font-normal transition-all duration-200 active:scale-90
                                        ${isDel 
                                            ? 'text-white/40 hover:text-white hover:bg-white/5' 
                                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/5 shadow-lg backdrop-blur-md'
                                        }
                                      `}
                                  >
                                      {isDel ? <Delete size={32} strokeWidth={1.5} /> : num}
                                  </button>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>

      </div>
  );
};