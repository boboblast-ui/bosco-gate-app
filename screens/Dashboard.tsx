import React, { useEffect, useState, useRef } from 'react';
import { LogOut, Power, X, Calendar, Clock, ArrowRight, Download, FileSpreadsheet, Plus, Archive, Loader2 } from 'lucide-react';
import { User, Visitor } from '../types';
import { dbService } from '../services/db';
import Papa from 'papaparse';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  userPhoto?: string;
  onNavigate: (screen: string) => void;
}

const StatCard: React.FC<{ label: string, value: string | number, onClick?: () => void, icon?: React.ReactNode }> = ({ label, value, onClick, icon }) => (
    <button 
        onClick={onClick}
        disabled={!onClick}
        className="glass-panel p-4 rounded-xl text-left w-full relative overflow-hidden ios-press transition-colors hover:bg-white/10"
    >
        <div className="flex justify-between items-start">
            <p className="text-sm text-white/60 font-medium">{label}</p>
            {icon && <div className="text-[var(--ios-blue)] opacity-90">{icon}</div>}
        </div>
        <p className="text-3xl font-bold text-white mt-2 drop-shadow-sm">{value}</p>
        {onClick && (
            <div className="absolute bottom-4 right-4 opacity-50">
                <ArrowRight size={16} />
            </div>
        )}
    </button>
);

