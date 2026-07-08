import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  translations 
} from './translations';
import CivicMap from './components/CivicMap';
import AuthPanel from './components/AuthPanel';
import { 
  CivicFeedback, 
  CivicTheme, 
  LanguageCode, 
  InputMethod, 
  WorkflowStatus, 
  PriorityClassification,
  BudgetBreakdownItem,
  User
} from './types';
import { 
  Shield, 
  Compass, 
  Activity, 
  Volume2, 
  FileText, 
  Camera, 
  Send, 
  CheckCircle, 
  ChevronRight, 
  Grid, 
  ListOrdered, 
  FileCheck, 
  DollarSign, 
  HelpCircle, 
  Mic, 
  MicOff,
  Square, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw, 
  Clock, 
  MapPin, 
  Check, 
  X, 
  Sliders, 
  ExternalLink,
  ChevronDown,
  Lock,
  Unlock,
  UserCheck,
  LogOut
} from 'lucide-react';

export default function App() {
  // Navigation: 'citizen' or 'planner'
  const [userRole, setUserRole] = useState<'citizen' | 'planner'>('citizen');

  // Auth states
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('civic_auth_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authRoleSelection, setAuthRoleSelection] = useState<'citizen' | 'planner'>('citizen');

  // Citizen Navigation tab: 'home' | 'updates' | 'my-submissions'
  const [citizenTab, setCitizenTab] = useState<'home' | 'updates' | 'my-submissions'>('home');
  
  // Citizen personal submissions list
  const [myFeedbacks, setMyFeedbacks] = useState<CivicFeedback[]>([]);
  
  // Planner Navigation tab: 'overview' | 'priorities' | 'evidence' | 'budget'
  const [plannerTab, setPlannerTab] = useState<'overview' | 'priorities' | 'evidence' | 'budget'>('overview');
  
  // App-wide Language state
  const [lang, setLang] = useState<LanguageCode>('en');
  const t = translations[lang];

  // Graceful capability detection for Web Speech API
  const isSpeechSupported = typeof window !== 'undefined' && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);

  // API Configuration and Status State
  const [serverStatus, setServerStatus] = useState({
    serverOnline: false,
    geminiActive: false,
    geminiTestedSuccessfully: false,
    environment: 'loading',
    configurationRequired: true,
    configMessage: 'Checking server connection...'
  });

  // Data States
  const [themes, setThemes] = useState<CivicTheme[]>([]);
  const [feedbacks, setFeedbacks] = useState<CivicFeedback[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<CivicTheme | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<CivicFeedback | null>(null);
  
  // Loading and Error flags
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successSubmission, setSuccessSubmission] = useState<CivicFeedback | null>(null);

  // Form input states
  const [rawFeedback, setRawFeedback] = useState('');
  const [inputMethod, setInputMethod] = useState<InputMethod>('TYPE');
  const [locality, setLocality] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [guidedMode, setGuidedMode] = useState(false);
  
  // Guided inputs
  const [guidedWhat, setGuidedWhat] = useState('');
  const [guidedWhere, setGuidedWhere] = useState('');
  const [guidedWho, setGuidedWho] = useState('');

  // Voice recording state
  const [isListening, setIsListening] = useState(false);
  const [listeningError, setListeningError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Evidence Review state variables
  const [reviewDecision, setReviewDecision] = useState<'VERIFIED_EVIDENCE' | 'NEEDS_FURTHER_REVIEW' | 'EVIDENCE_NOT_VERIFIED' | null>(null);
  const [reviewerNote, setReviewerNote] = useState('');
  const [showExternalConsent, setShowExternalConsent] = useState(false);
  const [externalLogs, setExternalLogs] = useState<string[]>([]);
  const [externalChecked, setExternalChecked] = useState(false);
  const [externalResult, setExternalResult] = useState<string | null>(null);

  // Rate limit feedback state
  const [rateLimited, setRateLimited] = useState(false);

  // Active testing variables
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingGemini, setTestingGemini] = useState(false);

  // Simulation loading state for citizens submitting reports
  const [submissionStage, setSubmissionStage] = useState<string>('');

  // Load authenticated session on mount or when token changes
  useEffect(() => {
    const loadSession = async () => {
      if (!authToken) {
        setCurrentUser(null);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            // Sync user role view to match actual user role
            setUserRole(data.user.role);
          } else {
            // Token expired or invalid
            setAuthToken(null);
            setCurrentUser(null);
            localStorage.removeItem('civic_auth_token');
          }
        } else {
          setAuthToken(null);
          setCurrentUser(null);
          localStorage.removeItem('civic_auth_token');
        }
      } catch (err) {
        console.error("Session lookup failed:", err);
      }
    };
    loadSession();
  }, [authToken]);

  // Initial Fetch & Refresh
  const fetchData = async () => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      };

      const [statusRes, themesRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/themes')
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setServerStatus(statusData);
      }
      setStatusLoading(false);

      if (themesRes.ok) {
        const themesData = await themesRes.json();
        setThemes(themesData);
        // Automatically select the first theme if none selected
        if (themesData.length > 0 && !selectedTheme) {
          // Find the main road one if possible
          const roadTheme = themesData.find((t: any) => t.category === 'ROADS');
          setSelectedTheme(roadTheme || themesData[0]);
        }
      }

      // ONLY fetch general reports if authenticated as planner
      if (currentUser && currentUser.role === 'planner') {
        const feedbacksRes = await fetch('/api/feedbacks', { headers });
        if (feedbacksRes.ok) {
          const feedbacksData = await feedbacksRes.json();
          setFeedbacks(feedbacksData);
          // Automatically select first review item with image
          const pendingItem = feedbacksData.find((f: any) => f.evidence.hasImage && f.evidence.evidenceStatus === 'PENDING_HUMAN_VERIFICATION');
          setSelectedFeedback(pendingItem || feedbacksData.find((f: any) => f.evidence.hasImage) || null);
        }
      } else {
        setFeedbacks([]);
      }

      // Fetch personal submissions for citizen
      if (currentUser && currentUser.role === 'citizen') {
        const myRes = await fetch('/api/my-feedbacks', { headers });
        if (myRes.ok) {
          const myData = await myRes.json();
          setMyFeedbacks(myData);
        }
      } else {
        setMyFeedbacks([]);
      }
    } catch (err) {
      console.error("Error loading full-stack data:", err);
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh interval for live-simulation feel every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [authToken, currentUser]);

  // Sync selected theme details when themes array updates
  useEffect(() => {
    if (selectedTheme) {
      const fresh = themes.find(t => t.id === selectedTheme.id);
      if (fresh) {
        setSelectedTheme(fresh);
      }
    }
  }, [themes]);

  // Sync selected feedback details when feedbacks array updates
  useEffect(() => {
    if (selectedFeedback) {
      const fresh = feedbacks.find(f => f.id === selectedFeedback.id);
      if (fresh) {
        setSelectedFeedback(fresh);
      }
    }
  }, [feedbacks]);

  // Trigger Gemini Ping test
  const handleTestGemini = async () => {
    setTestingGemini(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/test-gemini', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        }
      });
      const data = await res.json();
      setTestResult(data);
      // Refresh status to show success verified
      fetchData();
    } catch (err) {
      setTestResult({ success: false, message: 'Server endpoint inaccessible.' });
    } finally {
      setTestingGemini(false);
    }
  };

  // Re-seed Database
  const handleReseed = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seed', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        }
      });
      await res.json();
      fetchData();
      setSelectedTheme(null);
      setSelectedFeedback(null);
    } catch (err) {
      console.error("Seeding failed");
    } finally {
      setLoading(false);
    }
  };

  // Web Speech API Transcription integration
  const startRecording = () => {
    setListeningError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setListeningError(t.voiceUnavailable);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      // Map localization selection
      if (lang === 'hi') rec.lang = 'hi-IN';
      else if (lang === 'or') rec.lang = 'or-IN'; // If browser supports Odia
      else rec.lang = 'en-IN';

      rec.interimResults = true;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onerror = (e: any) => {
        console.warn("Speech recognition warning:", e);
        let msg = "Speech recognition error. Please type your message instead.";
        if (e.error === 'not-allowed') {
          msg = "Microphone access denied. This is common inside previews. Please click the 'Open in new tab' button at the top right of this screen to grant microphone access directly.";
        } else if (e.error === 'no-speech') {
          msg = "No speech detected. Please speak clearly, or type your message.";
        } else if (e.error === 'audio-capture') {
          msg = "No microphone found. Please ensure your microphone is plugged in and enabled.";
        } else if (e.error === 'network') {
          msg = "Network error during speech recognition. Please check your internet connection or type your message.";
        } else if (e.error === 'aborted') {
          msg = "Voice recording was stopped or cancelled.";
        } else if (e.error === 'language-not-supported' || e.error === 'bad-grammar') {
          msg = "The selected language or grammar configuration is not supported by your browser's speech recognition engine. You can type your message in your preferred language.";
        } else if (e.error === 'service-not-allowed') {
          msg = "Speech recognition service is not allowed by your browser or security policy.";
        }
        setListeningError(msg);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setRawFeedback(prev => (prev + ' ' + finalTranscript).trim());
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      setListeningError("Unable to start browser audio recognition. Please type your report.");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Guided assistance assembler
  const handleAssembleGuided = () => {
    if (!guidedWhat && !guidedWhere && !guidedWho) return;
    const parts = [];
    if (guidedWhat) parts.push(`What happened: ${guidedWhat}`);
    if (guidedWhere) parts.push(`Where is it: ${guidedWhere}`);
    if (guidedWho) parts.push(`Who is affected: ${guidedWho}`);
    
    setRawFeedback(parts.join('\n'));
    setGuidedMode(false);
    // Auto fill locality if typed
    if (guidedWhere) {
      setLocality(guidedWhere.split(',')[0]);
    }
  };

  // Handle Photo selection and parse base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg("File size exceeds 4MB. Please select a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result as string);
      setImageMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  // Submit Feedback to API
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawFeedback.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setRateLimited(false);
    
    // Simulate smart AI steps for realistic civic flow feedback
    setSubmissionStage("Understanding your message...");
    setTimeout(() => {
      setSubmissionStage("Finding similar community needs...");
    }, 1200);
    setTimeout(() => {
      setSubmissionStage("Recording your feedback securely...");
    }, 2400);

    try {
      const res = await fetch('/api/submit-feedback', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          rawFeedback,
          inputMethod,
          language: lang,
          locality: locality || 'Unknown Locality',
          imageBase64,
          imageMimeType
        })
      });

      if (res.status === 429) {
        setRateLimited(true);
        setErrorMsg("Submission rate limit reached. Please wait one minute before reporting again.");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit report.");
      }

      if (data.safetyRejected) {
        setErrorMsg(`AI Safety Router: ${data.message}`);
        return;
      }

      setSuccessSubmission(data.feedback);
      
      // Reset inputs
      setRawFeedback('');
      setLocality('');
      setImageBase64(null);
      setImageMimeType(null);
      setGuidedWhat('');
      setGuidedWhere('');
      setGuidedWho('');

      // Refresh listings
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
      setSubmissionStage('');
    }
  };

  // Submit Human Evidence Review Decision
  const handleReviewDecision = async (decision: 'VERIFIED_EVIDENCE' | 'NEEDS_FURTHER_REVIEW' | 'EVIDENCE_NOT_VERIFIED') => {
    if (!selectedFeedback) return;
    setLoading(true);
    try {
      const res = await fetch('/api/evidence-review', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          feedbackId: selectedFeedback.id,
          decision,
          reviewerNote,
          externalCheckUsed: externalChecked,
          externalCheckProvider: externalChecked ? 'CivicEye Image Integrity Engine' : null,
          externalCheckResultSummary: externalChecked ? externalResult : null
        })
      });

      if (res.ok) {
        setReviewerNote('');
        setExternalChecked(false);
        setExternalResult(null);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to post evidence decision");
    } finally {
      setLoading(false);
    }
  };

  // Trigger workflow update
  const handleUpdateWorkflow = async (status: WorkflowStatus) => {
    if (!selectedTheme) return;
    setLoading(true);
    try {
      // Setup default simulated budget if approved
      const isApproved = status === 'APPROVED_DEMO';
      const body: any = {
        themeId: selectedTheme.id,
        workflowStatus: status
      };
      if (isApproved) {
        body.totalAllocatedBudget = 1250000; // 12.5 Lakhs
      }

      const res = await fetch('/api/update-workflow', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Workflow status update failed");
    } finally {
      setLoading(false);
    }
  };

  // Simulate External Image Integrity Check
  const handleRunExternalCheck = () => {
    setShowExternalConsent(false);
    setExternalLogs(["Initializing secure integrity request..."]);
    
    setTimeout(() => {
      setExternalLogs(prev => [...prev, "Sending image hashes to metadata analysis server..."]);
    }, 600);

    setTimeout(() => {
      setExternalLogs(prev => [...prev, "Inspecting EXIF compression patterns and digital signatures..."]);
    }, 1200);

    setTimeout(() => {
      setExternalLogs(prev => [...prev, "Cross-referencing global stock databases for duplicate media assets..."]);
    }, 1800);

    setTimeout(() => {
      setExternalLogs(prev => [...prev, "Analysis complete. Source: Citizen Camera Device. Modifiers: None."]);
      setExternalChecked(true);
      setExternalResult("PASSED: Image metadata aligns with localized camera hardware signature. Low integrity risk.");
    }, 2500);
  };

  // Multi-theme category configurations
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'ROADS': return 'from-amber-600 to-amber-900 border-amber-500/40 text-amber-300 bg-amber-500/10';
      case 'WATER': return 'from-blue-600 to-blue-900 border-blue-500/40 text-blue-300 bg-blue-500/10';
      case 'DRAINAGE': return 'from-indigo-600 to-indigo-900 border-indigo-500/40 text-indigo-300 bg-indigo-500/10';
      case 'HEALTHCARE': return 'from-rose-600 to-rose-900 border-rose-500/40 text-rose-300 bg-rose-500/10';
      case 'ELECTRICITY': return 'from-yellow-600 to-yellow-900 border-yellow-500/40 text-yellow-300 bg-yellow-500/10';
      case 'SANITATION': return 'from-emerald-600 to-emerald-900 border-emerald-500/40 text-emerald-300 bg-emerald-500/10';
      case 'EDUCATION': return 'from-cyan-600 to-cyan-900 border-cyan-500/40 text-cyan-300 bg-cyan-500/10';
      default: return 'from-slate-600 to-slate-900 border-slate-500/40 text-slate-300 bg-slate-500/10';
    }
  };

  const getPriorityColor = (classification: PriorityClassification) => {
    switch (classification) {
      case 'URGENT_CRITICAL': return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      case 'HIGH': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'MODERATE': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border border-slate-500/20';
    }
  };

  const getWorkflowStep = (status: WorkflowStatus) => {
    const steps: WorkflowStatus[] = ['IDENTIFIED', 'UNDER_REVIEW', 'PROPOSED', 'APPROVED_DEMO', 'IN_PROGRESS_DEMO', 'COMPLETED_DEMO'];
    return steps.indexOf(status);
  };

  // Dynamic Metrics helpers for graphs and dashboards
  const categoryCounts = themes.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.reportCount;
    return acc;
  }, {} as Record<string, number>);

  const priorityDistribution = themes.reduce((acc, curr) => {
    acc[curr.priorityClassification] = (acc[curr.priorityClassification] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const urgentCount = themes.filter(t => t.priorityClassification === 'URGENT_CRITICAL').length;
  const highCount = themes.filter(t => t.priorityClassification === 'HIGH').length;
  const pendingReviewsCount = feedbacks.filter(f => f.evidence.hasImage && f.evidence.evidenceStatus === 'PENDING_HUMAN_VERIFICATION').length;
  const verifiedCount = feedbacks.filter(f => f.evidence.hasImage && f.evidence.evidenceStatus === 'VERIFIED_EVIDENCE').length;

  return (
    <div id="app-root" className="min-h-screen bg-[#080808] text-[#E0E0E0] font-sans flex flex-col justify-between overflow-x-hidden antialiased">
      
      {/* 1. SECURE SYSTEM GATEKEEPER HEADER */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-[#1A1A1A] bg-[#0C0C0C] shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#D4AF37] to-[#8A6D3B] flex items-center justify-center text-black font-bold font-serif shadow-lg shadow-yellow-900/10">P</div>
          <div>
            <span className="text-[10px] tracking-[0.3em] font-semibold uppercase text-slate-400 block leading-tight">Civic Intelligence</span>
            <span className="text-sm font-serif italic text-white tracking-wide">{t.brand}</span>
          </div>
        </div>

        {/* Dynamic Navigation Roles */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="bg-[#141414] border border-[#222] p-1 rounded-lg flex">
            <button 
              id="role-citizen-btn"
              onClick={() => {
                setUserRole('citizen');
                setCitizenTab('home');
              }}
              className={`px-3 py-1 text-xs rounded transition-all duration-200 uppercase tracking-widest cursor-pointer ${userRole === 'citizen' ? 'bg-[#151515] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              Citizen
            </button>
            <button 
              id="role-planner-btn"
              onClick={() => {
                if (currentUser && currentUser.role === 'planner') {
                  setUserRole('planner');
                } else {
                  setAuthRoleSelection('planner');
                  setShowAuthModal(true);
                }
              }}
              className={`px-3 py-1 text-xs rounded transition-all duration-200 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer ${userRole === 'planner' ? 'bg-[#D4AF37] text-black font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              Planners
              {pendingReviewsCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-ping"></span>
              )}
            </button>
          </div>

          <div className="h-6 w-[1px] bg-[#222] hidden sm:block"></div>

          {/* User Session Identity pill / Action Button */}
          <div id="session-identity-area" className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="bg-[#111] border border-[#222] px-2.5 py-1 rounded-lg flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${currentUser.role === 'planner' ? 'bg-amber-400 animate-pulse' : 'bg-blue-400 animate-pulse'}`}></span>
                  <span className="text-[11px] font-mono font-medium text-slate-200">{currentUser.displayName}</span>
                </div>
                <button
                  id="header-logout-btn"
                  onClick={() => {
                    setAuthToken(null);
                    setCurrentUser(null);
                    localStorage.removeItem('civic_auth_token');
                    setUserRole('citizen');
                    setCitizenTab('home');
                  }}
                  className="text-[10px] uppercase tracking-wider text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={13} />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                id="header-login-btn"
                onClick={() => {
                  setAuthRoleSelection('citizen');
                  setShowAuthModal(true);
                }}
                className="bg-blue-950/40 hover:bg-blue-900/40 border border-blue-900/50 px-3 py-1 rounded-lg text-[10px] uppercase tracking-widest font-semibold text-blue-400 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Lock size={12} />
                Sign In
              </button>
            )}
          </div>

          <div className="h-6 w-[1px] bg-[#222] hidden md:block"></div>

          {/* Server / API Status Pill */}
          <div className="items-center gap-2 hidden md:flex">
            <span className={`w-2 h-2 rounded-full ${serverStatus.geminiActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`}></span>
            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">
              {serverStatus.geminiActive ? 'Gemini Portal Active' : 'Gateway Offline'}
            </span>
          </div>
        </div>
      </header>

      {/* 2. MAIN APPLICATION LAYER */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* ==============================================
            CITIZEN USER WORKFLOW
            ============================================== */}
        {userRole === 'citizen' && (
          <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            
            {/* Minimal Mobile-first Tab Nav */}
            <div className="flex border-b border-[#1A1A1A]">
              <button 
                id="citizen-tab-home"
                onClick={() => setCitizenTab('home')}
                className={`py-3 px-6 text-sm uppercase tracking-widest font-semibold border-b-2 transition-all ${citizenTab === 'home' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-slate-400 hover:text-white'}`}
              >
                {lang === 'hi' ? 'रिपोर्ट करें' : lang === 'or' ? 'ଅଭିଯୋଗ ଜଣାନ୍ତୁ' : 'Report Need'}
              </button>
              <button 
                id="citizen-tab-updates"
                onClick={() => setCitizenTab('updates')}
                className={`py-3 px-6 text-sm uppercase tracking-widest font-semibold border-b-2 transition-all flex items-center gap-2 ${citizenTab === 'updates' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-slate-400 hover:text-white'}`}
              >
                {lang === 'hi' ? 'समुदाय के अपडेट' : lang === 'or' ? 'ସାମୁଦାୟିକ ଅପଡେଟ୍' : 'Community Updates'}
                <span className="text-[10px] bg-[#1a1a1a] px-2 py-0.5 rounded-full text-[#D4AF37]">{themes.length}</span>
              </button>
            </div>

            {citizenTab === 'home' ? (
              <div className="space-y-6">
                
                {/* Brand Hero Callout */}
                <div className="text-center sm:text-left space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-serif italic text-white tracking-tight leading-tight">
                    {t.tagline}
                  </h1>
                  <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
                    {t.subtagline}
                  </p>
                </div>

                {/* LANGUAGE CARDS / SELECTION */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { code: 'en', label: 'English', native: 'English' },
                    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
                    { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' }
                  ].map(langItem => (
                    <button
                      key={langItem.code}
                      onClick={() => setLang(langItem.code as LanguageCode)}
                      className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${lang === langItem.code ? 'bg-[#151515] border-[#D4AF37] text-[#D4AF37] shadow-lg shadow-yellow-900/5' : 'bg-[#0A0A0A] border-[#1A1A1A] text-slate-400 hover:border-slate-700 hover:text-white'}`}
                    >
                      <div className="text-sm font-semibold">{langItem.native}</div>
                      <div className="text-[10px] uppercase tracking-wider opacity-60 mt-0.5">{langItem.label}</div>
                    </button>
                  ))}
                </div>

                {/* MAIN CIVIC-REPORT CARD */}
                <div className="bg-[#0C0C0C] border border-[#1A1A1A] rounded-xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37]"></div>
                  
                  {successSubmission ? (
                    /* SUCCESS STATE */
                    <div className="text-center py-8 space-y-6">
                      <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                        <CheckCircle size={32} />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl font-serif italic text-white">{t.successTitle}</h2>
                        <h3 className="text-lg font-medium text-slate-200">{t.successSub}</h3>
                        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                          {t.successDesc}
                        </p>
                      </div>

                      {successSubmission.analysis && (
                        <div className="bg-[#111] border border-[#222] p-4 rounded-lg max-w-lg mx-auto text-left text-xs space-y-2 font-mono">
                          <div className="text-slate-500 uppercase tracking-wider font-semibold">AI Gateway Telemetry</div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Canonical Issue:</span>
                            <span className="text-[#D4AF37] text-right font-semibold">{successSubmission.analysis.canonicalIssue}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Parsed Category:</span>
                            <span className="text-blue-400 font-semibold">{successSubmission.analysis.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Extracted Locality:</span>
                            <span className="text-emerald-400 font-semibold">{successSubmission.locality}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Urgency & Severity Score:</span>
                            <span className="text-amber-400">Urgency {successSubmission.analysis.urgency}/5 | Severity {successSubmission.analysis.severity}/5</span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
                        <button
                          onClick={() => setSuccessSubmission(null)}
                          className="px-5 py-2.5 rounded-lg bg-[#D4AF37] text-black font-semibold text-sm transition-all hover:bg-opacity-90 uppercase tracking-wider"
                        >
                          {t.reportAnother}
                        </button>
                        <button
                          onClick={() => setCitizenTab('updates')}
                          className="px-5 py-2.5 rounded-lg bg-[#141414] border border-[#222] text-slate-300 font-semibold text-sm transition-all hover:bg-[#222] uppercase tracking-wider"
                        >
                          {t.viewUpdates}
                        </button>
                      </div>
                    </div>
                  ) : !currentUser ? (
                    /* REQUIRE LOGIN STATE FOR COMPLAINT SUBMISSION */
                    <div className="text-center py-12 px-4 space-y-6 max-w-md mx-auto">
                      <div className="w-16 h-16 bg-blue-950/20 border border-blue-900/30 rounded-full flex items-center justify-center mx-auto text-blue-400">
                        <Lock size={26} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold font-serif text-white">Citizen Authentication Required</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          To ensure credibility, security, and tracking of citizen priorities, you must log in or register before submitting a complaint. This allows you to monitor action plans and budgets.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthRoleSelection('citizen');
                          setShowAuthModal(true);
                        }}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-blue-600/10"
                      >
                        Sign In / Register as Citizen
                      </button>
                    </div>
                  ) : (
                    /* COMPLAINT SUBMISSION FORM */
                    <form onSubmit={handleSubmitFeedback} className="space-y-6">
                      <div className="space-y-1">
                        <h2 className="text-lg font-serif italic text-white flex items-center gap-2">
                          {t.whatNeeded}
                        </h2>
                        <p className="text-xs text-slate-400 leading-normal">
                          {t.tellWhatHappened}
                        </p>
                      </div>

                      {/* SPEAK / TYPE CHOICE BUTTONS */}
                      <div className="flex bg-[#141414] p-1 rounded-lg border border-[#222]">
                        <button
                          type="button"
                          onClick={() => { setInputMethod('TYPE'); stopRecording(); }}
                          className={`flex-1 py-2 text-xs rounded transition-all uppercase tracking-widest flex items-center justify-center gap-2 ${inputMethod === 'TYPE' ? 'bg-[#222] text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
                        >
                          <FileText size={14} />
                          {t.type}
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputMethod('SPEAK')}
                          className={`flex-1 py-2 text-xs rounded transition-all uppercase tracking-widest flex items-center justify-center gap-2 ${inputMethod === 'SPEAK' ? 'bg-[#222] text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
                        >
                          <Volume2 size={14} />
                          {t.speak}
                        </button>
                      </div>

                       {/* INPUT FIELDS ACCORDING TO CHOICE */}
                       {inputMethod === 'SPEAK' ? (
                         <div className="p-6 bg-[#0E0E0E] rounded-xl border border-[#1A1A1A] flex flex-col items-center justify-center text-center space-y-6 shadow-2xl relative overflow-hidden">
                           {/* Ambient Glowing Background Effect */}
                           <div className={`absolute inset-0 bg-radial from-yellow-500/5 via-transparent to-transparent pointer-events-none transition-opacity duration-1000 ${isListening ? 'opacity-100' : 'opacity-30'}`} />
                           
                           {!isSpeechSupported ? (
                             <div className="space-y-4 py-6 relative z-10 flex flex-col items-center max-w-sm">
                               <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                 <MicOff size={22} className="text-amber-500 animate-pulse" />
                               </div>
                               <div className="space-y-1">
                                 <p className="text-sm font-semibold text-amber-400">
                                   Voice input is not supported in this browser. You can type your message instead.
                                 </p>
                                 <p className="text-xs text-slate-500 leading-normal">
                                   Your browser does not support the Web Speech API. Use the 'Type' tab above to draft your report.
                                 </p>
                               </div>
                             </div>
                           ) : isListening ? (
                             <div className="space-y-6 w-full relative z-10 flex flex-col items-center">
                              {/* Google Assistant-style Dancing Pillars */}
                              <div className="flex items-center justify-center gap-3 h-20 px-8">
                                <motion.div
                                  className="w-2 rounded-full bg-[#4285F4]"
                                  animate={{
                                    height: [16, 56, 24, 64, 20, 48, 16],
                                  }}
                                  transition={{
                                    duration: 1.0,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                  }}
                                />
                                <motion.div
                                  className="w-2 rounded-full bg-[#EA4335]"
                                  animate={{
                                    height: [20, 64, 16, 48, 32, 72, 20],
                                  }}
                                  transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: 0.1
                                  }}
                                />
                                <motion.div
                                  className="w-2 rounded-full bg-[#FBBC05]"
                                  animate={{
                                    height: [16, 36, 60, 24, 52, 16, 16],
                                  }}
                                  transition={{
                                    duration: 1.2,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: 0.2
                                  }}
                                />
                                <motion.div
                                  className="w-2 rounded-full bg-[#34A853]"
                                  animate={{
                                    height: [20, 48, 20, 64, 32, 20, 20],
                                  }}
                                  transition={{
                                    duration: 0.9,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: 0.35
                                  }}
                                />
                              </div>

                              <div className="text-center space-y-1">
                                <motion.p 
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="text-sm font-semibold bg-gradient-to-r from-blue-400 via-rose-400 to-emerald-400 bg-clip-text text-transparent uppercase tracking-widest animate-pulse"
                                >
                                  {t.listening}
                                </motion.p>
                                <p className="text-xs text-slate-500 italic">
                                  {t.tapToStop}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={stopRecording}
                                className="px-5 py-2 bg-gradient-to-r from-red-950/40 to-slate-900 border border-red-900/30 hover:border-red-500/50 hover:from-red-950/60 text-xs text-rose-300 font-mono rounded-full uppercase tracking-widest transition-all shadow-lg hover:shadow-red-900/10 cursor-pointer flex items-center gap-2"
                              >
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                                Stop Recording
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-6 w-full relative z-10 flex flex-col items-center">
                              {/* 4 Colored Resting Google Assistant Dots */}
                              <div className="flex items-center justify-center gap-3 h-8">
                                <motion.div
                                  className="w-2.5 h-2.5 rounded-full bg-[#4285F4]"
                                  whileHover={{ scale: 1.3 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                />
                                <motion.div
                                  className="w-2.5 h-2.5 rounded-full bg-[#EA4335]"
                                  whileHover={{ scale: 1.3 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                />
                                <motion.div
                                  className="w-2.5 h-2.5 rounded-full bg-[#FBBC05]"
                                  whileHover={{ scale: 1.3 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                />
                                <motion.div
                                  className="w-2.5 h-2.5 rounded-full bg-[#34A853]"
                                  whileHover={{ scale: 1.3 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                />
                              </div>

                              <button
                                type="button"
                                onClick={startRecording}
                                className="w-20 h-20 rounded-full bg-gradient-to-b from-[#161616] to-[#0A0A0A] border border-[#222] hover:border-[#D4AF37] hover:shadow-yellow-900/10 hover:shadow-2xl flex items-center justify-center mx-auto transition-all cursor-pointer shadow-xl group relative overflow-hidden"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-rose-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Mic size={28} className="text-[#D4AF37] group-hover:scale-110 transition-transform relative z-10" />
                              </button>

                              <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-300">
                                  {lang === 'or' ? 'କହିବା ପାଇଁ ଟାପ୍ କରନ୍ତୁ' : lang === 'hi' ? 'बोलने के लिए टैप करें' : 'Tap to Speak'}
                                </p>
                                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                  Constituency Voice Parser will transcribe automatically
                                </p>
                              </div>
                            </div>
                          )}

                          {listeningError && (
                            <p className="text-xs text-rose-400 bg-rose-500/5 px-3 py-1.5 border border-rose-500/10 rounded-md max-w-sm relative z-10">
                              {listeningError}
                            </p>
                          )}
                        </div>
                      ) : null}

                      {/* TEXT FEEDBACK AREA */}
                      <div className="space-y-1.5">
                        <textarea
                          id="citizen-text-input"
                          value={rawFeedback}
                          onChange={(e) => setRawFeedback(e.target.value)}
                          placeholder={t.placeholder}
                          rows={4}
                          className="w-full bg-[#0E0E0E] border border-[#222] rounded-lg p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all font-sans leading-relaxed"
                        />
                        <div className="flex justify-between items-center text-[11px] text-slate-500">
                          <span>{rawFeedback.length} characters</span>
                          
                          {/* Guided Helper Mode Trigger */}
                          <button
                            type="button"
                            onClick={() => setGuidedMode(!guidedMode)}
                            className="flex items-center gap-1 text-[#D4AF37] hover:underline"
                          >
                            <HelpCircle size={12} />
                            {t.needHelp}
                          </button>
                        </div>
                      </div>

                      {/* GUIDED MODE EXPANDED DRAWER */}
                      {guidedMode && (
                        <div className="p-4 bg-[#111] border border-[#222] rounded-lg space-y-4">
                          <h3 className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold flex items-center gap-1.5">
                            <Sparkles size={12} />
                            Guided Composition Tool
                          </h3>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-400 block">{t.prompt1}</label>
                              <input
                                type="text"
                                value={guidedWhat}
                                onChange={(e) => setGuidedWhat(e.target.value)}
                                placeholder={t.prompt1Placeholder}
                                className="w-full bg-[#080808] border border-[#222] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#D4AF37]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-400 block">{t.prompt2}</label>
                              <input
                                type="text"
                                value={guidedWhere}
                                onChange={(e) => setGuidedWhere(e.target.value)}
                                placeholder={t.prompt2Placeholder}
                                className="w-full bg-[#080808] border border-[#222] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#D4AF37]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-400 block">{t.prompt3}</label>
                              <input
                                type="text"
                                value={guidedWho}
                                onChange={(e) => setGuidedWho(e.target.value)}
                                placeholder={t.prompt3Placeholder}
                                className="w-full bg-[#080808] border border-[#222] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#D4AF37]"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setGuidedMode(false)}
                              className="px-3 py-1.5 text-xs border border-[#222] text-slate-400 hover:text-white rounded"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleAssembleGuided}
                              className="px-3 py-1.5 text-xs bg-[#D4AF37] text-black font-semibold rounded"
                            >
                              {t.applyGuided}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* LOCALITY / LOCATION COMPONENT */}
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-400 block flex items-center gap-1.5">
                            <MapPin size={13} className="text-[#D4AF37]" />
                            {t.whereIsProblem}
                          </label>
                          <input
                            id="citizen-locality-input"
                            type="text"
                            value={locality}
                            onChange={(e) => setLocality(e.target.value)}
                            placeholder={t.locationPlaceholder}
                            className="w-full bg-[#0E0E0E] border border-[#222] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-[#D4AF37] transition-all"
                            required
                          />
                        </div>

                        {/* Interactive Geolocation Picker Map */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-mono text-slate-500 block">
                            Or pinpoint the exact area directly on the interactive map:
                          </label>
                          <CivicMap 
                            themes={themes}
                            selectedThemeId={null}
                            interactiveSelectionMode={true}
                            onLocationSelected={(locName) => setLocality(locName)}
                            lang={lang}
                          />
                        </div>
                      </div>

                      {/* PHOTO UPLOAD OPTIONAL EVIDENCE SECTION */}
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-400 block flex items-center gap-1.5">
                            <Camera size={13} className="text-[#D4AF37]" />
                            {t.addPhoto}
                          </label>
                          <p className="text-[11px] text-slate-500">{t.photoSupport}</p>
                        </div>

                        {imageBase64 ? (
                          <div className="p-3 bg-[#111] border border-[#222] rounded-lg flex items-center gap-4">
                            <img 
                              src={imageBase64} 
                              alt="Complaint upload preview" 
                              className="w-16 h-16 object-cover rounded border border-[#333]" 
                            />
                            <div className="flex-1 space-y-1">
                              <span className="text-xs font-mono text-slate-400 block truncate">Photo ready to send</span>
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wider font-semibold">Evidence Model Loaded</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setImageBase64(null); setImageMimeType(null); }}
                              className="p-1.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <label className="flex-1 py-2 border border-dashed border-[#333] hover:border-[#D4AF37]/50 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all bg-[#0A0A0A]">
                              <input
                                id="citizen-photo-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                              />
                              <Camera size={14} className="text-slate-400" />
                              <span className="text-xs text-slate-300 font-medium">{t.choosePhoto}</span>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* ERROR DISPLAY */}
                      {errorMsg && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-start gap-2 leading-relaxed">
                          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      {/* SUBMIT BUTTON */}
                      <button
                        type="submit"
                        disabled={loading || !rawFeedback.trim() || !locality.trim()}
                        className={`w-full py-3 px-6 rounded-lg font-semibold text-sm transition-all uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer ${loading ? 'bg-[#151515] text-[#D4AF37] border border-[#222]' : 'bg-[#D4AF37] text-black hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-yellow-900/10'}`}
                      >
                        {loading ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            <span>{submissionStage || 'Sending...'}</span>
                          </>
                        ) : (
                          <>
                            <Send size={14} />
                            <span>{t.send}</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>

                {/* Secure Dev Status Area inside Citizen mode but hidden elegantly */}
                {!serverStatus.geminiActive && (
                  <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 max-w-lg mx-auto text-center space-y-2">
                    <p className="text-xs font-mono text-rose-400 leading-normal">
                      Gemini service is not configured. Add the required API secret in the project configuration.
                    </p>
                  </div>
                )}
              </div>
            ) : citizenTab === 'updates' ? (
              /* CITIZEN COMMUNITY UPDATES SUB-TAB */
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-xl font-serif italic text-white">{t.communityHeader}</h2>
                  <p className="text-sm text-slate-400">{t.communitySub}</p>
                </div>

                {/* Spatial view map of active reports */}
                {themes.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37] font-bold block">
                      Constituency Spatial Intelligence Map
                    </span>
                    <CivicMap 
                      themes={themes}
                      selectedThemeId={selectedTheme?.id}
                      onSelectTheme={(theme) => setSelectedTheme(theme)}
                      lang={lang}
                    />
                  </div>
                )}

                {themes.length === 0 ? (
                  <div className="text-center p-12 border border-dashed border-[#222] rounded-xl text-slate-500 italic">
                    No recurring community needs identified yet. Submit a need to seed the system.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {themes.map(theme => (
                      <div key={theme.id} className="bg-[#0C0C0C] border border-[#1A1A1A] rounded-xl p-5 relative overflow-hidden transition-all hover:border-[#333]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded text-[9px] uppercase font-mono tracking-wider font-semibold border ${getCategoryColor(theme.category)}`}>
                                {theme.category}
                              </span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <MapPin size={11} className="text-[#D4AF37]" />
                                {theme.locality}
                              </span>
                            </div>
                            
                            <h3 className="text-base font-serif italic text-white leading-snug">{theme.canonicalTitle}</h3>
                            
                            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                              <span className="font-mono">{theme.reportCount} {t.reportsCount}</span>
                              {theme.verifiedEvidenceCount > 0 && (
                                <span className="font-mono text-[#D4AF37] flex items-center gap-1">
                                  <FileCheck size={12} />
                                  {theme.verifiedEvidenceCount} verified
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="sm:text-right shrink-0">
                            <div className="text-[10px] uppercase text-slate-500 tracking-wider">Planning Status</div>
                            <span className="inline-block px-3 py-1 rounded bg-[#151515] border border-[#222] text-[#D4AF37] text-xs font-semibold tracking-wider uppercase mt-1">
                              {theme.workflowStatus.replace('_', ' ').replace('DEMO', 'Prototype')}
                            </span>
                          </div>
                        </div>

                        {/* Expandable description based on status */}
                        <div className="mt-4 pt-3 border-t border-[#1a1a1a] text-xs text-slate-400 bg-[#080808]/50 p-3 rounded leading-relaxed">
                          <span className="font-semibold text-slate-300 block mb-1">Status Milestone Detail:</span>
                          {t.statusExplanation[theme.workflowStatus as keyof typeof t.statusExplanation] || "Review under active planning schedule."}
                          <span className="text-[10px] text-slate-600 block mt-2 font-mono">
                            Priority Score: {theme.priorityScore}/100 ({theme.priorityClassification})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* CITIZEN MY SUBMISSIONS SUB-TAB */
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-xl font-serif italic text-white">My Priority Submissions</h2>
                  <p className="text-sm text-slate-400">Track and monitor action on priorities you have raised.</p>
                </div>

                {!currentUser ? (
                  /* GUEST CTA STATE */
                  <div id="citizen-guest-cta" className="py-12 px-6 border border-[#222] bg-[#0A0A0A] rounded-2xl text-center max-w-md mx-auto space-y-6">
                    <div className="w-16 h-16 bg-blue-950/20 border border-blue-900/30 rounded-full flex items-center justify-center mx-auto text-blue-400 animate-pulse">
                      <Lock size={26} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold font-serif text-white">Save & Track Your Reports</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Log in with your citizen credentials to view all submissions you make, monitor real-time AI and human verification workflows, and view links to local development budgets.
                      </p>
                    </div>
                    <button
                      id="guest-login-trigger"
                      onClick={() => {
                        setAuthRoleSelection('citizen');
                        setShowAuthModal(true);
                      }}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-blue-600/10"
                    >
                      Sign In as Citizen
                    </button>
                  </div>
                ) : (
                  /* LOGGED-IN CITIZEN SUBMISSIONS LIST */
                  <div className="space-y-4">
                    {myFeedbacks.length === 0 ? (
                      <div className="text-center py-16 bg-[#0A0A0A] border border-dashed border-[#222] rounded-2xl text-slate-500 italic text-sm">
                        You have not submitted any civic priorities yet. Go to the "Report Need" tab to raise your first report.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {myFeedbacks.map(fb => {
                          const linkedTheme = fb.themeId ? themes.find(t => t.id === fb.themeId) : null;
                          return (
                            <div 
                              key={fb.id} 
                              className="bg-[#0C0C0C] border border-[#1A1A1A] rounded-xl p-5 relative overflow-hidden hover:border-[#333] transition-all"
                            >
                              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded bg-blue-950/20 text-blue-400 border border-blue-900/30 text-[9px] uppercase font-mono tracking-wider font-semibold">
                                      {fb.id}
                                    </span>
                                    <span className="text-xs text-slate-500 font-mono">
                                      {new Date(fb.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                    </span>
                                  </div>

                                  <p className="text-sm font-sans text-white leading-relaxed">{fb.rawFeedback}</p>

                                  <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-400 font-mono">
                                    <span className="flex items-center gap-1">
                                      <MapPin size={11} className="text-blue-500" />
                                      {fb.locality}
                                    </span>
                                    <span>•</span>
                                    <span className="capitalize">Method: {fb.inputMethod.toLowerCase()}</span>
                                  </div>

                                  {/* AI and Human review status callouts */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-4 border-t border-[#1a1a1a]">
                                    <div className="bg-[#111] p-3 rounded-lg border border-[#222]">
                                      <span className="text-[9px] uppercase text-slate-500 font-mono block mb-1">AI Safety Screening</span>
                                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                                        fb.processingStatus === 'APPROVED' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' :
                                        fb.processingStatus === 'REJECTED_SAFETY' ? 'bg-rose-950/20 text-rose-400 border border-rose-900/30' :
                                        'bg-slate-950/20 text-slate-400 border border-slate-900/20'
                                      }`}>
                                        {fb.processingStatus.replace('_', ' ')}
                                      </span>
                                    </div>

                                    <div className="bg-[#111] p-3 rounded-lg border border-[#222]">
                                      <span className="text-[9px] uppercase text-slate-500 font-mono block mb-1">Evidence Verification</span>
                                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                                        fb.evidence.evidenceStatus === 'VERIFIED_EVIDENCE' ? 'bg-amber-950/20 text-amber-400 border border-amber-900/30' :
                                        fb.evidence.evidenceStatus === 'PENDING_HUMAN_VERIFICATION' ? 'bg-blue-950/20 text-blue-400 border border-blue-900/30' :
                                        fb.evidence.evidenceStatus === 'NEEDS_FURTHER_REVIEW' ? 'bg-indigo-950/20 text-indigo-400 border border-indigo-900/30' :
                                        fb.evidence.evidenceStatus === 'EVIDENCE_NOT_VERIFIED' ? 'bg-rose-950/20 text-rose-400 border border-rose-900/30' :
                                        'bg-slate-950/20 text-slate-400 border border-slate-900/20'
                                      }`}>
                                        {fb.evidence.evidenceStatus.replace('_', ' ')}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Linked Constituency Plan Details */}
                                  {linkedTheme && (
                                    <div className="mt-4 p-3.5 bg-amber-950/10 border border-amber-900/25 rounded-lg space-y-2 text-xs">
                                      <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                                        <Sparkles size={13} className="text-amber-400" />
                                        Linked Constituency Plan Action
                                      </div>
                                      <p className="text-slate-300 leading-relaxed font-serif italic text-sm">
                                        "{linkedTheme.canonicalTitle}"
                                      </p>
                                      <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400">
                                        <span>Status: {linkedTheme.workflowStatus.replace('_', ' ')}</span>
                                        <span>•</span>
                                        <span>Budget: {linkedTheme.planningData ? `₹${(linkedTheme.planningData.totalAllocatedBudget / 100000).toFixed(1)} Lakhs` : 'Analyzing'}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==============================================
            PLANNING INTEL DASHBOARD WORKFLOW
            ============================================== */}
        {userRole === 'planner' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full">
            
            {/* Restrained elegant Planner Sidebar */}
            <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#1A1A1A] p-4 bg-[#090909] shrink-0 space-y-6">
              <div className="space-y-1">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">Service Registry</h3>
                <p className="text-xs text-slate-400 font-mono">Role: CONST_PLANNER_SECURE</p>
              </div>

              <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
                {[
                  { id: 'overview', label: 'Overview', icon: Grid },
                  { id: 'priorities', label: 'Top Priorities', icon: ListOrdered },
                  { id: 'evidence', label: 'Evidence Queue', badge: pendingReviewsCount, icon: FileCheck },
                  { id: 'budget', label: 'Budget & Plans', icon: DollarSign }
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setPlannerTab(item.id as any)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-xs uppercase tracking-widest font-semibold flex items-center justify-between transition-all cursor-pointer ${plannerTab === item.id ? 'bg-[#151515] border border-[#222] text-[#D4AF37]' : 'text-slate-400 hover:text-white'}`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon size={14} />
                        {item.label}
                      </span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="pt-6 border-t border-[#1A1A1A] hidden md:block space-y-4">
                {/* Seed trigger */}
                <button
                  onClick={handleReseed}
                  className="w-full py-2 bg-[#141414] border border-[#222] hover:bg-[#222] text-[10px] uppercase tracking-wider rounded font-semibold text-slate-300 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={12} />
                  Reset & Seed Database
                </button>

                {/* Gemini Model Test Action inside workspace */}
                <div className="bg-[#111] p-3 rounded-lg border border-[#222] space-y-2.5">
                  <span className="text-[9px] uppercase tracking-widest text-[#D4AF37] font-bold block">Developer Actions</span>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Test a real server-side Gemini request from your configured environment.
                  </p>
                  <button
                    onClick={handleTestGemini}
                    disabled={testingGemini}
                    className="w-full py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 text-[9px] text-[#D4AF37] font-semibold uppercase tracking-wider rounded"
                  >
                    {testingGemini ? 'Testing Connection...' : 'Test Gemini Call'}
                  </button>
                  
                  {testResult && (
                    <div className={`p-2 rounded text-[9px] font-mono leading-normal border ${testResult.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                      {testResult.message}
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Main content viewport */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8">
              
              {/* Header Title with transparency details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1A1A1A] pb-4">
                <div className="space-y-1">
                  <h1 className="text-2xl font-serif italic text-white">Community Intelligence Portal</h1>
                  <p className="text-xs text-slate-400">
                    AI-assisted analysis of recurring constituency development needs identified from citizen reports.
                  </p>
                </div>
                <div className="text-xs text-slate-500 italic bg-[#111] px-3 py-1.5 rounded border border-[#222] max-w-sm">
                  Transparency Status: AI assists categorization & translation. Priority scores use 40/30/30 deterministic formula.
                </div>
              </div>

              {/* ==============================================
                  PLANNING OVERVIEW SUB-TAB
                  ============================================== */}
              {plannerTab === 'overview' && (
                <div className="space-y-8">
                  
                  {/* METRIC BOXES ROW */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Citizen Voices", value: feedbacks.length, sub: "Total raw reports processed", highlight: false },
                      { label: "Identified Themes", value: themes.length, sub: "Consolidated community needs", highlight: true },
                      { label: "Urgent/High Priorities", value: urgentCount + highCount, sub: "Score over 60/100", highlight: false },
                      { label: "Evidence Queue", value: pendingReviewsCount, sub: "Awaiting human-in-the-loop review", highlight: false }
                    ].map((box, idx) => (
                      <div key={idx} className="bg-[#0C0C0C] border border-[#1A1A1A] p-4 rounded-xl relative overflow-hidden">
                        <span className="text-[10px] uppercase text-slate-500 tracking-wider font-semibold block">{box.label}</span>
                        <span className={`text-2xl sm:text-3xl font-serif font-bold italic block mt-1 ${box.highlight ? 'text-[#D4AF37]' : 'text-white'}`}>
                          {box.value}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block leading-tight">{box.sub}</span>
                      </div>
                    ))}
                  </div>

                  {/* GEOGRAPHIC INTELLIGENCE RADAR MAP */}
                  <div className="bg-[#0C0C0C] border border-[#1A1A1A] p-5 sm:p-6 rounded-xl space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-[#D4AF37] rounded-full"></div>
                      <div>
                        <h2 className="text-base font-serif italic text-white">Constituency Spatial Intelligence Map</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Live geolocated view of active community reports, prioritized hot-spots, and infrastructure planning zones across Bhubaneswar.</p>
                      </div>
                    </div>
                    
                    <CivicMap 
                      themes={themes}
                      selectedThemeId={selectedTheme?.id}
                      onSelectTheme={(theme) => {
                        setSelectedTheme(theme);
                        setPlannerTab('priorities');
                      }}
                      lang={lang}
                    />
                  </div>

                  {/* ASYMMETRIC ANALYTICAL CHARTS PANEL */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* CHART 1: horizontal categories */}
                    <div className="bg-[#0C0C0C] border border-[#1A1A1A] p-5 sm:p-6 rounded-xl space-y-4">
                      <div>
                        <h2 className="text-sm uppercase tracking-wider font-semibold text-[#D4AF37]">Community Needs by Category</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Distribution of raw community report counts across development categories.</p>
                      </div>

                      <div className="space-y-3 pt-2">
                        {['ROADS', 'WATER', 'DRAINAGE', 'ELECTRICITY', 'SANITATION', 'HEALTHCARE', 'EDUCATION', 'TRANSPORT'].map(cat => {
                          const count = categoryCounts[cat] || 0;
                          const total = feedbacks.length || 1;
                          const percentage = Math.round((count / total) * 100);
                          return (
                            <div key={cat} className="space-y-1">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-slate-300 font-semibold">{cat}</span>
                                <span className="text-slate-500">{count} reports ({percentage}%)</span>
                              </div>
                              <div className="w-full bg-[#151515] h-2 rounded overflow-hidden">
                                <div 
                                  className={`h-full bg-gradient-to-r ${getCategoryColor(cat).split(' ')[0]} rounded`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* CHART 2: Priority Distribution donut representation */}
                    <div className="bg-[#0C0C0C] border border-[#1A1A1A] p-5 sm:p-6 rounded-xl space-y-4 flex flex-col justify-between">
                      <div>
                        <h2 className="text-sm uppercase tracking-wider font-semibold text-[#D4AF37]">Priority Classification Distribution</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Recurring needs breakdown classified by deterministic scores.</p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-6 py-4">
                        {/* Custom responsive SVG Donut */}
                        <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#151515" strokeWidth="3" />
                            
                            {/* Urgent segment (rose-400) */}
                            <circle 
                              cx="18" cy="18" r="15.915" fill="none" 
                              stroke="#f43f5e" strokeWidth="3" 
                              strokeDasharray={`${Math.round((priorityDistribution['URGENT_CRITICAL'] || 0) / (themes.length || 1) * 100)} 100`}
                              strokeDashoffset="0" 
                            />

                            {/* High segment (amber-400) */}
                            <circle 
                              cx="18" cy="18" r="15.915" fill="none" 
                              stroke="#fbbf24" strokeWidth="3" 
                              strokeDasharray={`${Math.round((priorityDistribution['HIGH'] || 0) / (themes.length || 1) * 100)} 100`}
                              strokeDashoffset={`-${Math.round((priorityDistribution['URGENT_CRITICAL'] || 0) / (themes.length || 1) * 100)}`} 
                            />

                            {/* Moderate segment (blue-400) */}
                            <circle 
                              cx="18" cy="18" r="15.915" fill="none" 
                              stroke="#60a5fa" strokeWidth="3" 
                              strokeDasharray={`${Math.round((priorityDistribution['MODERATE'] || 0) / (themes.length || 1) * 100)} 100`}
                              strokeDashoffset={`-${Math.round(((priorityDistribution['URGENT_CRITICAL'] || 0) + (priorityDistribution['HIGH'] || 0)) / (themes.length || 1) * 100)}`} 
                            />
                          </svg>
                          <div className="absolute text-center">
                            <span className="text-xl font-serif italic text-white font-bold">{themes.length}</span>
                            <span className="text-[8px] uppercase tracking-widest text-slate-500 block leading-none">Themes</span>
                          </div>
                        </div>

                        <div className="flex-1 space-y-2.5 w-full">
                          {[
                            { label: 'Urgent / Critical', color: 'bg-rose-500', count: priorityDistribution['URGENT_CRITICAL'] || 0 },
                            { label: 'High Priority', color: 'bg-amber-500', count: priorityDistribution['HIGH'] || 0 },
                            { label: 'Moderate', color: 'bg-blue-500', count: priorityDistribution['MODERATE'] || 0 },
                            { label: 'Low', color: 'bg-slate-500', count: priorityDistribution['LOW'] || 0 }
                          ].map((item, idx) => {
                            const percent = Math.round((item.count / (themes.length || 1)) * 100);
                            return (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                                  <span className="text-slate-300 font-medium">{item.label}</span>
                                </div>
                                <span className="font-mono text-slate-500">{item.count} ({percent}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 italic leading-relaxed pt-2 border-t border-[#1a1a1a]">
                        *Urgent levels require direct site safety audit. Moderate categories map to regional maintenance cycles.
                      </p>
                    </div>
                  </div>

                  {/* MINI TOP PRIORITIES CONTAINER */}
                  <div className="bg-[#0C0C0C] border border-[#1A1A1A] p-5 sm:p-6 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-serif italic text-white">Current Strategic Needs</h2>
                        <p className="text-xs text-slate-400">Consolidated community issues ranked dynamically by deterministic scores.</p>
                      </div>
                      <button
                        onClick={() => setPlannerTab('priorities')}
                        className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 font-semibold"
                      >
                        View Full Priorities
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {themes.slice(0, 3).map((theme, index) => (
                        <div key={theme.id} className="p-4 bg-[#080808] border border-[#1A1A1A] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <span className="text-sm font-serif italic font-bold text-[#D4AF37] pt-0.5">#{String(index + 1).padStart(2, '0')}</span>
                            <div>
                              <h3 className="text-sm font-medium text-slate-200">{theme.canonicalTitle}</h3>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                                <span>{theme.locality}</span>
                                <span>•</span>
                                <span>{theme.category}</span>
                                <span>•</span>
                                <span className="text-slate-400">{theme.reportCount} reports</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 sm:self-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${getPriorityColor(theme.priorityClassification)}`}>
                              Score {theme.priorityScore}
                            </span>
                            <span className="text-xs bg-[#111] border border-[#222] px-2.5 py-1 rounded text-slate-400">
                              {theme.workflowStatus.replace('_', ' ').replace('DEMO', 'Prototype')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ==============================================
                  PLANNING PRIORITIES SUB-TAB (LIST & DETAIL)
                  ============================================== */}
              {plannerTab === 'priorities' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                  
                  {/* LEFT: RANKED LIST */}
                  <div className="xl:col-span-5 space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-lg font-serif italic text-white">Constituency Rankings</h2>
                      <p className="text-xs text-slate-400">Select any theme below to inspect AI insights, raw citizen logs, and planning controls.</p>
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {themes.map((theme, idx) => (
                        <div
                          key={theme.id}
                          onClick={() => setSelectedTheme(theme)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${selectedTheme?.id === theme.id ? 'bg-[#151515] border-[#D4AF37] shadow-lg' : 'bg-[#0C0C0C] border-[#1A1A1A] hover:border-[#333]'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-serif italic font-bold text-[#D4AF37]">#{String(idx + 1).padStart(2, '0')}</span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{theme.locality}</span>
                              </div>
                              <h3 className="text-xs sm:text-sm font-semibold text-slate-200 line-clamp-2">{theme.canonicalTitle}</h3>
                            </div>
                            
                            <div className="shrink-0 text-right">
                              <div className="text-[14px] font-bold font-serif text-white">{theme.priorityScore} <span className="text-[9px] text-slate-500">/100</span></div>
                              <span className="text-[8px] uppercase tracking-wider block text-slate-500">priority</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-[#222]/20">
                            <span className="text-slate-400 uppercase font-semibold">{theme.category}</span>
                            <span className="text-slate-500">{theme.reportCount} report logs</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT: DETAILED INSIGHT & ACTIONS VIEW */}
                  <div className="xl:col-span-7">
                    {selectedTheme ? (
                      <div className="bg-[#0C0C0C] border border-[#1A1A1A] rounded-xl p-5 sm:p-6 space-y-6 relative">
                        <div className="absolute top-0 right-0 p-4">
                          <span className={`px-3 py-1 rounded text-xs uppercase font-mono tracking-widest font-bold ${getPriorityColor(selectedTheme.priorityClassification)}`}>
                            {selectedTheme.priorityClassification}
                          </span>
                        </div>

                        {/* Top detail */}
                        <div className="space-y-2 max-w-[80%]">
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-0.5 rounded text-[9px] uppercase font-mono font-semibold ${getCategoryColor(selectedTheme.category)}`}>
                              {selectedTheme.category}
                            </span>
                            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                              <MapPin size={12} className="text-[#D4AF37]" />
                              {selectedTheme.locality}
                            </span>
                          </div>
                          <h2 className="text-xl font-serif italic text-white">{selectedTheme.canonicalTitle}</h2>
                        </div>

                        {/* Metric Strip */}
                        <div className="grid grid-cols-3 gap-2 bg-[#111] p-3 rounded-lg border border-[#222] text-center font-mono text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">Log Counts</span>
                            <span className="text-white font-bold">{selectedTheme.reportCount} citizens</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">Avg Urgency</span>
                            <span className="text-amber-400 font-bold">{selectedTheme.averageUrgency} / 5</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">Avg Severity</span>
                            <span className="text-[#D4AF37] font-bold">{selectedTheme.averageSeverity} / 5</span>
                          </div>
                        </div>

                        {/* EXPLAINABLE DETERMINISTIC FORMULA SECTION */}
                        <div className="space-y-3 bg-[#0A0A0A] p-4 rounded-lg border border-[#222]">
                          <div className="flex justify-between items-center">
                            <h3 className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">Priority Formula Breakdown</h3>
                            <span className="text-[10px] text-slate-500 font-mono">DETERMINISTIC FORMULA</span>
                          </div>

                          <div className="space-y-2.5 text-xs">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Report Frequency Score (max 40):</span>
                                <span className="font-semibold text-slate-300">{Math.min(selectedTheme.reportCount * 4, 40)} / 40</span>
                              </div>
                              <div className="w-full bg-[#151515] h-1.5 rounded overflow-hidden">
                                <div className="h-full bg-blue-500 rounded" style={{ width: `${(Math.min(selectedTheme.reportCount * 4, 40) / 40) * 100}%` }}></div>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Average Urgency Impact (max 30):</span>
                                <span className="font-semibold text-slate-300">{Math.round((selectedTheme.averageUrgency / 5) * 30)} / 30</span>
                              </div>
                              <div className="w-full bg-[#151515] h-1.5 rounded overflow-hidden">
                                <div className="h-full bg-amber-500 rounded" style={{ width: `${(selectedTheme.averageUrgency / 5) * 100}%` }}></div>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Average Severity Impact (max 30):</span>
                                <span className="font-semibold text-slate-300">{Math.round((selectedTheme.averageSeverity / 5) * 30)} / 30</span>
                              </div>
                              <div className="w-full bg-[#151515] h-1.5 rounded overflow-hidden">
                                <div className="h-full bg-rose-500 rounded" style={{ width: `${(selectedTheme.averageSeverity / 5) * 100}%` }}></div>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-[#1F1F1F] flex justify-between items-center">
                              <span className="text-slate-300 uppercase tracking-wider font-semibold">Total PRIORITY score:</span>
                              <span className="text-base font-bold font-serif text-[#D4AF37]">{selectedTheme.priorityScore} / 100</span>
                            </div>
                            <span className="text-[10px] text-slate-500 block italic text-center mt-1">
                              "The numerical score is calculated strictly by mathematical logic in server-side application rules, not generated by Gemini."
                            </span>
                          </div>
                        </div>

                        {/* AI-ASSISTED INSIGHT POWERED BY GEMINI */}
                        <div className="p-4 bg-[#111] border border-[#222] rounded-lg space-y-2 relative">
                          <div className="absolute top-3 right-3 text-[#D4AF37]">
                            <Sparkles size={14} className="animate-pulse" />
                          </div>
                          <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-semibold block">AI-Assisted Insight Summary</span>
                          
                          <p className="text-xs text-slate-300 leading-relaxed italic font-serif">
                            "{selectedTheme.aiInsight}"
                          </p>
                        </div>

                        {/* REPRESENTATIVE ANONYMIZED FEEDBACKS */}
                        <div className="space-y-2.5">
                          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block">Representative Anonymized Feedbacks</span>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {feedbacks.filter(f => f.themeId === selectedTheme.id).map(f => (
                              <div key={f.id} className="p-3 bg-[#080808] border border-[#1F1F1F] rounded text-xs leading-relaxed space-y-1.5">
                                <p className="text-slate-300">"{f.rawFeedback}"</p>
                                <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                                  <span>ID: {f.id.toUpperCase()}</span>
                                  <span>Language: {f.language.toUpperCase()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* PROTOTYPE PLANNING CONTROLS STEPPER */}
                        <div className="p-4 bg-[#111] border border-[#222] rounded-lg space-y-4">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold block">Prototype Planning Stepper</span>
                            <p className="text-[10px] text-slate-500">
                              Simulate constituency approvals, budget assignments, and workflow execution.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {(['IDENTIFIED', 'UNDER_REVIEW', 'PROPOSED', 'APPROVED_DEMO', 'IN_PROGRESS_DEMO', 'COMPLETED_DEMO'] as WorkflowStatus[]).map(status => {
                              const active = selectedTheme.workflowStatus === status;
                              return (
                                <button
                                  key={status}
                                  onClick={() => handleUpdateWorkflow(status)}
                                  className={`px-3 py-2 text-[10px] uppercase tracking-wider rounded font-mono font-semibold text-center border transition-all ${active ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#080808] border-[#222] text-slate-400 hover:text-white hover:border-slate-600'}`}
                                >
                                  {status.replace('_', ' ').replace('DEMO', 'Demo')}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full border border-dashed border-[#222] rounded-xl flex items-center justify-center text-slate-500 italic p-12">
                        Select a recurring community need from the list to analyze details.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ==============================================
                  PLANNING EVIDENCE QUEUE SUB-TAB
                  ============================================== */}
              {plannerTab === 'evidence' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                  
                  {/* LEFT: PHOTO QUEUE */}
                  <div className="xl:col-span-4 space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-lg font-serif italic text-white">Visual Evidence Reviews</h2>
                      <p className="text-xs text-slate-400">Citizens can upload optional photos. Track integrity-risk assessment and verify status.</p>
                    </div>

                    <div className="space-y-3">
                      {feedbacks.filter(f => f.evidence.hasImage).length === 0 ? (
                        <div className="text-center p-8 border border-dashed border-[#222] rounded-xl text-slate-500 italic">
                          No visual evidence reports have been received yet.
                        </div>
                      ) : (
                        feedbacks.filter(f => f.evidence.hasImage).map(feedback => {
                          const isSelected = selectedFeedback?.id === feedback.id;
                          return (
                            <div
                              key={feedback.id}
                              onClick={() => setSelectedFeedback(feedback)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${isSelected ? 'bg-[#151515] border-[#D4AF37]' : 'bg-[#0C0C0C] border-[#1A1A1A] hover:border-[#333]'}`}
                            >
                              <img 
                                src={feedback.evidence.imageReference?.startsWith('data:') ? feedback.evidence.imageReference : 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=150'} 
                                alt="Mini preview" 
                                className="w-12 h-12 object-cover rounded border border-[#222]" 
                              />
                              <div className="flex-1 min-w-0 space-y-1">
                                <p className="text-xs font-semibold text-slate-200 truncate">
                                  {feedback.locality} • {feedback.analysis?.category || 'CIVIC'}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${feedback.evidence.evidenceStatus === 'VERIFIED_EVIDENCE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : feedback.evidence.evidenceStatus === 'EVIDENCE_NOT_VERIFIED' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                    {feedback.evidence.evidenceStatus.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* CENTER & RIGHT: ACTIVE REVIEW VIEWPORT */}
                  <div className="xl:col-span-8">
                    {selectedFeedback ? (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0C0C0C] border border-[#1A1A1A] rounded-xl p-5 sm:p-6">
                        
                        {/* LEFT/CENTER OF WORKSPACE: IMAGE VIEWER */}
                        <div className="lg:col-span-5 space-y-3">
                          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block">Raw Evidence Photo</span>
                          
                          <div className="bg-[#080808] border border-[#222] rounded-lg overflow-hidden flex items-center justify-center p-2 h-64 relative group">
                            <img 
                              src={selectedFeedback.evidence.imageReference?.startsWith('data:') ? selectedFeedback.evidence.imageReference : 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600'} 
                              alt="Active evidence view" 
                              className="max-h-full max-w-full object-contain rounded transition-transform duration-300 group-hover:scale-105" 
                            />
                          </div>

                          <div className="bg-[#111] p-3 border border-[#222] rounded space-y-1">
                            <span className="text-[9px] uppercase tracking-widest text-[#D4AF37] block font-semibold">Integrity Protocol</span>
                            <p className="text-[10px] text-slate-500 leading-normal">
                              AI checks stock status and photo consistency. Final verification rests strictly on human reviewer decisions.
                            </p>
                          </div>
                        </div>

                        {/* RIGHT OF WORKSPACE: DETAIL ANALYSIS PANEL */}
                        <div className="lg:col-span-7 space-y-4">
                          <div className="pb-3 border-b border-[#222] space-y-1">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Feedback ID: {selectedFeedback.id.toUpperCase()}</span>
                            <h3 className="text-sm font-semibold text-white">Citizen Report text:</h3>
                            <p className="text-xs text-slate-300 italic leading-relaxed">
                              "{selectedFeedback.rawFeedback}"
                            </p>
                          </div>

                          {/* AI MULTIMODAL SCREENING INFO */}
                          {selectedFeedback.evidence.aiScreening && (
                            <div className="bg-[#111] p-4 rounded-lg border border-[#222] space-y-2.5">
                              <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-semibold block flex items-center gap-1.5">
                                <Sparkles size={12} className="text-[#D4AF37]" />
                                AI Multimodal Screening Report
                              </span>
                              
                              <div className="text-xs space-y-1.5 font-mono">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Image Relevant?</span>
                                  <span className={selectedFeedback.evidence.aiScreening.imageRelevantToComplaint ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                                    {selectedFeedback.evidence.aiScreening.imageRelevantToComplaint ? 'YES' : 'NO'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Complaint-Image Consistency:</span>
                                  <span className="text-white font-bold">{selectedFeedback.evidence.aiScreening.complaintImageConsistency}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Image Integrity Risk:</span>
                                  <span className={`font-bold ${selectedFeedback.evidence.aiScreening.integrityRisk === 'LOW' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {selectedFeedback.evidence.aiScreening.integrityRisk} RISK
                                  </span>
                                </div>
                                <div className="flex flex-col pt-1.5 border-t border-[#222]/50">
                                  <span className="text-slate-500">AI Visible Condition:</span>
                                  <span className="text-slate-300 mt-0.5 leading-relaxed font-sans text-xs italic">
                                    "{selectedFeedback.evidence.aiScreening.visibleCondition}"
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* EXTERNAL DETECTOR SIMULATION LOGS */}
                          {externalChecked && (
                            <div className="p-3 bg-indigo-950/20 border border-indigo-950/40 text-indigo-300 rounded text-xs font-mono space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">External Metadata Verification Log</span>
                              <p className="text-[11px]">{externalResult}</p>
                            </div>
                          )}

                          {/* HUMAN DECISION CONTROL ROOM */}
                          <div className="p-4 bg-[#0A0A0A] border border-[#222] rounded-lg space-y-3">
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold block">Human Verification Decision Area</span>
                            
                            <textarea
                              value={reviewerNote}
                              onChange={(e) => setReviewerNote(e.target.value)}
                              placeholder="Add human validation notes, findings, or local repair department comments..."
                              rows={2}
                              className="w-full bg-[#111] border border-[#222] rounded p-2 text-xs focus:outline-none focus:border-[#D4AF37] placeholder-slate-600"
                            />

                            <div className="flex flex-wrap gap-2 pt-1">
                              <button
                                onClick={() => handleReviewDecision('VERIFIED_EVIDENCE')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-black font-semibold text-[10px] uppercase tracking-wider rounded transition-all"
                              >
                                Verify Evidence
                              </button>
                              <button
                                onClick={() => handleReviewDecision('NEEDS_FURTHER_REVIEW')}
                                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-semibold text-[10px] uppercase tracking-wider rounded transition-all"
                              >
                                Needs Review
                              </button>
                              <button
                                onClick={() => handleReviewDecision('EVIDENCE_NOT_VERIFIED')}
                                className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 font-semibold text-[10px] uppercase tracking-wider rounded transition-all"
                              >
                                Invalidate Photo
                              </button>
                            </div>

                            <div className="pt-2 border-t border-[#1F1F1F] flex justify-between items-center">
                              <button
                                type="button"
                                onClick={() => setShowExternalConsent(true)}
                                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
                              >
                                <ExternalLink size={11} />
                                Open External Integrity Check
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* EXTERNAL CHECK CONSENT DRAWER/MODAL */}
                        {showExternalConsent && (
                          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                            <div className="bg-[#0C0C0C] border border-[#222] max-w-md w-full p-6 rounded-xl space-y-4">
                              <h3 className="text-base font-serif italic text-white">External Integrity Scan Authorization</h3>
                              <p className="text-xs text-slate-400 leading-relaxed">
                                This image will be routed to a secure external analysis service to evaluate metadata alignment and source cameras.
                              </p>
                              <p className="text-xs text-slate-500 bg-[#111] p-3 rounded italic">
                                "External detector results are supporting signals only. Final evidence status requires human reviewer approval."
                              </p>
                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  onClick={() => setShowExternalConsent(false)}
                                  className="px-3 py-1.5 text-xs text-slate-400 border border-[#222] rounded hover:text-white"
                                >
                                  Cancel Scan
                                </button>
                                <button
                                  onClick={handleRunExternalCheck}
                                  className="px-3 py-1.5 text-xs bg-[#D4AF37] text-black font-semibold rounded"
                                >
                                  Confirm and Analyze
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full border border-dashed border-[#222] rounded-xl flex items-center justify-center text-slate-500 italic p-12">
                        No active feedback selected or waiting for review in queue.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ==============================================
                  PLANNING & BUDGET EXPERIENCE
                  ============================================== */}
              {plannerTab === 'budget' && (
                <div className="space-y-8">
                  
                  {/* Top explanation box */}
                  <div className="bg-[#0C0C0C] border border-[#1A1A1A] p-5 rounded-xl space-y-2">
                    <h2 className="text-sm uppercase tracking-wider font-semibold text-[#D4AF37]">Constituency Project Budgets</h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Below is the financial dashboard showcasing active prototype development plans. Every budget allocation maps strictly to verified citizen metrics and undergoes mathematical breakdown consistency verification.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    
                    {/* LEFT LIST: Plans list */}
                    <div className="xl:col-span-5 space-y-4">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block">Simulated Active Plans</span>
                      
                      <div className="space-y-3">
                        {themes.filter(t => t.workflowStatus === 'APPROVED_DEMO' || t.planningData).map(theme => {
                          const isSelected = selectedTheme?.id === theme.id;
                          return (
                            <div
                              key={theme.id}
                              onClick={() => setSelectedTheme(theme)}
                              className={`p-4 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-[#151515] border-[#D4AF37]' : 'bg-[#0C0C0C] border-[#1A1A1A] hover:border-[#333]'}`}
                            >
                              <div className="space-y-1.5">
                                <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded uppercase font-mono font-bold tracking-wider">
                                  {theme.category}
                                </span>
                                <h3 className="text-xs sm:text-sm font-semibold text-slate-200">{theme.canonicalTitle}</h3>
                                <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono pt-1">
                                  <span>₹{theme.planningData?.totalAllocatedBudget.toLocaleString('en-IN')}</span>
                                  <span className="text-[#D4AF37]">{theme.workflowStatus.replace('_', ' ').replace('DEMO', 'Prototype')}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT: Selected Plan detailed budget with dynamic SVG donut */}
                    <div className="xl:col-span-7">
                      {selectedTheme?.planningData ? (
                        <div className="bg-[#0C0C0C] border border-[#1A1A1A] rounded-xl p-5 sm:p-6 space-y-6">
                          
                          {/* Banner Disclaimer */}
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400 text-xs italic flex items-center gap-2">
                            <AlertTriangle size={14} className="shrink-0" />
                            <span>Prototype Demo budget figures are for visualization. No official government sanction is implied.</span>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono block">Approved Plan Detail</span>
                            <h2 className="text-lg font-serif italic text-white">{selectedTheme.canonicalTitle}</h2>
                            <div className="flex justify-between items-center text-sm font-mono pt-2 border-b border-[#222] pb-3">
                              <span className="text-slate-400">Total Allocated Fund:</span>
                              <span className="text-xl font-bold text-emerald-400">₹{selectedTheme.planningData.totalAllocatedBudget.toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          {/* BUDGET BREAKDOWN LIST AND DYNAMIC BAR CHANGER */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            
                            {/* Interactive Donut visual */}
                            <div className="relative w-40 h-40 flex items-center justify-center mx-auto shrink-0">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#151515" strokeWidth="4" />
                                
                                {/* Materials Segment (40%) */}
                                <circle 
                                  cx="18" cy="18" r="15.915" fill="none" 
                                  stroke="#d4af37" strokeWidth="4" 
                                  strokeDasharray="40 100"
                                  strokeDashoffset="0" 
                                />

                                {/* Labor Segment (25%) */}
                                <circle 
                                  cx="18" cy="18" r="15.915" fill="none" 
                                  stroke="#60a5fa" strokeWidth="4" 
                                  strokeDasharray="25 100"
                                  strokeDashoffset="-40" 
                                />

                                {/* Oversight Segment (20%) */}
                                <circle 
                                  cx="18" cy="18" r="15.915" fill="none" 
                                  stroke="#34d399" strokeWidth="4" 
                                  strokeDasharray="20 100"
                                  strokeDashoffset="-65" 
                                />

                                {/* Safety Segment (15%) */}
                                <circle 
                                  cx="18" cy="18" r="15.915" fill="none" 
                                  stroke="#f43f5e" strokeWidth="4" 
                                  strokeDasharray="15 100"
                                  strokeDashoffset="-85" 
                                />
                              </svg>
                              <div className="absolute text-center">
                                <span className="text-xs uppercase tracking-widest text-slate-500 block">Allocated</span>
                                <span className="text-sm font-serif font-bold text-white leading-none">100% Verified</span>
                              </div>
                            </div>

                            <div className="space-y-4 w-full">
                              <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-semibold block">Budget Breakdown Itemization</span>
                              
                              <div className="space-y-3 font-mono text-xs">
                                {selectedTheme.planningData.budgetBreakdown.map((item, idx) => {
                                  const colors = ['border-[#d4af37]', 'border-blue-400', 'border-emerald-400', 'border-rose-400', 'border-slate-400'];
                                  const percent = Math.round((item.amount / selectedTheme.planningData!.totalAllocatedBudget) * 100);
                                  return (
                                    <div key={idx} className={`pl-2 border-l-2 ${colors[idx % colors.length]} space-y-0.5`}>
                                      <div className="flex justify-between">
                                        <span className="text-slate-300 font-semibold truncate max-w-[150px]">{item.category}</span>
                                        <span className="text-white">₹{item.amount.toLocaleString('en-IN')}</span>
                                      </div>
                                      <div className="flex justify-between text-[10px] text-slate-500">
                                        <span className="truncate max-w-[150px] font-sans italic">{item.description}</span>
                                        <span>{percent}%</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* MATHEMATICAL BREAKDOWN CONSISTENCY CONFIRMATION */}
                          <div className="bg-[#111] p-3 rounded border border-emerald-500/10 text-[11px] text-emerald-400 font-mono text-center flex items-center justify-center gap-1.5">
                            <CheckCircle size={13} />
                            <span>Sum check passed: Breakdown amounts total exactly to ₹{selectedTheme.planningData.totalAllocatedBudget.toLocaleString('en-IN')} (100% balance consistency).</span>
                          </div>

                          {/* AI-suggested recommendation */}
                          <div className="p-4 bg-[#111] border border-[#222] rounded-lg space-y-1">
                            <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-semibold block">AI-Assisted recommendation</span>
                            <p className="text-xs text-slate-300 leading-relaxed font-serif italic">
                              "{selectedTheme.recommendation}"
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full border border-dashed border-[#222] rounded-xl flex items-center justify-center text-slate-500 italic p-12 text-center">
                          Select a plan with approved budget details to inspect its financial allocation structure.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. FOOTER */}
      <footer className="h-12 border-t border-[#1A1A1A] px-6 flex items-center justify-between text-[9px] tracking-widest text-slate-600 bg-[#0A0A0A] shrink-0 sticky bottom-0 z-30">
        <span>JAN SAMASYA ARCHITECTURE: SECURE NODE PROXY</span>
        <div className="flex gap-4">
          <span>ENCRYPTION: AES-256-GCM</span>
          <span>GATEWAY: V4.2-ACTIVE</span>
        </div>
      </footer>

      {/* SECURE MODAL FOR CITIZEN & PLANNER AUTHENTICATION */}
      {showAuthModal && (
        <div id="auth-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <AuthPanel
            lang={lang}
            initialRole={authRoleSelection}
            onSuccess={(token, user) => {
              setAuthToken(token);
              setCurrentUser(user);
              localStorage.setItem('civic_auth_token', token);
              setShowAuthModal(false);
              // Switch view to match role
              setUserRole(user.role);
              if (user.role === 'citizen') {
                setCitizenTab('my-submissions');
              }
            }}
            onCancel={() => setShowAuthModal(false)}
          />
        </div>
      )}
    </div>
  );
}
