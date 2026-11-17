export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  monthlyBudget: number;
  currency: string;
  photoURL?: string;
  customCategories?: string[];
  createdAt: string;

  // Custom period tracking (Custom Budget Cycle / Goal)
  customPeriodBudget?: number;
  customPeriodStartDate?: string; // YYYY-MM-DD
  customPeriodEndDate?: string;   // YYYY-MM-DD
  customPeriodEnabled?: boolean;

  // Notification preferences
  notificationSettings?: {
    notifyAt80: boolean;
    notifyAt100: boolean;
    soundAlerts: boolean;
    dailyReminders: boolean;
    weeklyEmailReports?: boolean;
  };

  // Google Chat Integration settings
  googleChatSettings?: {
    selectedSpaceName?: string;
    selectedSpaceDisplayName?: string;
    webhookUrl?: string;
    autoPostWarnings?: boolean;
    autoPostWeeklyDigest?: boolean;
  };

  // Gmail Automation & AI Report settings
  gmailSettings?: {
    connected?: boolean;
    recipientEmail?: string;
    weeklyReportsEnabled?: boolean;
    monthlyReportsEnabled?: boolean;
    lastWeeklyReportSentAt?: string;
    lastMonthlyReportSentAt?: string;
  };
}

export interface GmailReportLog {
  id?: string;
  userId: string;
  type: "weekly" | "monthly";
  sentAt: string;
  recipient: string;
  status: "success" | "failed";
  summary: string;
  totalSpent: number;
  subject?: string;
}

export interface Expense {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  category: string;
  description: string;
  amount: number;
  paymentMode: string;
  notes: string;
  createdAt: any; // Firestore Timestamp or string
}

export interface BudgetHistory {
  id?: string;
  userId: string;
  month: string; // YYYY-MM
  budget: number;
}

export interface CategoryRisk {
  category: string;
  currentSpent: number;
  projectedMonthEnd: number;
  riskLevel: "low" | "medium" | "high";
  reasoning: string;
}

export interface TrajectoryPoint {
  label: string;
  day: number;
  projectedCumulative: number;
  idealBudgetLine: number;
}

export interface SpendingProjection {
  projectedMonthEndSpend: number;
  projectedVariance: number;
  runwayStatus: "on_track" | "warning" | "critical" | "surplus";
  statusHeadline: string;
  confidenceScore: number;
  recommendedSafeDailySpend: number;
  categoryRisks: CategoryRisk[];
  projectedTrajectoryPoints: TrajectoryPoint[];
  keyDrivers: string[];
  actionableRecommendations: string[];
}

export interface SavingsGoal {
  id: string;
  userId?: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category?: string;
  targetDate?: string; // YYYY-MM-DD
  icon?: string;
  color?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}