// Hidden component for rendering batch passes
const HiddenPassRenderer: React.FC<{ visitor: Visitor, id: string }> = ({ visitor, id }) => (
    <div 
        id={id}
        style={{ width: '320px', height: 'auto', position: 'absolute', left: '-9999px', top: 0 }}
        className="bg-gradient-to-br from-blue-600 to-blue-900 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden border border-white/10"
    >
        <div className="flex justify-between items-start mb-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Gate Pass</h2>
                <p className="text-blue-200 text-sm font-medium uppercase tracking-wider">Official Entry</p>
            </div>
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center p-2">
                <img src="https://i.postimg.cc/nM02qfQD/logo.png" alt="BPS" className="w-full h-full object-contain" />
            </div>
        </div>
        <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0 space-y-3 pt-1">
                <div>
                    <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mb-0.5">Name</p>
                    <p className="text-2xl font-black uppercase leading-tight break-words">{visitor.name}</p>
                </div>
                <div>
                    <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mb-0.5">Type</p>
                    <span className="inline-block bg-white/20 px-2 py-0.5 rounded-md text-sm font-semibold">{visitor.visitorType}</span>
                </div>
            </div>
            <div className="shrink-0">
                {visitor.photoBase64 ? (
                    <img src={visitor.photoBase64} className="w-32 h-32 rounded-3xl object-cover border-4 border-white/20 bg-black/20" />
                ) : (
                    <div className="w-32 h-32 rounded-3xl bg-white/10 border-4 border-white/20 flex items-center justify-center text-4xl font-bold uppercase">{visitor.name.charAt(0)}</div>
                )}
            </div>
        </div>
        <div className="mt-6 space-y-3">
             {visitor.hostName && (
                 <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-blue-200 uppercase font-bold mb-1">Meeting With</p>
                    <p className="font-semibold uppercase text-sm">{visitor.hostName}</p>
                 </div>
            )}
        </div>
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-end">
            <div>
                <p className="text-[10px] text-blue-300 uppercase font-bold">Pass ID</p>
                <p className="font-mono text-lg font-bold tracking-widest">{visitor.passId}</p>
            </div>
            <div className="text-right">
                <p className="font-medium">{new Date(visitor.checkInTime).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</p>
                <p className="text-[10px] text-blue-300">{new Date(visitor.checkInTime).toLocaleDateString()}</p>
            </div>
        </div>
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, userPhoto, onNavigate }) => {
  const [stats, setStats] = useState({ today: 0, active: 0 });
  const [showHistory, setShowHistory] = useState(false);
  const [todayVisitors, setTodayVisitors] = useState<Visitor[]>([]);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  
  const batchContainerRef = useRef<HTMLDivElement>(null);

  const loadStats = async () => {
    const activeVisitors = await dbService.getActiveVisitors();
    const allVisitors = await dbService.getAllVisitors();
    
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    
    const todayRecs = allVisitors.filter(v => v.checkInTime >= todayStart.getTime());
    
    setStats({
        today: todayRecs.length,
        active: activeVisitors.length
    });
    
    setTodayVisitors(todayRecs.sort((a,b) => b.checkInTime - a.checkInTime));
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleExportCSV = () => {
    if (todayVisitors.length === 0) {
        alert("No data to export for today.");
        return;
    }
    const csvData = todayVisitors.map(v => ({
        PassID: v.passId,
        Name: v.name,
        Mobile: v.mobile,
        Type: v.visitorType,
        Host: v.hostName,
        Student: v.studentName || 'N/A',
        Class: v.studentClass || 'N/A',
        Section: v.studentSection || 'N/A',
        InTime: new Date(v.checkInTime).toLocaleString(),
        OutTime: v.checkOutTime ? new Date(v.checkOutTime).toLocaleString() : 'Active',
        Status: v.status
    }));
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Visitor_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleDownloadZip = async () => {
      if (todayVisitors.length === 0) {
          alert("No passes to download today.");
          return;
      }
      setIsZipping(true);
      setZipProgress(0);

      try {
          const zip = new JSZip();
          const dateStr = new Date().toISOString().split('T')[0];
          const folder = zip.folder(`BPS_Passes_${dateStr}`);
          
          if (!folder) return;

          const csvData = todayVisitors.map(v => ({
              PassID: v.passId,
              Name: v.name,
              Type: v.visitorType,
              Host: v.hostName,
              Time: new Date(v.checkInTime).toLocaleString()
          }));
          folder.file(`Daily_Report_${dateStr}.csv`, Papa.unparse(csvData));

          const total = todayVisitors.length;
          
          for (let i = 0; i < total; i++) {
              const visitor = todayVisitors[i];
              const elementId = `batch-pass-${visitor.id}`;
              const element = document.getElementById(elementId);
              
              if (element) {
                  try {
                      const canvas = await html2canvas(element, {
                          scale: 1, 
                          backgroundColor: null,
                          logging: false
                      });
                      
                      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                      if (blob) {
                          folder.file(`${visitor.passId}_${visitor.name.replace(/\s+/g, '_')}.png`, blob);
                      }
                  } catch (e) {
                      console.error(`Failed to render pass for ${visitor.name}`, e);
                  }
              }
              setZipProgress(Math.round(((i + 1) / total) * 100));
              await new Promise(r => setTimeout(r, 50));
          }

          const content = await zip.generateAsync({ type: "blob" });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(content);
          link.download = `Passes_Bundle_${dateStr}.zip`;
          link.click();

      } catch (err) {
          console.error("Zip generation failed", err);
          alert("Failed to create zip file.");
      } finally {
          setIsZipping(false);
          setZipProgress(0);
      }
  };

  return (
    <div className="p-4 space-y-6 pb-32">
      {/* Header with Sign Out aligned right */}
      <div className="flex items-center justify-between mt-2">
         <div className="flex items-center gap-4">
            {userPhoto ? (
                <img src={userPhoto} alt="Profile" className="w-14 h-14 rounded-full object-cover border-2 border-[var(--ios-blue)] shadow-md" />
            ) : (
                <div className="w-14 h-14 rounded-full bg-black/40 border-2 border-white/20 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-xl font-bold text-white uppercase">{user.name.charAt(0)}</span>
                </div>
            )}
            <div>
                <h1 className="text-xl font-bold text-white drop-shadow-md">Dashboard</h1>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wide">{user.role}</p>
            </div>
         </div>
         
         <button onClick={onLogout} className="flex flex-col items-center justify-center text-[var(--ios-red)] opacity-90 hover:opacity-100 ios-press">
            <div className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center mb-1 border border-white/5">
                 <LogOut size={18} />
            </div>
            <span className="text-[10px] font-bold drop-shadow-sm">Sign Out</span>
         </button>
      </div>

      {/* Primary Action: Blue Check In Button */}
      <button 
        onClick={() => onNavigate('CHECK_IN')}
        className="w-full bg-[var(--ios-blue)] text-white py-5 rounded-2xl flex items-center justify-center gap-3 ios-press shadow-xl shadow-blue-900/30 mb-2 backdrop-blur-sm"
      >
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Plus size={24} strokeWidth={3} />
          </div>
          <span className="text-2xl font-bold tracking-tight">New Visitor Check In</span>
      </button>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard 
            label="Today's Entries" 
            value={stats.today} 
            onClick={() => { loadStats(); setShowHistory(true); }}
            icon={<Calendar size={20}/>}
        />
        <StatCard 
            label="Active On-Site" 
            value={stats.active} 
            onClick={() => onNavigate('CHECK_OUT')}
            icon={<Clock size={20}/>}
        />
      </div>

      {/* Data Tools Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white ml-1 drop-shadow-sm">Data & Reports</h2>
        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={handleExportCSV}
                className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-2 ios-press hover:bg-white/10"
            >
                <div className="w-10 h-10 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <FileSpreadsheet size={20} />
                </div>
                <span className="text-sm font-semibold text-white">Export Excel</span>
            </button>
            
            <button 
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-2 ios-press hover:bg-white/10 relative"
            >
                {isZipping ? (
                     <div className="flex flex-col items-center">
                        <Loader2 size={24} className="animate-spin text-[var(--ios-blue)] mb-1" />
                        <span className="text-xs text-[var(--ios-blue)] font-mono">{zipProgress}%</span>
                     </div>
                ) : (
                    <>
                        <div className="w-10 h-10 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Archive size={20} />
                        </div>
                        <span className="text-sm font-semibold text-white">Download Passes</span>
                    </>
                )}
            </button>
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-white ml-1 drop-shadow-sm">System Status</h2>
        <div className="glass-panel rounded-xl p-4 flex items-center justify-between">
            <div>
                <p className="text-white font-semibold">Network</p>
                <p className="text-sm text-green-400">Online & Synced</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
        </div>
      </div>

      <div ref={batchContainerRef} className="fixed top-0 left-0 pointer-events-none opacity-0 z-[-1]">
          {isZipping && todayVisitors.map(v => (
              <HiddenPassRenderer key={v.id} visitor={v} id={`batch-pass-${v.id}`} />
          ))}
      </div>

      {/* Today's History Modal */}
      {showHistory && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl animate-ios-modal flex flex-col">
             <div className="flex items-center justify-between p-4 pt-12 border-b border-white/10 bg-black/20">
                 <div>
                     <h2 className="text-2xl font-bold text-white">Today's History</h2>
                     <p className="text-sm text-white/60">{new Date().toLocaleDateString()}</p>
                 </div>
                 <button onClick={() => setShowHistory(false)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white ios-press">
                     <X size={20}/>
                 </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 {todayVisitors.length === 0 ? (
                     <div className="text-center py-20 text-white/50">
                         No entries found for today.
                     </div>
                 ) : (
                     todayVisitors.map((v, i) => (
                         <div key={v.id} className="glass-panel p-3 rounded-xl flex items-center gap-4">
                             <div className="shrink-0">
                                 {v.photoBase64 ? (
                                    <img src={v.photoBase64} className="w-12 h-12 rounded-full object-cover border border-white/20"/>
                                 ) : (
                                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-bold uppercase border border-white/20">{v.name.charAt(0)}</div>
                                 )}
                             </div>
                             <div className="flex-1 min-w-0">
                                 <p className="font-semibold text-white uppercase truncate">{v.name}</p>
                                 <div className="flex items-center gap-2 text-xs text-white/60">
                                     <span>{v.passId}</span>
                                     <span>•</span>
                                     <span>In: {new Date(v.checkInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                 </div>
                             </div>
                             <div className="text-right">
                                 <span className={`text-xs font-bold px-2 py-1 rounded-md ${v.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                     {v.status === 'ACTIVE' ? 'ON SITE' : 'OUT'}
                                 </span>
                             </div>
                         </div>
                     ))
                 )}
             </div>
          </div>
      )}
    </div>
  );
};