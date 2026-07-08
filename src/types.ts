export type InputMethod = 'SPEAK' | 'TYPE';
export type LanguageCode = 'en' | 'hi' | 'or';

export interface SafetyResult {
  isCivicFeedback: boolean;
  safetyCategory: 'VALID_CIVIC_FEEDBACK' | 'IRRELEVANT_CONTENT' | 'SPAM_OR_AUTOMATED_ABUSE' | 'ABUSIVE_CONTENT' | 'THREAT_OR_HIGH_RISK_SIGNAL' | 'PROMPT_INJECTION' | 'PRIORITY_MANIPULATION' | 'SENSITIVE_DATA_RISK';
  allowProcessing: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  containsPromptInjection: boolean;
  containsSpamSignals: boolean;
  containsThreatSignals: boolean;
  containsSensitiveData: boolean;
  requiresHumanReview: boolean;
  userMessage: string;
}

export interface CivicAnalysis {
  isValidCivicNeed: boolean;
  canonicalIssue: string;
  category: 'ROADS' | 'WATER' | 'DRAINAGE' | 'HEALTHCARE' | 'ELECTRICITY' | 'SANITATION' | 'EDUCATION' | 'TRANSPORT';
  locality: string;
  summary: string;
  urgency: number; // 1 to 5
  severity: number; // 1 to 5
  affectedGroups: string[];
  civicImpact: string;
  suggestedTheme: string;
}

export interface AIScreeningResult {
  imageRelevantToComplaint: boolean;
  visibleCondition: string;
  complaintImageConsistency: 'CONSISTENT' | 'PARTIALLY_CONSISTENT' | 'INCONSISTENT' | 'UNDETERMINED';
  locationVerifiedFromImage: boolean;
  integrityRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNDETERMINED';
  integritySignals: string[];
  requiresHumanVerification: boolean;
  analysisSummary: string;
}

export interface HumanReview {
  reviewed: boolean;
  decision: 'VERIFIED_EVIDENCE' | 'NEEDS_FURTHER_REVIEW' | 'EVIDENCE_NOT_VERIFIED' | null;
  reviewerNote: string;
  reviewedAt: string | null;
  externalCheckUsed: boolean;
  externalCheckProvider: string | null;
  externalCheckResultSummary: string | null;
}

export interface EvidenceInfo {
  hasImage: boolean;
  imageReference?: string; // base64 representation or URL
  evidenceStatus: 'NO_VISUAL_EVIDENCE' | 'PENDING_AI_SCREENING' | 'PENDING_HUMAN_VERIFICATION' | 'VERIFIED_EVIDENCE' | 'NEEDS_FURTHER_REVIEW' | 'EVIDENCE_NOT_VERIFIED';
  aiScreening?: AIScreeningResult;
  humanReview?: HumanReview;
}

export interface CivicFeedback {
  id: string;
  rawFeedback: string;
  normalizedTranscript?: string;
  inputMethod: InputMethod;
  language: LanguageCode;
  locality: string;
  analysis?: CivicAnalysis;
  themeId?: string | null;
  createdAt: string;
  processingStatus: 'PENDING_SAFETY' | 'SAFE_CIVIC' | 'REJECTED_SAFETY' | 'PENDING_MATCH' | 'MATCHED';
  safetyResult?: SafetyResult;
  duplicateRisk?: boolean;
  evidence: EvidenceInfo;
  createdBy?: string;
  createdByName?: string;
}

export interface BudgetBreakdownItem {
  category: string;
  amount: number;
  description: string;
}

export interface PlanningData {
  isDemoData: boolean;
  totalAllocatedBudget: number;
  currency: "INR";
  planningDate: string;
  expectedStartDate: string | null;
  expectedCompletionDate: string | null;
  budgetBreakdown: BudgetBreakdownItem[];
}

export type PriorityClassification = 'LOW' | 'MODERATE' | 'HIGH' | 'URGENT_CRITICAL';
export type WorkflowStatus = 'IDENTIFIED' | 'UNDER_REVIEW' | 'PROPOSED' | 'APPROVED_DEMO' | 'IN_PROGRESS_DEMO' | 'COMPLETED_DEMO';

export interface CivicTheme {
  id: string;
  canonicalTitle: string;
  category: 'ROADS' | 'WATER' | 'DRAINAGE' | 'HEALTHCARE' | 'ELECTRICITY' | 'SANITATION' | 'EDUCATION' | 'TRANSPORT';
  locality: string;
  reportCount: number;
  averageUrgency: number;
  averageSeverity: number;
  priorityScore: number; // 0 - 100
  priorityClassification: PriorityClassification;
  workflowStatus: WorkflowStatus;
  verifiedEvidenceCount: number;
  recommendation: string;
  aiInsight: string;
  createdAt: string;
  updatedAt: string;
  planningData?: PlanningData;
}

export interface User {
  id: string;
  username: string;
  role: 'citizen' | 'planner';
  displayName: string;
  createdAt: string;
}

