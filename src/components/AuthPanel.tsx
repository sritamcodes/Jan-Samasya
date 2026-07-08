import React, { useState } from 'react';
import { Shield, User, Lock, Key, CheckCircle, ArrowRight, X, Sparkles, Smartphone, Mail, RefreshCw, KeyRound, ArrowLeft } from 'lucide-react';
import { LanguageCode } from '../types';

interface AuthPanelProps {
  lang: LanguageCode;
  onSuccess: (token: string, user: { id: string; username: string; displayName: string; role: 'citizen' | 'planner' }) => void;
  onCancel?: () => void;
  initialRole?: 'citizen' | 'planner';
}

const authTranslations = {
  en: {
    titleCitizen: "Citizen Portal Access",
    titlePlanner: "Planner Verification",
    subCitizen: "Sign in to monitor your priority requests and track action.",
    subPlanner: "Enterprise login for chief constituency planners and engineers.",
    username: "Username",
    password: "Password",
    displayName: "Full Name",
    loginBtn: "Authenticate Securely",
    registerBtn: "Register Citizen Account",
    switchRegister: "New here? Create a citizen account",
    switchLogin: "Already have an account? Sign In",
    errorHeader: "Authentication Error",
    successMsg: "Session validated successfully.",
    securingConnection: "Securing connection...",
    authenticating: "Cryptographically verifying...",
    registerTab: "Citizen Registration",
    forgotPassword: "Forgot Password?",
    enterUsernameReset: "Enter your username to receive a secure password reset OTP.",
    sendOtp: "Generate & Send OTP",
    enterOtpReset: "Enter the OTP sent to your account & choose a new password.",
    resetPasswordBtn: "Verify & Reset Password",
    verifyRegisterOtpTitle: "Security OTP Verification",
    verifyRegisterOtpSub: "Please enter the 6-digit dynamic OTP sent to your registered line.",
    completeVerification: "Complete Verification",
    backToLogin: "Back to Login",
    resetSuccess: "Password reset successfully! You can now log in with your new password.",
  },
  hi: {
    titleCitizen: "नागरिक पोर्टल प्रवेश",
    titlePlanner: "योजनाकार सत्यापन",
    subCitizen: "अपनी प्राथमिकताओं और कार्यों को ट्रैक करने के लिए साइन इन करें।",
    subPlanner: "मुख्य निर्वाचन क्षेत्र के योजनाकारों और इंजीनियरों के लिए एंटरप्राइज़ लॉगिन।",
    username: "उपयोगकर्ता नाम",
    password: "पासवर्ड",
    displayName: "पूरा नाम",
    loginBtn: "सुरक्षित रूप से प्रमाणित करें",
    registerBtn: "नागरिक खाता बनाएं",
    switchRegister: "नया खाता बनाना चाहते हैं? रजिस्टर करें",
    switchLogin: "पहले से खाता है? साइन इन करें",
    errorHeader: "प्रमाणीकरण त्रुटि",
    successMsg: "सत्र सफलतापूर्वक सत्यापित हुआ।",
    securingConnection: "कनेक्शन सुरक्षित किया जा रहा है...",
    authenticating: "क्रिप्टोग्राफिक सत्यापन चल रहा है...",
    registerTab: "नागरिक पंजीकरण",
    forgotPassword: "पासवर्ड भूल गए?",
    enterUsernameReset: "सुरक्षित पासवर्ड रीसेट ओटीपी प्राप्त करने के लिए अपना उपयोगकर्ता नाम दर्ज करें।",
    sendOtp: "ओटीपी भेजें",
    enterOtpReset: "प्राप्त ओटीपी दर्ज करें और नया पासवर्ड चुनें।",
    resetPasswordBtn: "सत्यापित करें और रीसेट करें",
    verifyRegisterOtpTitle: "सुरक्षा ओटीपी सत्यापन",
    verifyRegisterOtpSub: "अपने पंजीकृत नंबर पर भेजे गए 6-अंकीय ओटीपी को दर्ज करें।",
    completeVerification: "सत्यापन पूरा करें",
    backToLogin: "लॉगिन पर वापस जाएं",
    resetSuccess: "पासवर्ड रीसेट सफल! अब आप नए पासवर्ड से लॉगिन कर सकते हैं।",
  },
  or: {
    titleCitizen: "ନାଗରିକ ପୋର୍ଟାଲ ପ୍ରବେଶ",
    titlePlanner: "ଯୋଜନାକାରୀ ଯାଞ୍ଚ",
    subCitizen: "ନିଜର ଅଭିଯୋଗ ଏବଂ କାର୍ଯ୍ୟାନୁଷ୍ଠାନ ଟ୍ରାକ୍ କରିବା ପାଇଁ ସାଇନ ଇନ୍ କରନ୍ତୁ ।",
    subPlanner: "ମୁଖ୍ୟ ନିର୍ବାଚନ ମଣ୍ଡଳୀ ଯୋଜନାକାରୀ ଓ ଯନ୍ତ୍ରୀଙ୍କ ପାଇଁ ଏଣ୍ଟରପ୍ରାଇଜ୍ ଲଗଇନ୍ ।",
    username: "ଉପଭୋକ୍ତା ନାମ",
    password: "ପାସୱାର୍ଡ",
    displayName: "ପୂରା ନାମ",
    loginBtn: "ସୁରକ୍ଷିତ ପ୍ରମାଣୀକରଣ",
    registerBtn: "ନାଗରିକ ଆକାଉଣ୍ଟ୍ ସୃଷ୍ଟି କରନ୍ତୁ",
    switchRegister: "ନୂଆ ଖାତା ସୃଷ୍ଟି କରିବାକୁ ଚାହାଁନ୍ତି? ପଞ୍ଜିକରଣ କରନ୍ତୁ",
    switchLogin: "ପୂର୍ବରୁ ଆକାଉଣ୍ଟ ଅଛି? ସାଇନ୍ ଇନ୍ କରନ୍ତୁ",
    errorHeader: "ପ୍ରମାଣୀକରଣ ତ୍ରୁଟି",
    successMsg: "ସତ୍ର ସଫଳତାର ସହ ଯାଞ୍ଚ ହେଲା ।",
    securingConnection: "ସଂଯୋଗ ସୁରକ୍ଷିତ ହେଉଛି...",
    authenticating: "କ୍ରିପ୍ଟୋଗ୍ରାଫିକ୍ ଯାଞ୍ଚ ଚାଲିଛି...",
    registerTab: "ନାଗରିକ ପଞ୍ଜିକରଣ",
    forgotPassword: "ପାସୱାର୍ଡ ଭୁଲିଗଲେ କି?",
    enterUsernameReset: "ପାସୱାର୍ଡ ରିସେଟ୍ ଓଟିପି ପାଇଁ ଆପଣଙ୍କର ଉପଭୋକ୍ତା ନାମ ଦିଅନ୍ତୁ ।",
    sendOtp: "ଓଟିପି ପଠାନ୍ତୁ",
    enterOtpReset: "ଓଟିପି ପ୍ରବେଶ କରି ନୂଆ ପାସୱାର୍ଡ ସେଟ୍ କରନ୍ତୁ ।",
    resetPasswordBtn: "ଯାଞ୍ଚ ଏବଂ ରିସେଟ୍ କରନ୍ତୁ",
    verifyRegisterOtpTitle: "ଓଟିପି ଯାଞ୍ଚ",
    verifyRegisterOtpSub: "ଆପଣଙ୍କ ନମ୍ବରକୁ ଯାଇଥିବା ୬-ଅଙ୍କ ବିଶିଷ୍ଟ ଓଟିପି ଦିଅନ୍ତୁ ।",
    completeVerification: "ଯାଞ୍ଚ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ",
    backToLogin: "ଲଗଇନକୁ ଫେରନ୍ତୁ",
    resetSuccess: "ପାସୱାର୍ଡ ସଫଳତାର ସହ ବଦଳିଲା ! ଏବେ ନୂଆ ପାସୱାର୍ଡ ସହ ଲଗଇନ୍ କରନ୍ତୁ ।",
  }
};

