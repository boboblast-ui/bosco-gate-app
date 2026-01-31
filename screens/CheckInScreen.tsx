import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User as UserIcon, BookUser, Phone, UserCheck, GraduationCap, Smartphone, Wifi, Loader2, CheckCircle2, QrCode, AlertCircle, RefreshCcw } from 'lucide-react';
import { dbService } from '../services/db';
import { User as AppUser, VisitorType } from '../types';
import { Camera } from '../components/Camera';
import { toDataURL } from 'qrcode';

interface CheckInScreenProps {
  user: AppUser;
  onSuccess: (visitorId: string) => void;
  onLogout: () => void;
}

interface OtpSession {
  code: string;
  sessionId: string;
  expiry: number;
}

const VISITOR_TYPES: VisitorType[] = ['Parent', 'Vendor', 'Guest', 'Official', 'Other'];
const CLASS_OPTIONS = ["Nursery", "KG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const PARENT_HOST_OPTIONS = ["Front Desk", "Admin Office", "Accounts Dept", "Admissions", "Class Teacher", "Specific Teacher"];
const OTHER_HOST_OPTIONS = ["Admin Office", "Accounts Dept", "Admissions", "Others"];

export const CheckInScreen: React.FC<CheckInScreenProps> = ({ user, onSuccess }) => {
  const [formData, setFormData] = useState({ 
      name: '', 
      mobile: '', 
      visitorType: 'Parent' as VisitorType,
      studentName: '',
      studentClass: '',
      studentSection: '',
      hostName: '',
      specificTeacherName: '',
      purpose: 'Meeting',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  // OTP States
  const [otp, setOtp] = useState('');
  const [otpSession, setOtpSession] = useState<OtpSession | null>(null);
  const [otpStatus, setOtpStatus] = useState<'IDLE' | 'SENDING' | 'SENT' | 'VERIFIED'>('VERIFIED');
  const [showQr, setShowQr] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    // Parents bypass OTP, others require it
    if (formData.visitorType === 'Parent') {
        setOtpStatus('VERIFIED');
    } else {
        setOtpStatus('IDLE');
        setOtp('');
        setOtpSession(null);
        setShowQr(false);
    }
  }, [formData.visitorType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Strict digit enforcement for mobile
    if (name === 'mobile') {
        // Remove any non-digit character
        const numericValue = value.replace(/[^0-9]/g, '');
        // Limit to 10 digits
        const truncated = numericValue.slice(0, 10);
        setFormData(prev => ({ ...prev, [name]: truncated }));
        return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleTypeChange = (type: VisitorType) => {
    setFormData(prev => ({ 
        ...prev, 
        visitorType: type,
        hostName: '',
        specificTeacherName: ''
    }));
  };

  const generateRandomOtp = () => {
      // Ensure strictly 4 digits (1000-9999)
      return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const createOtpSession = () => {
      const code = generateRandomOtp();
      const session: OtpSession = {
          code,
          sessionId: crypto.randomUUID(),
          expiry: Date.now() + 2 * 60 * 1000 // Reduced to 2 minutes for security
      };
      setOtpSession(session);
      return session;
  };

  const handleSendOtp = async () => {
    if (formData.mobile.length < 10) {
        alert("Please enter a valid mobile number first.");
        return;
    }
    
    const session = createOtpSession();
    
    setOtpStatus('SENDING');
    // Simulate network API call
    await new Promise(r => setTimeout(r, 2000));
    setOtpStatus('SENT');
    
    const isOffline = !navigator.onLine;
    const msg = isOffline ? `Offline Mode: OTP ${session.code} generated locally.` : `OTP sent to ${formData.mobile}`;
    alert(msg);
  };

  const handleGenerateQr = async () => {
      // Always create new session for security (rotation) on every QR generation
      const session = createOtpSession();

      // Developer Hint since we can't really send it to a phone in this demo
      console.log("%c[DEV HINT] Generated Secure OTP:", "color: #0A84FF; font-weight: bold", session.code);

      // Encode a secure URL with the session ID, NOT the OTP
      const secureUrl = `https://boscogate-pass.web.app/auth/verify?session_token=${session.sessionId}`;

      try {
          const url = await toDataURL(secureUrl, { 
              color: { dark: '#000000', light: '#ffffff' },
              width: 240,
              margin: 2,
              errorCorrectionLevel: 'M'
          });
          setQrUrl(url);
          setShowQr(true);
      } catch (err) {
          console.error("QR Generation failed", err);
      }
  };

  const handleVerifyOtp = () => {
    if (!otpSession) {
        alert("No OTP session active. Please resend or scan QR.");
        return;
    }

    if (Date.now() > otpSession.expiry) {
        alert("OTP has expired. Please regenerate.");
        setOtpSession(null);
        setShowQr(false);
        return;
    }

    if (otp === otpSession.code) {
        setOtpStatus('VERIFIED');
        setShowQr(false);
    } else {
        alert("Invalid OTP. Please check the code.");
    }
  };

  const handleSubmit = async (photoBase64: string) => {
    setIsSubmitting(true);
    try {
        const id = crypto.randomUUID();
        let finalHostName = formData.hostName;
        if (formData.hostName === 'Specific Teacher' && formData.specificTeacherName) {
            finalHostName = `Teacher: ${formData.specificTeacherName}`;
        }

        const visitor = {
            id, passId: `BPS-${Math.floor(10000 + Math.random() * 89999)}`,
            name: formData.name,
            mobile: formData.mobile,
            visitorType: formData.visitorType,
            purpose: formData.purpose,
            hostName: finalHostName,
            studentName: formData.visitorType === 'Parent' ? formData.studentName : undefined,
            studentClass: formData.visitorType === 'Parent' ? formData.studentClass : undefined,
            studentSection: formData.visitorType === 'Parent' ? formData.studentSection : undefined,
            checkInTime: Date.now(), 
            photoBase64, 
            synced: false, 
            status: 'ACTIVE' as const
        };
        await dbService.addVisitor(visitor);
        onSuccess(id);
    } catch (e) { 
        console.error("Failed to add visitor:", e);
    } finally {
        setIsSubmitting(false);
        setShowCamera(false);
    }
  };

  // Check for dummy numbers (repeated digits or sequences)
  const isDummyNumber = (mobile: string) => {
    if (mobile.length !== 10) return false;
    
    // Check for all same digits (e.g. 1111111111)
    if (/^(\d)\1+$/.test(mobile)) return true;
    
    // Check for common sequences
    const sequences = ['1234567890', '0123456789', '9876543210'];
    if (sequences.includes(mobile)) return true;

    return false;
  };

  const isInvalid = isDummyNumber(formData.mobile);
  let canProceed = formData.name && formData.mobile.length === 10 && !isInvalid;
  
  // OTP Check
  canProceed = canProceed && otpStatus === 'VERIFIED';

  if (formData.visitorType === 'Parent') {
    canProceed = canProceed && !!formData.studentName && !!formData.studentClass && !!formData.studentSection && !!formData.hostName;
    if (formData.hostName === 'Specific Teacher') {
        canProceed = canProceed && !!formData.specificTeacherName;
    }
  } else {
    canProceed = canProceed && !!formData.hostName;
  }
  
  const currentHostOptions = formData.visitorType === 'Parent' ? PARENT_HOST_OPTIONS : OTHER_HOST_OPTIONS;

  if (showCamera) {
    return createPortal(
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-ios-modal">
            <div className="w-full max-w-[320px] glass-panel rounded-3xl overflow-hidden shadow-2xl">
                 <div className="relative aspect-square bg-black">
                     <Camera 
                        onCapture={handleSubmit} 
                        onClose={() => setShowCamera(false)} 
                        facingMode="user"
                    />
                 </div>
                 <div className="p-5 flex flex-col gap-3">
                    <div className="text-center">
                        <h3 className="text-white font-semibold text-lg">Visitor Photo</h3>
                        <p className="text-white/60 text-sm">Position face within the frame</p>
                    </div>
                    <button 
                        onClick={() => setShowCamera(false)}
                        disabled={isSubmitting}
                        className="w-full bg-white/10 text-white py-3 rounded-xl font-semibold ios-press backdrop-blur-sm"
                    >
                        {isSubmitting ? 'Processing...' : 'Cancel'}
                    </button>
                 </div>
            </div>
        </div>,
        document.body
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white drop-shadow-md">Check In</h1>
        <button onClick={() => setShowCamera(true)} disabled={!canProceed} className="text-lg font-semibold text-[var(--ios-blue)] disabled:text-white/30 ios-press transition-colors drop-shadow-sm">
          Next
        </button>
      </div>

      <div className="space-y-6">
        {/* Visitor Type */}
        <div className="glass-panel p-1 rounded-lg flex items-center overflow-x-auto no-scrollbar">
            {VISITOR_TYPES.map(type => (
                <button 
                    key={type} 
                    onClick={() => handleTypeChange(type)}
                    className={`flex-1 min-w-[80px] text-center py-2 text-sm font-semibold rounded-md transition-all whitespace-nowrap px-2 ${
                        formData.visitorType === type ? 'bg-white/10 text-white shadow backdrop-blur-sm' : 'text-white/50'
                    }`}
                >
                    {type}
                </button>
            ))}
        </div>

        {/* Visitor Details */}
        <div className="glass-panel rounded-xl">
            <div className="flex items-center p-3">
                <UserIcon size={20} className="text-white/50" />
                <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleInputChange} className="bg-transparent w-full ml-3 text-white placeholder:text-white/30 focus:outline-none uppercase"/>
            </div>
            <div className="h-[1px] bg-white/10 ml-12" />
            <div className="relative flex items-center p-3">
                <Phone size={20} className={`transition-colors ${isInvalid ? 'text-[var(--ios-red)]' : 'text-white/50'}`} />
                <input 
                    type="tel" 
                    name="mobile" 
                    placeholder="Mobile Number" 
                    value={formData.mobile} 
                    onChange={handleInputChange} 
                    className={`bg-transparent w-full ml-3 text-white placeholder:text-white/30 focus:outline-none ${isInvalid ? 'text-[var(--ios-red)]' : ''}`}
                    maxLength={10}
                    inputMode="numeric"
                />
                {isInvalid && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[var(--ios-red)] text-xs font-bold animate-pulse">
                        <AlertCircle size={14} />
                        <span>INVALID</span>
                    </div>
                )}
            </div>
        </div>

        {/* OTP Section for Non-Parents */}
        {formData.visitorType !== 'Parent' && (
             <div className="glass-panel rounded-xl p-3 animate-ios-push">
                 <div className="flex justify-between items-center mb-3">
                     <div className="flex items-center gap-2">
                         <Smartphone size={20} className="text-white/50" />
                         <span className="text-white/80 text-sm font-medium">Mobile Verification</span>
                     </div>
                     {!navigator.onLine && <Wifi size={14} className="text-yellow-500/50" />}
                 </div>
                 
                 {otpStatus === 'VERIFIED' ? (
                     <div className="w-full bg-green-500/20 text-green-400 py-3 rounded-xl flex items-center justify-center gap-2 font-bold border border-green-500/30">
                         <CheckCircle2 size={18} /> Verified
                     </div>
                 ) : (
                     <div className="space-y-3">
                        {otpStatus === 'IDLE' || otpStatus === 'SENDING' ? (
                             <button 
                                onClick={handleSendOtp} 
                                disabled={otpStatus === 'SENDING' || formData.mobile.length < 10 || isInvalid}
                                className="w-full bg-[var(--ios-blue)] text-white py-3 rounded-xl font-bold flex items-center justify-center disabled:opacity-50 ios-press"
                             >
                                 {otpStatus === 'SENDING' ? <Loader2 size={18} className="animate-spin" /> : 'Send OTP'}
                             </button>
                        ) : (
                             <div className="flex flex-col gap-3">
                                 <div className="flex gap-2 w-full">
                                     <input 
                                         type="number" 
                                         placeholder="Enter OTP" 
                                         value={otp} 
                                         onChange={(e) => setOtp(e.target.value)} 
                                         className="flex-1 bg-black/20 text-white text-center rounded-xl font-mono text-lg focus:outline-none border border-white/10"
                                         maxLength={4}
                                     />
                                     <button onClick={handleVerifyOtp} className="px-6 bg-white/10 text-white font-bold rounded-xl ios-press">
                                         Verify
                                     </button>
                                 </div>
                                 
                                 {/* Fallback QR Option */}
                                 <div className="flex justify-center">
                                    <button 
                                        onClick={() => showQr ? setShowQr(false) : handleGenerateQr()} 
                                        className="text-[10px] text-white/50 flex items-center gap-1 hover:text-white/80 transition-colors"
                                    >
                                        <QrCode size={12} />
                                        {showQr ? 'Hide QR Code' : "Didn't receive OTP? Show QR"}
                                    </button>
                                 </div>

                                 {/* QR Code Display */}
                                 {showQr && qrUrl && (
                                     <div className="bg-white p-4 rounded-xl mx-auto animate-ios-push flex flex-col items-center relative">
                                         <img src={qrUrl} alt="Secure QR" className="w-40 h-40 mix-blend-multiply" />
                                         <div className="mt-3 text-center">
                                             <p className="text-black font-bold text-sm uppercase tracking-wider">Scan with Camera</p>
                                             <p className="text-black/50 text-[10px] mt-1 max-w-[180px] leading-tight">
                                                Secure link will open on your device to reveal One-Time Password.
                                             </p>
                                         </div>
                                         
                                         {/* Refresh Button */}
                                         <button 
                                            onClick={handleGenerateQr}
                                            className="absolute top-2 right-2 p-2 text-gray-400 hover:text-[var(--ios-blue)] transition-colors active:scale-90"
                                            title="Regenerate Code"
                                         >
                                            <RefreshCcw size={16} /> 
                                         </button>
                                     </div>
                                 )}
                             </div>
                        )}
                     </div>
                 )}
                 <p className="text-[10px] text-white/40 text-center mt-2">
                     {otpStatus === 'SENT' ? 'Enter the code sent to visitor mobile.' : 'Verification required for guest entry.'}
                 </p>
             </div>
        )}
        
        {/* Conditional Fields: Student Info */}
        {formData.visitorType === 'Parent' && (
            <div className="glass-panel rounded-xl">
                <div className="flex items-center p-3">
                    <BookUser size={20} className="text-white/50" />
                    <input type="text" name="studentName" placeholder="Student Name" value={formData.studentName} onChange={handleInputChange} className="bg-transparent w-full ml-3 text-white placeholder:text-white/30 focus:outline-none uppercase"/>
                </div>
                <div className="h-[1px] bg-white/10 ml-12" />
                
                <div className="flex p-2">
                     <div className="flex-1 flex flex-col items-center justify-center border-r border-white/10 py-1">
                         <label className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">Class</label>
                         <select 
                            name="studentClass" 
                            value={formData.studentClass} 
                            onChange={handleInputChange} 
                            className="bg-transparent w-full text-white text-xl font-bold text-center focus:outline-none appearance-none"
                         >
                            <option className="text-black" value="">--</option>
                            {CLASS_OPTIONS.map(c => <option className="text-black" key={c} value={c}>{c}</option>)}
                         </select>
                     </div>
                     <div className="flex-1 flex flex-col items-center justify-center py-1">
                         <label className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">Section</label>
                         <input 
                            type="text" 
                            name="studentSection" 
                            placeholder="-" 
                            value={formData.studentSection} 
                            onChange={handleInputChange} 
                            maxLength={1} 
                            className="bg-transparent w-full text-white text-xl font-bold text-center placeholder:text-white/30 focus:outline-none uppercase"
                         />
                     </div>
                </div>
            </div>
        )}

        {/* Host Selection */}
        {(formData.visitorType === 'Parent' || formData.visitorType === 'Vendor' || formData.visitorType === 'Guest' || formData.visitorType === 'Official') && (
             <div className="space-y-4">
                 <div className="glass-panel rounded-xl">
                    <div className="flex items-center p-3">
                        <UserCheck size={20} className="text-white/50" />
                        <select name="hostName" value={formData.hostName} onChange={handleInputChange} className="bg-transparent w-full ml-3 text-white focus:outline-none appearance-none">
                            <option className="text-black" value="">Whom to Meet...</option>
                            {currentHostOptions.map(h => <option className="text-black" key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                </div>
                
                {formData.hostName === 'Specific Teacher' && (
                    <div className="glass-panel rounded-xl animate-ios-push">
                        <div className="flex items-center p-3">
                            <GraduationCap size={20} className="text-white/50" />
                            <input 
                                type="text" 
                                name="specificTeacherName" 
                                placeholder="Enter Teacher's Name" 
                                value={formData.specificTeacherName} 
                                onChange={handleInputChange} 
                                className="bg-transparent w-full ml-3 text-white placeholder:text-white/30 focus:outline-none uppercase"
                            />
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};