import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Visitor } from '../types';
import { dbService } from '../services/db';

interface PassScreenProps {
  visitorId: string;
  onClose: () => void;
}

export const PassScreen: React.FC<PassScreenProps> = ({ visitorId, onClose }) => {
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    const fetchVisitor = async () => {
        try {
            const data = await dbService.getVisitor(visitorId);
            setVisitor(data || null);
        } catch (error) {
            console.error("Failed to load visitor", error);
        } finally {
            setLoading(false);
        }
    };
    fetchVisitor();
  }, [visitorId]);

  // Auto-download effect
  useEffect(() => {
    if (!loading && visitor && saveStatus === 'idle') {
        const downloadPass = async () => {
            setSaveStatus('saving');
            // Short delay to ensure DOM is fully rendered
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const element = document.getElementById('gate-pass-card');
            if (element) {
                try {
                    const canvas = await html2canvas(element, {
                        useCORS: true,
                        backgroundColor: null,
                        scale: 2, // Higher quality
                    });
                    
                    const link = document.createElement('a');
                    link.download = `PASS-${visitor.name.replace(/\s+/g, '_')}-${visitor.passId}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    
                    setTimeout(() => setSaveStatus('saved'), 500);
                } catch (err) {
                    console.error("Failed to auto-download pass:", err);
                    setSaveStatus('idle'); // Retry allowed
                }
            }
        };
        downloadPass();
    }
  }, [loading, visitor, saveStatus]);

  if (loading) {
      return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center">
            <Loader2 className="animate-spin text-white" size={48} />
        </div>
      );
  }

  if (!visitor) {
      return (
          <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
              <div className="bg-[var(--ios-secondary-bg)] p-6 rounded-xl text-center">
                  <p className="text-white mb-4">Visitor record not found.</p>
                  <button onClick={onClose} className="text-[var(--ios-blue)] font-bold">Close</button>
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col justify-center items-center p-4 animate-ios-modal backdrop-blur-sm">
        <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div 
                id="gate-pass-card" 
                className="bg-gradient-to-br from-blue-600 to-blue-900 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden border border-white/10"
            >
                {/* Background Texture/Noise could go here */}
                
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Gate Pass</h2>
                        <p className="text-blue-200 text-sm font-medium uppercase tracking-wider">Official Visitor Entry</p>
                    </div>
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner p-2">
                        <img src="https://i.postimg.cc/nM02qfQD/logo.png" alt="BPS" className="w-full h-full object-contain" />
                    </div>
                </div>

                {/* Main Content: Info Left, Photo Right */}
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0 space-y-3 pt-1">
                        <div>
                            <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mb-0.5">Visitor Name</p>
                            <p className="text-2xl font-black uppercase leading-tight break-words">{visitor.name}</p>
                        </div>
                        
                        <div>
                            <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mb-0.5">Type</p>
                            <span className="inline-block bg-white/20 px-2 py-0.5 rounded-md text-sm font-semibold backdrop-blur-md">
                                {visitor.visitorType}
                            </span>
                        </div>
                    </div>

                    {/* Photo: Bigger, Rounded Square (Right Side) */}
                    <div className="shrink-0">
                        {visitor.photoBase64 ? (
                            <img 
                                src={visitor.photoBase64} 
                                alt={visitor.name} 
                                className="w-32 h-32 rounded-3xl object-cover border-4 border-white/20 shadow-2xl bg-black/20" 
                            />
                        ) : (
                            <div className="w-32 h-32 rounded-3xl bg-white/10 border-4 border-white/20 flex items-center justify-center text-4xl font-bold uppercase shadow-2xl">
                                {visitor.name.charAt(0)}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Additional Details Section */}
                <div className="mt-6 space-y-3">
                    {visitor.visitorType === 'Parent' && visitor.studentName && (
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
                            <p className="text-[10px] text-blue-200 uppercase font-bold mb-1">Student</p>
                            <p className="font-semibold uppercase text-sm">{visitor.studentName}</p>
                            <p className="text-xs text-blue-200">Class {visitor.studentClass} - {visitor.studentSection}</p>
                        </div>
                    )}
                    
                    {visitor.hostName && (
                         <div className="bg-black/20 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
                            <p className="text-[10px] text-blue-200 uppercase font-bold mb-1">Meeting With</p>
                            <p className="font-semibold uppercase text-sm">{visitor.hostName}</p>
                         </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-end">
                    <div>
                        <p className="text-[10px] text-blue-300 uppercase font-bold">Pass ID</p>
                        <p className="font-mono text-lg font-bold tracking-widest">{visitor.passId}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-blue-300 uppercase font-bold">Time</p>
                        <p className="font-medium">{new Date(visitor.checkInTime).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</p>
                        <p className="text-[10px] text-blue-300">{new Date(visitor.checkInTime).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
            
            <button onClick={onClose} className="w-full mt-6 bg-[var(--ios-secondary-bg)] text-white text-lg font-semibold py-4 rounded-2xl ios-press shadow-lg border border-[var(--ios-separator)]">
                Close
            </button>
            <p className="text-center text-[var(--ios-secondary-label)] text-xs mt-4 flex items-center justify-center gap-2 transition-all">
                {saveStatus === 'saved' ? (
                    <><CheckCircle2 size={14} className="text-green-500" /> Pass Saved to Device</>
                ) : (
                    <span className="animate-pulse">Saving to Photos...</span>
                )}
            </p>
        </div>
    </div>
  );
};