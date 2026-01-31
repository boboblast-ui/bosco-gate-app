import React, { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { LoginScreen } from './screens/LoginScreen';
import { Dashboard } from './screens/Dashboard';
import { CheckInScreen } from './screens/CheckInScreen';
import { PassScreen } from './screens/PassScreen';
import { AdminScreen } from './screens/AdminScreen';
import { DeveloperScreen } from './screens/DeveloperScreen';
import { CheckOutScreen } from './screens/CheckOutScreen';
import { dbService, seedUsers } from './services/db';
import { User, UserRole } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userPhoto, setUserPhoto] = useState<string>('');
  const [screen, setScreen] = useState('DASHBOARD');
  const [lastVisitorId, setLastVisitorId] = useState<string>('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLockdown, setIsLockdown] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);

  useEffect(() => {
    const init = async () => {
        // Minimum splash time for branding
        const minSplashTime = new Promise(resolve => setTimeout(resolve, 2500));
        
        try {
            await Promise.all([seedUsers(), dbService.getLockdown().then(setIsLockdown)]);
            await minSplashTime;
        } catch (e) {
            console.error("Initialization failed", e);
        } finally {
            setIsReady(true);
        }
    };
    init();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleToggleLockdown = async () => {
    const newState = !isLockdown;
    setIsLockdown(newState);
    await dbService.setLockdown(newState);
    if (user) {
        await dbService.addLog({
            id: crypto.randomUUID(),
            action: 'LOCKDOWN_TOGGLE',
            timestamp: Date.now(),
            details: `Lockdown set to ${newState}`,
            userId: user.id
        });
    }
  };

  const handleLogin = async (u: User, p: string) => {
    await dbService.setUserSession(u.id, true);
    setUser(u);
    setUserPhoto(p);
    setScreen('DASHBOARD');
  };

  const handleLogout = async () => {
    if (user) await dbService.setUserSession(user.id, false);
    setUser(null);
    setUserPhoto('');
  };

  const handleCheckInSuccess = (visitorId: string) => {
    setLastVisitorId(visitorId);
    setShowPassModal(true);
    setScreen('DASHBOARD');
  };

  const renderScreen = () => {
    const commonProps = { user: user!, onLogout: handleLogout };
    switch (screen) {
      case 'DASHBOARD':
        return <Dashboard {...commonProps} userPhoto={userPhoto} onNavigate={setScreen} />;
      case 'CHECK_IN':
        return <CheckInScreen {...commonProps} onSuccess={handleCheckInSuccess} />;
      case 'CHECK_OUT':
        return <CheckOutScreen {...commonProps} />;
      case 'ADMIN':
        return <AdminScreen {...commonProps} isLockdown={isLockdown} onToggleLockdown={handleToggleLockdown} />;
      case 'DEVELOPER':
        return <DeveloperScreen {...commonProps} />;
      default:
        return <Dashboard {...commonProps} userPhoto={userPhoto} onNavigate={setScreen} />;
    }
  };

  return (
    <>
      {/* Splash Screen Overlay */}
      <div 
        className={`fixed inset-0 flex flex-col items-center justify-center z-[9999] transition-opacity duration-700 ease-out ${isReady ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(5px)' }}
      >
        <img 
            src="https://i.postimg.cc/nM02qfQD/logo.png" 
            alt="BPS" 
            className="w-48 h-48 object-contain animate-pulse drop-shadow-2xl"
        />
      </div>

      {/* Main Content Area - Full width for Kiosk mode */}
      {isReady && (
        <div className="w-full min-h-screen flex flex-col relative animate-ios-push">
            {!user ? (
                <LoginScreen onLogin={handleLogin} />
            ) : (
                <Layout 
                    user={user} 
                    activeScreen={screen}
                    onNavigate={setScreen}
                    onLogout={handleLogout}
                >
                    <div key={screen} className="w-full h-full">
                        {renderScreen()}
                    </div>
                </Layout>
            )}
        </div>
      )}
      
      {showPassModal && (
        <PassScreen 
          visitorId={lastVisitorId} 
          onClose={() => setShowPassModal(false)}
        />
      )}
    </>
  );
}