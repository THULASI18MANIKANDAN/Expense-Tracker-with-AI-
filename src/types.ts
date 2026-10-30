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
