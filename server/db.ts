import { CivicFeedback, CivicTheme, PriorityClassification, WorkflowStatus } from '../src/types';
import crypto from 'crypto';

export interface DbUser {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  role: 'citizen' | 'planner';
  createdAt: string;
}

// Let's create an in-memory database of feedbacks, themes, and users
export let feedbacks: CivicFeedback[] = [];
export let themes: CivicTheme[] = [];
export let users: DbUser[] = [];

// Secure PBKDF2 Hashing helper
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Helper to register a user securely
export function registerUser(username: string, password: string, displayName: string, role: 'citizen' | 'planner'): DbUser {
  const normalizedUsername = username.trim().toLowerCase();
  const existing = users.find(u => u.username === normalizedUsername);
  if (existing) {
    throw new Error("Username already registered");
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const newUser: DbUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    username: normalizedUsername,
    displayName: displayName.trim(),
    passwordHash,
    salt,
    role,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  return newUser;
}


// Helper function to calculate priority score deterministically
export function calculatePriorityScore(reportCount: number, avgUrgency: number, avgSeverity: number): { score: number, classification: PriorityClassification } {
  const frequencyScore = Math.min(reportCount * 4, 40);
  const urgencyScore = (avgUrgency / 5) * 30;
  const severityScore = (avgSeverity / 5) * 30;
  const score = Math.round(frequencyScore + urgencyScore + severityScore);

  let classification: PriorityClassification = 'LOW';
  if (score >= 85) {
    classification = 'URGENT_CRITICAL';
  } else if (score >= 60) {
    classification = 'HIGH';
  } else if (score >= 30) {
    classification = 'MODERATE';
  }

  return { score, classification };
}

// Global variable to keep track of whether a real Gemini call has succeeded
export let isGeminiTestedSuccessfully = false;
export function setGeminiTestedSuccessfully(val: boolean) {
  isGeminiTestedSuccessfully = val;
}

// Function to seed initial realistic civic reports and themes
export function seedDatabase() {
  feedbacks = [];
  themes = [];
  users = [];

  // Seed default admin and citizen
  registerUser("admin", "planner-secure-2026", "Chief Planner (Bhubaneswar)", "planner");
  registerUser("citizen", "citizen-secure-2026", "Debasish Mohanty", "citizen");

  const now = new Date();
  
  // Create some historic timestamps
  const d1 = new Date(now.getTime() - 24 * 60 * 60 * 1000 * 5).toISOString(); // 5 days ago
  const d2 = new Date(now.getTime() - 24 * 60 * 60 * 1000 * 4).toISOString();
  const d3 = new Date(now.getTime() - 24 * 60 * 60 * 1000 * 3).toISOString();
  const d4 = new Date(now.getTime() - 24 * 60 * 60 * 1000 * 2).toISOString();
  const d5 = new Date(now.getTime() - 24 * 60 * 60 * 1000 * 1).toISOString(); // 1 day ago

  // 1. Seed Theme 1: Roads issue in Patia
  const theme1Id = 'theme-roads-patia';
  themes.push({
    id: theme1Id,
    canonicalTitle: 'Road repair near Patia Market',
    category: 'ROADS',
    locality: 'Patia',
    reportCount: 18,
    averageUrgency: 4.2,
    averageSeverity: 4.4,
    priorityScore: 0, // Recalculated below
    priorityClassification: 'HIGH',
    workflowStatus: 'UNDER_REVIEW',
    verifiedEvidenceCount: 5,
    recommendation: 'Conduct an immediate site-level engineering assessment of the Patia Market stretch. Check drainage sub-base blockages causing persistent water stagnation before laying asphalt. Prioritize storm water diversion to prevent asphalt peeling.',
    aiInsight: 'Citizens describe deep craters and potholes extending over 300 meters near Patia Market. Multiple reports highlight risk to school transport vehicles and local auto-rickshaws, especially during rain. The lack of proper storm water runoff is noted as the root cause of frequent road deterioration.',
    createdAt: d1,
    updatedAt: d5,
  });

  // Seed associated feedback records for Patia Roads to show multilingual support and semantic consolidation
  feedbacks.push({
    id: 'fb-patia-1',
    rawFeedback: 'The road near Patia market is full of potholes, school buses are getting stuck and it is extremely dangerous.',
    inputMethod: 'TYPE',
    language: 'en',
    locality: 'Patia',
    createdAt: d1,
    processingStatus: 'MATCHED',
    themeId: theme1Id,
    safetyResult: {
      isCivicFeedback: true,
      safetyCategory: 'VALID_CIVIC_FEEDBACK',
      allowProcessing: true,
      riskLevel: 'LOW',
      containsPromptInjection: false,
      containsSpamSignals: false,
      containsThreatSignals: false,
      containsSensitiveData: false,
      requiresHumanReview: false,
      userMessage: ''
    },
    analysis: {
      isValidCivicNeed: true,
      canonicalIssue: 'Damaged road near Patia market',
      category: 'ROADS',
      locality: 'Patia',
      summary: 'Citizen reports severe pothole damage near Patia market impacting school transport.',
      urgency: 4,
      severity: 5,
      affectedGroups: ['school children', 'commuters'],
      civicImpact: 'Road safety and transport delay',
      suggestedTheme: 'Road repair near Patia Market'
    },
    evidence: {
      hasImage: true,
      imageReference: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600&auto=format&fit=crop', // realistic pothole
      evidenceStatus: 'VERIFIED_EVIDENCE',
      aiScreening: {
        imageRelevantToComplaint: true,
        visibleCondition: 'Severe road degradation with visible deep potholes and pooling water.',
        complaintImageConsistency: 'CONSISTENT',
        locationVerifiedFromImage: false,
        integrityRisk: 'LOW',
        integritySignals: [],
        requiresHumanVerification: true,
        analysisSummary: 'The image shows substantial road damage and potholes, which is consistent with the report.'
      },
      humanReview: {
        reviewed: true,
        decision: 'VERIFIED_EVIDENCE',
        reviewerNote: 'Visual inspection confirms active road deterioration near the commercial zone.',
        reviewedAt: d2,
        externalCheckUsed: false,
        externalCheckProvider: null,
        externalCheckResultSummary: null
      }
    }
  });

  feedbacks.push({
    id: 'fb-patia-2',
    rawFeedback: 'पटिया मार्केट के पास की सड़क गड्ढों से भरी है और बहुत खराब है। स्कूल की गाड़ियां निकलने में दिक्कत होती है।',
    inputMethod: 'TYPE',
    language: 'hi',
    locality: 'Patia',
    createdAt: d2,
    processingStatus: 'MATCHED',
    themeId: theme1Id,
    safetyResult: {
      isCivicFeedback: true,
      safetyCategory: 'VALID_CIVIC_FEEDBACK',
      allowProcessing: true,
      riskLevel: 'LOW',
      containsPromptInjection: false,
      containsSpamSignals: false,
      containsThreatSignals: false,
      containsSensitiveData: false,
      requiresHumanReview: false,
      userMessage: ''
    },
    analysis: {
      isValidCivicNeed: true,
      canonicalIssue: 'Potholes on Patia market road',
      category: 'ROADS',
      locality: 'Patia',
      summary: 'Hindi feedback reporting severe damage near Patia Market causing trouble for school buses.',
      urgency: 4,
      severity: 4,
      affectedGroups: ['students', 'drivers'],
      civicImpact: 'Local transport disruption',
      suggestedTheme: 'Road repair near Patia Market'
    },
    evidence: {
      hasImage: false,
      evidenceStatus: 'NO_VISUAL_EVIDENCE'
    }
  });

  feedbacks.push({
    id: 'fb-patia-3',
    rawFeedback: 'Patia bazaar pakhare rasta bahut kharap, school bus jiba asiba re bahut kasta heuchi. Khana guda guda rasta sarasari darkar.',
    inputMethod: 'SPEAK',
    normalizedTranscript: 'Patia bazaar pakhare rasta bahut kharap, school bus jiba asiba re bahut kasta heuchi. Khana guda guda rasta sarasari darkar.',
    language: 'or', // romanized Odia
    locality: 'Patia',
    createdAt: d3,
    processingStatus: 'MATCHED',
    themeId: theme1Id,
    safetyResult: {
      isCivicFeedback: true,
      safetyCategory: 'VALID_CIVIC_FEEDBACK',
      allowProcessing: true,
      riskLevel: 'LOW',
      containsPromptInjection: false,
      containsSpamSignals: false,
      containsThreatSignals: false,
      containsSensitiveData: false,
      requiresHumanReview: false,
      userMessage: ''
    },
    analysis: {
      isValidCivicNeed: true,
      canonicalIssue: 'Broken road near Patia Bazaar',
      category: 'ROADS',
      locality: 'Patia',
      summary: 'Romanized Odia voice report highlighting severe rasta damage affecting school transport.',
      urgency: 4,
      severity: 4,
      affectedGroups: ['school buses', 'residents'],
      civicImpact: 'Mobility and safety',
      suggestedTheme: 'Road repair near Patia Market'
    },
    evidence: {
      hasImage: true,
      imageReference: 'https://images.unsplash.com/photo-11515162305285-0293e4767cc2?q=80&w=600&auto=format&fit=crop',
      evidenceStatus: 'PENDING_HUMAN_VERIFICATION',
      aiScreening: {
        imageRelevantToComplaint: true,
        visibleCondition: 'Major erosion and gravel exposing the base layer of the road.',
        complaintImageConsistency: 'CONSISTENT',
        locationVerifiedFromImage: false,
        integrityRisk: 'LOW',
        integritySignals: [],
        requiresHumanVerification: true,
        analysisSummary: 'Visual evidence is consistent with standard road-surface erosion.'
      }
    }
  });

  // Calculate Theme 1 Score dynamically
  const t1ScoreResult = calculatePriorityScore(18, 4.2, 4.4);
  const theme1 = themes.find(t => t.id === theme1Id);
  if (theme1) {
    theme1.priorityScore = t1ScoreResult.score;
    theme1.priorityClassification = t1ScoreResult.classification;
  }

  // 2. Seed EXACTLY ONE illustrative APPROVED_DEMO plan for the final budget demo.
  const approvedThemeId = 'theme-water-damana';
  themes.push({
    id: approvedThemeId,
    canonicalTitle: 'Upgrade of main water purification facility',
    category: 'WATER',
    locality: 'Damana',
    reportCount: 15,
    averageUrgency: 4.8,
    averageSeverity: 4.6,
    priorityScore: 0, // Calculated below
    priorityClassification: 'URGENT_CRITICAL',
    workflowStatus: 'APPROVED_DEMO',
    verifiedEvidenceCount: 6,
    recommendation: 'Deploy high-capacity commercial reverse osmosis and multi-filtration membranes. Expand the overhead supply grid. Maintain regular sand filtration backwash schedules and upgrade disinfection telemetry.',
    aiInsight: 'Citizens of Damana reported high turbidity and iron smell in drinking water supplied from the regional sub-station. Multiple water-borne gastrointestinal cases were highlighted by the community. A structural upgrade of the central filtering station is recommended.',
    createdAt: d1,
    updatedAt: d4,
    planningData: {
      isDemoData: true,
      totalAllocatedBudget: 1250000, // ₹12,50,000
      currency: "INR",
      planningDate: d4,
      expectedStartDate: new Date(now.getTime() + 24 * 60 * 60 * 1000 * 7).toISOString(), // next week
      expectedCompletionDate: new Date(now.getTime() + 24 * 60 * 60 * 1000 * 45).toISOString(), // 45 days
      budgetBreakdown: [
        { category: 'Water purification equipment', amount: 500000, description: 'Commercial RO system and raw water pre-filtration units.' },
        { category: 'Pipeline repair & expansion', amount: 350000, description: 'Replacing leaking high-pressure trunk joints in Damana colony.' },
        { category: 'Labour and civil works', amount: 250000, description: 'Foundation masonry, pipeline trench excavation, and installation labor.' },
        { category: 'Safety, testing & commissioning', amount: 100000, description: 'Water safety certification, baseline telemetry setup, and safety audits.' },
        { category: 'Contingency fund', amount: 50000, description: 'Reserved for unforeseen site complications or minor component cost variances.' }
      ]
    }
  });

  // Calculate Approved Theme score dynamically
  const approvedScoreResult = calculatePriorityScore(15, 4.8, 4.6);
  const appTheme = themes.find(t => t.id === approvedThemeId);
  if (appTheme) {
    appTheme.priorityScore = approvedScoreResult.score;
    appTheme.priorityClassification = approvedScoreResult.classification;
  }

  // 3. Seed other themes for other categories
  // Drainage
  const themeDrainId = 'theme-drain-central';
  themes.push({
    id: themeDrainId,
    canonicalTitle: 'Clogged drainage and broken canal cover',
    category: 'DRAINAGE',
    locality: 'Central Park Area',
    reportCount: 8,
    averageUrgency: 3.5,
    averageSeverity: 3.8,
    priorityScore: 0,
    priorityClassification: 'MODERATE',
    workflowStatus: 'UNDER_REVIEW',
    verifiedEvidenceCount: 2,
    recommendation: 'Perform cleanout of accumulated silt and polythene waste in the main feeder canal. Replace the shattered pre-cast concrete lid near Central Park west gate to prevent pediatric hazard.',
    aiInsight: 'Reports suggest heavy water stagnation after moderate rain. The main drainage pipeline is blocked by construction silt, causing wastewater to overflow onto pedestrian pavements.',
    createdAt: d2,
    updatedAt: d5,
  });
  const tDrainScore = calculatePriorityScore(8, 3.5, 3.8);
  const themeDrain = themes.find(t => t.id === themeDrainId);
  if (themeDrain) {
    themeDrain.priorityScore = tDrainScore.score;
    themeDrain.priorityClassification = tDrainScore.classification;
  }

  // Seed Sanitation
  const themeSanId = 'theme-sanitation-bazaar';
  themes.push({
    id: themeSanId,
    canonicalTitle: 'Unmanaged garbage dump near Daily Bazaar',
    category: 'SANITATION',
    locality: 'Daily Bazaar',
    reportCount: 12,
    averageUrgency: 3.2,
    averageSeverity: 3.6,
    priorityScore: 0,
    priorityClassification: 'MODERATE',
    workflowStatus: 'IDENTIFIED',
    verifiedEvidenceCount: 1,
    recommendation: 'Install solid municipal waste disposal bins, schedule daily dumper-placer truck visits during non-peak retail hours, and establish localized bio-waste composters for green market residue.',
    aiInsight: 'Open piling of organic bazaar waste attracts stray animals, blocking local market paths and creating high health and safety concerns for vendors and consumers.',
    createdAt: d3,
    updatedAt: d5,
  });
  const tSanScore = calculatePriorityScore(12, 3.2, 3.6);
  const themeSan = themes.find(t => t.id === themeSanId);
  if (themeSan) {
    themeSan.priorityScore = tSanScore.score;
    themeSan.priorityClassification = tSanScore.classification;
  }

  // Seed Electricity
  const themeElecId = 'theme-electricity-vihar';
  themes.push({
    id: themeElecId,
    canonicalTitle: 'Hanging high-tension wires and transformer sparks',
    category: 'ELECTRICITY',
    locality: 'Niladri Vihar',
    reportCount: 9,
    averageUrgency: 4.5,
    averageSeverity: 4.8,
    priorityScore: 0,
    priorityClassification: 'HIGH',
    workflowStatus: 'PROPOSED',
    verifiedEvidenceCount: 3,
    recommendation: 'Conduct emergency tree-trimming around overhead HT wires. Re-tension loose service cables and service the transformer insulation core to resolve regular voltage surges.',
    aiInsight: 'Hanging electrical lines are dangerously close to trees and metal balconies in residential alleys. Local transformers spark during humid spells, causing voltage surges and blackouts.',
    createdAt: d1,
    updatedAt: d4,
  });
  const tElecScore = calculatePriorityScore(9, 4.5, 4.8);
  const themeElec = themes.find(t => t.id === themeElecId);
  if (themeElec) {
    themeElec.priorityScore = tElecScore.score;
    themeElec.priorityClassification = tElecScore.classification;
  }

  // Let's create realistic feedbacks supporting these other themes so the feedback tables are rich!
  feedbacks.push({
    id: 'fb-drain-1',
    rawFeedback: 'Water is accumulating outside the park due to clogged drains. Concrete lid is broken, anyone could fall in.',
    inputMethod: 'TYPE',
    language: 'en',
    locality: 'Central Park Area',
    createdAt: d2,
    processingStatus: 'MATCHED',
    themeId: themeDrainId,
    safetyResult: {
      isCivicFeedback: true,
      safetyCategory: 'VALID_CIVIC_FEEDBACK',
      allowProcessing: true,
      riskLevel: 'LOW',
      containsPromptInjection: false,
      containsSpamSignals: false,
      containsThreatSignals: false,
      containsSensitiveData: false,
      requiresHumanReview: false,
      userMessage: ''
    },
    analysis: {
      isValidCivicNeed: true,
      canonicalIssue: 'Broken concrete drain lid',
      category: 'DRAINAGE',
      locality: 'Central Park Area',
      summary: 'Stagnated water and hazardous broken drainage lid near Central Park.',
      urgency: 4,
      severity: 3,
      affectedGroups: ['pedestrians', 'children'],
      civicImpact: 'Safety hazard and water stagnation',
      suggestedTheme: 'Clogged drainage and broken canal cover'
    },
    evidence: {
      hasImage: true,
      imageReference: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=600&auto=format&fit=crop', // realistic drain/concrete
      evidenceStatus: 'VERIFIED_EVIDENCE',
      aiScreening: {
        imageRelevantToComplaint: true,
        visibleCondition: 'Open sewer line with fragmented concrete slab block.',
        complaintImageConsistency: 'CONSISTENT',
        locationVerifiedFromImage: false,
        integrityRisk: 'LOW',
        integritySignals: [],
        requiresHumanVerification: true,
        analysisSummary: 'The image shows an open hazard which aligns with the text description.'
      },
      humanReview: {
        reviewed: true,
        decision: 'VERIFIED_EVIDENCE',
        reviewerNote: 'Concrete slab is broken and dangerous. Approved.',
        reviewedAt: d3,
        externalCheckUsed: false,
        externalCheckProvider: null,
        externalCheckResultSummary: null
      }
    }
  });

  feedbacks.push({
    id: 'fb-elec-1',
    rawFeedback: 'Niladri vihar pakhare high tension tar jhuliki achi, transformer re nian bahuruchi barabar. Danger zone rasta re.',
    inputMethod: 'TYPE',
    language: 'or',
    locality: 'Niladri Vihar',
    createdAt: d2,
    processingStatus: 'MATCHED',
    themeId: themeElecId,
    safetyResult: {
      isCivicFeedback: true,
      safetyCategory: 'VALID_CIVIC_FEEDBACK',
      allowProcessing: true,
      riskLevel: 'LOW',
      containsPromptInjection: false,
      containsSpamSignals: false,
      containsThreatSignals: false,
      containsSensitiveData: false,
      requiresHumanReview: false,
      userMessage: ''
    },
    analysis: {
      isValidCivicNeed: true,
      canonicalIssue: 'Hanging HT wires Niladri Vihar',
      category: 'ELECTRICITY',
      locality: 'Niladri Vihar',
      summary: 'Dangerous high tension cables sparking and hanging low over residential streets.',
      urgency: 5,
      severity: 5,
      affectedGroups: ['Niladri Vihar residents'],
      civicImpact: 'Extremely high risk of electrocution',
      suggestedTheme: 'Hanging high-tension wires and transformer sparks'
    },
    evidence: {
      hasImage: false,
      evidenceStatus: 'NO_VISUAL_EVIDENCE'
    }
  });
}

// Automatically seed on import
seedDatabase();