type AuthMode = 'LOGIN' | 'REGISTER' | 'REGISTER_OTP_VERIFY' | 'FORGOT_PASSWORD_REQUEST' | 'FORGOT_PASSWORD_RESET';

export default function AuthPanel({ lang, onSuccess, onCancel, initialRole = 'citizen' }: AuthPanelProps) {
  const [role, setRole] = useState<'citizen' | 'planner'>(initialRole);
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  
  // Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  
  // Dynamic Simulation Banner
  const [activeSimulatedOtp, setActiveSimulatedOtp] = useState<string | null>(null);

  const t = authTranslations[lang] || authTranslations.en;

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setError("Please enter username and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Invalid credentials. Please verify your login details.");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess(data.token, data.user);
      }, 800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration Step 1: Send OTP
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedUsername || !password || !trimmedDisplayName) {
      setError("Please fill in all registration fields.");
      return;
    }

    // Username complexity regex
    const usernameRegex = /^[a-zA-Z0-9_\-]{3,20}$/;
    if (!usernameRegex.test(trimmedUsername)) {
      setError("Username must be 3-20 characters long and contain only letters, numbers, hyphens, or underscores.");
      return;
    }

    if (trimmedDisplayName.length < 2 || trimmedDisplayName.length > 50) {
      setError("Full name must be between 2 and 50 characters long.");
      return;
    }

    // Password complexity checks
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (password.length < 8 || !hasUppercase || !hasLowercase || !hasNumber) {
      setError("Password does not meet strict policy requirements.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/send-register-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password, displayName: trimmedDisplayName })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      // Store simulated OTP so user can key it in the sandbox
      if (data.otpForTesting) {
        setActiveSimulatedOtp(data.otpForTesting);
      }
      
      setMode('REGISTER_OTP_VERIFY');
      setOtpCode('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration Step 2: Verify OTP
  const handleRegisterOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError("Please enter the 6-digit OTP code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), otpCode: otpCode.trim() })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      // Registration successful! Now trigger direct login
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const loginData = await loginRes.json();

      if (loginRes.ok) {
        setSuccess(true);
        setActiveSimulatedOtp(null);
        setTimeout(() => {
          onSuccess(loginData.token, loginData.user);
        }, 800);
      } else {
        // Fallback to login screen
        setSuccessNotice("Registered successfully! Please log in with your credentials.");
        setMode('LOGIN');
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password Step 1: Send OTP
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError("Please provide your username to reset password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/send-forgot-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      if (data.otpForTesting) {
        setActiveSimulatedOtp(data.otpForTesting);
      }

      setMode('FORGOT_PASSWORD_RESET');
      setOtpCode('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password Step 2: Reset Password with OTP
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedOtp = otpCode.trim();

    if (!trimmedOtp || !newPassword) {
      setError("OTP code and new password are both required.");
      return;
    }

    // Password complexity check
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (newPassword.length < 8 || !hasUppercase || !hasLowercase || !hasNumber) {
      setError("New password does not meet complexity rules.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, otpCode: trimmedOtp, newPassword })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccessNotice(t.resetSuccess);
      setMode('LOGIN');
      setPassword('');
      setActiveSimulatedOtp(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-panel-container" className="w-full max-w-md mx-auto bg-[#0a0a0a] border border-[#222] rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Dynamic Security Indicator Banner */}
      <div className={`h-1.5 w-full ${role === 'planner' ? 'bg-[#D4AF37]' : 'bg-blue-600'}`}></div>

      {onCancel && (
        <button 
          id="auth-cancel-btn"
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors cursor-pointer"
          title="Cancel"
        >
          <X size={18} />
        </button>
      )}

      <div className="p-8">
        {/* Header Icon */}
        <div className="flex justify-center mb-5">
          <div className={`p-4 rounded-2xl border ${role === 'planner' ? 'bg-[#141414] border-[#D4AF37]/30 text-[#D4AF37]' : 'bg-[#141414] border-blue-900/30 text-blue-400'}`}>
            {mode === 'REGISTER_OTP_VERIFY' || mode === 'FORGOT_PASSWORD_RESET' ? (
              <Smartphone size={28} className="animate-pulse text-[#D4AF37]" />
            ) : role === 'planner' ? (
              <Shield size={28} />
            ) : (
              <User size={28} />
            )}
          </div>
        </div>

        {/* Role Selector Tabs (Only in LOGIN mode to avoid interference) */}
        {mode === 'LOGIN' && (
          <div className="flex bg-[#121212] border border-[#222] p-1 rounded-xl mb-6">
            <button
              id="auth-tab-citizen"
              type="button"
              onClick={() => {
                setRole('citizen');
                setUsername('');
                setPassword('');
                setError(null);
                setSuccessNotice(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg uppercase tracking-wider transition-all duration-200 cursor-pointer ${role === 'citizen' ? 'bg-[#1d1d1d] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Citizen
            </button>
            <button
              id="auth-tab-planner"
              type="button"
              onClick={() => {
                setRole('planner');
                setUsername('');
                setPassword('');
                setError(null);
                setSuccessNotice(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg uppercase tracking-wider transition-all duration-200 cursor-pointer ${role === 'planner' ? 'bg-[#1d1d1d] text-[#D4AF37] shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Planner
            </button>
          </div>
        )}

        {/* Title and Descriptions */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-serif text-white font-semibold flex items-center justify-center gap-1.5">
            {mode === 'LOGIN' ? (role === 'planner' ? t.titlePlanner : t.titleCitizen) : null}
            {mode === 'REGISTER' ? t.registerTab : null}
            {mode === 'REGISTER_OTP_VERIFY' ? t.verifyRegisterOtpTitle : null}
            {mode === 'FORGOT_PASSWORD_REQUEST' ? t.forgotPassword : null}
            {mode === 'FORGOT_PASSWORD_RESET' ? "Password Reset Verification" : null}
            {success && <CheckCircle size={18} className="text-emerald-500 animate-pulse" />}
          </h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {mode === 'LOGIN' ? (role === 'planner' ? t.subPlanner : t.subCitizen) : null}
            {mode === 'REGISTER' ? "Sign up to securely access priority reports, follow action plans, and audit verified expenditures." : null}
            {mode === 'REGISTER_OTP_VERIFY' ? t.verifyRegisterOtpSub : null}
            {mode === 'FORGOT_PASSWORD_REQUEST' ? t.enterUsernameReset : null}
            {mode === 'FORGOT_PASSWORD_RESET' ? t.enterOtpReset : null}
          </p>
        </div>

        {/* Simulated Sandbox OTP Broadcast Banner (CRITICAL for satisfying sandbox environment!) */}
        {activeSimulatedOtp && (
          <div className="mb-6 bg-[#0c1e14] border border-emerald-500/30 p-3.5 rounded-xl text-xs space-y-1 text-emerald-300 animate-pulse">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles size={13} className="text-emerald-400" />
              <span>Simulated SMS Gateway / Telecom Broadcast</span>
            </div>
            <p className="text-[10px] text-slate-300">
              Your active dynamic dynamic security OTP is: <span className="font-mono bg-black text-[#D4AF37] px-2 py-0.5 rounded text-xs select-all font-semibold tracking-widest">{activeSimulatedOtp}</span>
            </p>
          </div>
        )}

        {/* Error Callout */}
        {error && (
          <div id="auth-error-alert" className="mb-6 p-4 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start gap-2.5 text-xs text-red-300 animate-fade-in">
            <Shield size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">{t.errorHeader}</span>
              {error}
            </div>
          </div>
        )}

        {/* Success Notice / Action Alert */}
        {successNotice && (
          <div id="auth-success-alert" className="mb-6 p-4 bg-emerald-950/40 border border-emerald-900/50 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* -------------------- 1. LOGIN FORM -------------------- */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1.5">
                {t.username}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={role === 'planner' ? "Enter chief planner username" : "Enter citizen username"}
                  disabled={loading || success}
                  className="w-full bg-[#111] border border-[#222] focus:border-blue-500 focus:outline-none rounded-xl py-2.5 pl-9 pr-4 text-xs text-white transition-all"
                  required
                />
                <User size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                  {t.password}
                </label>
                {role === 'citizen' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('FORGOT_PASSWORD_REQUEST');
                      setError(null);
                      setSuccessNotice(null);
                    }}
                    className="text-[10px] text-slate-500 hover:text-[#D4AF37] transition-colors cursor-pointer"
                  >
                    {t.forgotPassword}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••"
                  disabled={loading || success}
                  className="w-full bg-[#111] border border-[#222] focus:outline-none rounded-xl py-2.5 pl-9 pr-4 text-xs text-white transition-all focus:border-blue-500"
                  required
                />
                <Lock size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className={`w-full py-2.5 mt-2 rounded-xl font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                role === 'planner' 
                  ? 'bg-[#D4AF37] hover:bg-[#b8952b] text-black shadow-lg shadow-[#D4AF37]/10' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/10'
              } disabled:opacity-50`}
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw size={13} className="animate-spin" />
                  {t.authenticating}
                </span>
              ) : (
                <>
                  {t.loginBtn}
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        )}

        {/* -------------------- 2. REGISTER FORM -------------------- */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1.5">
                {t.displayName}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Debasish Mohanty"
                  disabled={loading}
                  className="w-full bg-[#111] border border-[#222] focus:border-blue-500 focus:outline-none rounded-xl py-2.5 pl-9 pr-4 text-xs text-white transition-all"
                  required
                />
                <User size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1.5">
                {t.username}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose unique, simple username"
                  disabled={loading}
                  className="w-full bg-[#111] border border-[#222] focus:border-blue-500 focus:outline-none rounded-xl py-2.5 pl-9 pr-4 text-xs text-white transition-all"
                  required
                />
                <User size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1.5">
                {t.password}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create complex password"
                  disabled={loading}
                  className="w-full bg-[#111] border border-[#222] focus:border-blue-500 focus:outline-none rounded-xl py-2.5 pl-9 pr-4 text-xs text-white transition-all"
                  required
                />
                <Lock size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
              </div>

              {/* Password rules indicator */}
              <div className="mt-2.5 space-y-1 bg-[#090909] border border-[#1a1a1a] p-3 rounded-xl text-[10px] animate-fade-in">
                <span className="text-slate-400 font-semibold block mb-1">Password Integrity Check:</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${password.length >= 8 ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                  <span className={password.length >= 8 ? 'text-emerald-400' : 'text-slate-500'}>Minimum 8 characters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(password) ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                  <span className={/[A-Z]/.test(password) ? 'text-emerald-400' : 'text-slate-500'}>At least 1 uppercase letter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(password) ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                  <span className={/[0-9]/.test(password) ? 'text-emerald-400' : 'text-slate-500'}>At least 1 numeric digit</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/10"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw size={13} className="animate-spin" />
                  Generating Verification OTP...
                </span>
              ) : (
                <>
                  {t.registerBtn}
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        )}

        {/* -------------------- 3. REGISTER OTP VERIFICATION FORM -------------------- */}
        {mode === 'REGISTER_OTP_VERIFY' && (
          <form onSubmit={handleRegisterOtpVerify} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1.5">
                Verification Security Code (OTP)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit OTP code"
                  maxLength={6}
                  disabled={loading || success}
                  className="w-full bg-[#111] border border-[#222] focus:border-blue-500 focus:outline-none rounded-xl py-2.5 pl-9 pr-4 text-xs text-white text-center font-mono tracking-widest text-lg font-bold transition-all"
                  required
                />
                <KeyRound size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/10"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw size={13} className="animate-spin" />
                  Authenticating OTP...
                </span>
              ) : (
                <>
                  {t.completeVerification}
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        )}

        {/* -------------------- 4. FORGOT PASSWORD: REQUEST OTP -------------------- */}
        {mode === 'FORGOT_PASSWORD_REQUEST' && (
          <form onSubmit={handleForgotRequest} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1.5">
                {t.username}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your registered username"
                  disabled={loading}
                  className="w-full bg-[#111] border border-[#222] focus:border-blue-500 focus:outline-none rounded-xl py-2.5 pl-9 pr-4 text-xs text-white transition-all"
                  required
                />
                <User size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/10"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw size={13} className="animate-spin" />
                  Locating account & creating OTP...
                </span>
              ) : (
                <>
                  {t.sendOtp}
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        )}

        {/* -------------------- 5. FORGOT PASSWORD: RESET WITH OTP -------------------- */}
        {mode === 'FORGOT_PASSWORD_RESET' && (
          <form onSubmit={handleForgotReset} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1.5">
                Reset Security OTP
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter reset code"
                  maxLength={6}
                  disabled={loading}
                  className="w-full bg-[#111] border border-[#222] focus:border-blue-500 focus:outline-none rounded-xl py-2.5 pl-9 pr-4 text-xs text-white text-center font-mono tracking-widest text-base font-bold transition-all"
                  required
                />
                <KeyRound size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1.5">
                Choose New Secure Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Choose high-security password"
                  disabled={loading}
                  className="w-full bg-[#111] border border-[#222] focus:border-blue-500 focus:outline-none rounded-xl py-2.5 pl-9 pr-4 text-xs text-white transition-all"
                  required
                />
                <Lock size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
              </div>

              {/* Password checks */}
              <div className="mt-2.5 space-y-1 bg-[#090909] border border-[#1a1a1a] p-3 rounded-xl text-[10px] animate-fade-in">
                <span className="text-slate-400 font-semibold block mb-1">Integrity Rules:</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                  <span className={newPassword.length >= 8 ? 'text-emerald-400' : 'text-slate-500'}>Minimum 8 characters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                  <span className={/[A-Z]/.test(newPassword) ? 'text-emerald-400' : 'text-slate-500'}>At least 1 uppercase letter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(newPassword) ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                  <span className={/[0-9]/.test(newPassword) ? 'text-emerald-400' : 'text-slate-500'}>At least 1 numeric digit</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/10"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw size={13} className="animate-spin" />
                  Updating secure password...
                </span>
              ) : (
                <>
                  {t.resetPasswordBtn}
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Mode Toggles and Back Navigation Buttons */}
        <div className="text-center mt-6 space-y-4">
          {mode === 'LOGIN' && role === 'citizen' && (
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setError(null);
                setSuccessNotice(null);
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors underline decoration-[#333] hover:decoration-white cursor-pointer block w-full"
            >
              {t.switchRegister}
            </button>
          )}

          {mode === 'REGISTER' && (
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setError(null);
                setSuccessNotice(null);
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors underline decoration-[#333] hover:decoration-white cursor-pointer block w-full"
            >
              {t.switchLogin}
            </button>
          )}

          {mode === 'REGISTER_OTP_VERIFY' && (
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setError(null);
                setSuccessNotice(null);
                setActiveSimulatedOtp(null);
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1 justify-center mx-auto cursor-pointer"
            >
              <ArrowLeft size={12} />
              <span>Back to Edit Credentials</span>
            </button>
          )}

          {mode === 'FORGOT_PASSWORD_REQUEST' && (
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setError(null);
                setSuccessNotice(null);
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1 justify-center mx-auto cursor-pointer"
            >
              <ArrowLeft size={12} />
              <span>{t.backToLogin}</span>
            </button>
          )}

          {mode === 'FORGOT_PASSWORD_RESET' && (
            <button
              type="button"
              onClick={() => {
                setMode('FORGOT_PASSWORD_REQUEST');
                setError(null);
                setSuccessNotice(null);
                setActiveSimulatedOtp(null);
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1 justify-center mx-auto cursor-pointer"
            >
              <ArrowLeft size={12} />
              <span>Change Username</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
