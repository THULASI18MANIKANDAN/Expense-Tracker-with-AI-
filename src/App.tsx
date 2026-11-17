import React, { useState, useEffect, useMemo } from "react";
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { 
  collection, 
  query as fsQuery, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  serverTimestamp 
} from "firebase/firestore";
import { auth, db, stripUndefined } from "./lib/firebase";
import { setGmailAccessToken } from "./lib/gmail";
import { UserProfile, Expense } from "./types";
import AuthScreen from "./components/AuthScreen";
import ExpenseModal from "./components/ExpenseModal";
import AIChatAssistant from "./components/AIChatAssistant";
import ThalaivarPopup from "./components/ThalaivarPopup";
import SpendingProjectionCard from "./components/SpendingProjectionCard";
import SavingsGoalsCard from "./components/SavingsGoalsCard";
import ReceiptScannerModal from "./components/ReceiptScannerModal";
import GmailReportsModal from "./components/GmailReportsModal";
import GmailReportsCard from "./components/GmailReportsCard";
import { 
  exportToExcel, 
  exportToPDF, 
  exportToCSV, 
  parseImportFile 
} from "./lib/reports";
import { 
  TrendingUp, 
  DollarSign, 
  Plus, 
  Download, 
  Upload, 
  Sparkles, 
  ScanLine,
  Camera, 
  Mail,
  User, 
  LogOut, 
  PieChart as PieIcon, 
  Calendar, 
  CreditCard, 
  Filter, 
  Search, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  Moon, 
  Sun, 
  X,
  FileSpreadsheet,
  Globe,
  Wallet2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  CalendarDays,
  Receipt,
  Bot,
  MessageSquare,
  Activity,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  Layers,
  Flame,
  CheckCircle2,
  ShieldCheck,
  Check
} from "lucide-react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area 
} from "recharts";
import { motion, AnimatePresence } from "motion/react";

const PALETTE = [
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#6366f1", // Indigo
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#64748b"  // Slate
];

// Rich, elegant color mapping for transaction categories
export const getCategoryStyle = (category: string) => {
  const cat = (category || "").trim();
  switch (cat) {
    case "Food":
      return { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-300", dot: "bg-amber-400", hex: "#f59e0b" };
    case "PG":
      return { bg: "bg-indigo-500/15", border: "border-indigo-500/30", text: "text-indigo-300", dot: "bg-indigo-400", hex: "#6366f1" };
    case "Travel":
      return { bg: "bg-cyan-500/15", border: "border-cyan-500/30", text: "text-cyan-300", dot: "bg-cyan-400", hex: "#06b6d4" };
    case "Auto":
      return { bg: "bg-sky-500/15", border: "border-sky-500/30", text: "text-sky-300", dot: "bg-sky-400", hex: "#0ea5e9" };
    case "Cab":
      return { bg: "bg-teal-500/15", border: "border-teal-500/30", text: "text-teal-300", dot: "bg-teal-400", hex: "#14b8a6" };
    case "Tea":
      return { bg: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-300", dot: "bg-orange-400", hex: "#f97316" };
    case "Shopping":
      return { bg: "bg-rose-500/15", border: "border-rose-500/30", text: "text-rose-300", dot: "bg-rose-400", hex: "#f43f5e" };
    case "Medicine":
      return { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-300", dot: "bg-emerald-400", hex: "#10b981" };
    case "Fuel":
      return { bg: "bg-yellow-500/15", border: "border-yellow-500/30", text: "text-yellow-300", dot: "bg-yellow-400", hex: "#eab308" };
    case "Entertainment":
      return { bg: "bg-fuchsia-500/15", border: "border-fuchsia-500/30", text: "text-fuchsia-300", dot: "bg-fuchsia-400", hex: "#d946ef" };
    case "Bills":
      return { bg: "bg-purple-500/15", border: "border-purple-500/30", text: "text-purple-300", dot: "bg-purple-400", hex: "#a855f7" };
    case "Miscellaneous":
      return { bg: "bg-slate-500/15", border: "border-slate-500/30", text: "text-slate-300", dot: "bg-slate-400", hex: "#64748b" };
    default: {
      const colors = [
        { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-300", dot: "bg-blue-400", hex: "#3b82f6" },
        { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-300", dot: "bg-emerald-400", hex: "#10b981" },
        { bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-300", dot: "bg-violet-400", hex: "#8b5cf6" },
        { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-300", dot: "bg-amber-400", hex: "#f59e0b" },
        { bg: "bg-pink-500/15", border: "border-pink-500/30", text: "text-pink-300", dot: "bg-pink-400", hex: "#ec4899" }
      ];
      let hash = 0;
      for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
      return colors[Math.abs(hash) % colors.length];
    }
  }
};

// Color mapping for payment channels
export const getPaymentStyle = (mode: string) => {
  switch (mode) {
    case "UPI":
      return { bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-300" };
    case "Credit Card":
      return { bg: "bg-sky-500/15", border: "border-sky-500/30", text: "text-sky-300" };
    case "Debit Card":
      return { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-300" };
    case "Net Banking":
      return { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-300" };
    case "Cash":
    default:
      return { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-300" };
  }
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Active View Tab Switcher: "overview" | "analytics" | "calendar" | "transactions"
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "calendar" | "transactions">("overview");

  // Filter States
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Modals & Panels
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
  const [gmailInitialReportType, setGmailInitialReportType] = useState<"weekly" | "monthly" | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Dark Mode (Obsidian default)
  const [darkMode, setDarkMode] = useState(true);

  // Notifications Toast
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "warning" | "info";
  } | null>(null);

  // Profile Edit fields
  const [profileName, setProfileName] = useState("");
  const [profileBudget, setProfileBudget] = useState("15000");
  const [profileCurrency, setProfileCurrency] = useState("₹");

  // Custom period states
  const [customPeriodBudget, setCustomPeriodBudget] = useState("15000");
  const [customPeriodStartDate, setCustomPeriodStartDate] = useState("2026-06-23");
  const [customPeriodEndDate, setCustomPeriodEndDate] = useState("2026-07-23");
  const [customPeriodEnabled, setCustomPeriodEnabled] = useState(false);
  const [isEditingCustomCycle, setIsEditingCustomCycle] = useState(false);

  // Notification states
  const [notifyAt80, setNotifyAt80] = useState(true);
  const [notifyAt100, setNotifyAt100] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [dailyReminders, setDailyReminders] = useState(false);
  const [weeklyEmailReports, setWeeklyEmailReports] = useState(false);

  // Google Chat Integration States
  const [googleChatToken, setGoogleChatToken] = useState<string | null>(null);
  const [chatSpaces, setChatSpaces] = useState<any[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>("");
  const [selectedSpaceDisplay, setSelectedSpaceDisplay] = useState<string>("");
  const [chatWebhookUrl, setChatWebhookUrl] = useState<string>("");
  const [chatAutoPostWarnings, setChatAutoPostWarnings] = useState(false);
  const [chatAutoPostWeekly, setChatAutoPostWeekly] = useState(false);
  const [chatLoadingSpaces, setChatLoadingSpaces] = useState(false);

  // Selected Month details panel (Monthly spend drill-down)
  const [selectedMonthDetails, setSelectedMonthDetails] = useState<string | null>(null);

  // Superstar Rajini Thalaivar Punch popup states
  const [thalaivarExpense, setThalaivarExpense] = useState<{
    amount: number;
    category: string;
    description?: string;
  } | null>(null);
  const [isThalaivarPopupOpen, setIsThalaivarPopupOpen] = useState(false);

  // Delete transaction confirmation state
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);

  // Inline Active Monthly Budget block editing
  const [isEditingActiveBudgetBlock, setIsEditingActiveBudgetBlock] = useState(false);
  const [activeBudgetLimitInput, setActiveBudgetLimitInput] = useState("");
  const [activeBudgetStartInput, setActiveBudgetStartInput] = useState("");
  const [activeBudgetEndInput, setActiveBudgetEndInput] = useState("");
  const [activeBudgetUseCustomInput, setActiveBudgetUseCustomInput] = useState(false);

  // Comparison tool states (A vs B)
  const [compStartA, setCompStartA] = useState("");
  const [compEndA, setCompEndA] = useState("");
  const [compStartB, setCompStartB] = useState("");
  const [compEndB, setCompEndB] = useState("");

  // Calendar Dashboard States
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const date = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${date}`;
  });

  // Track Auth State changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setGmailAccessToken(null);
        setGoogleChatToken(null);
        setProfile(null);
        setExpenses([]);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Fetch Firestore Profile & Expenses on login
  useEffect(() => {
    if (!user) return;

    // Listen to profile doc
    const profileRef = doc(db, "users", user.uid);
    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setProfileName(data.name || "");
        setProfileBudget(data.monthlyBudget?.toString() || "15000");
        setProfileCurrency(data.currency || "₹");
        
        setCustomPeriodBudget(data.customPeriodBudget?.toString() || "15000");
        setCustomPeriodStartDate(data.customPeriodStartDate || "2026-06-23");
        setCustomPeriodEndDate(data.customPeriodEndDate || "2026-07-23");
        setCustomPeriodEnabled(!!data.customPeriodEnabled);

        const notif = data.notificationSettings || {
          notifyAt80: true,
          notifyAt100: true,
          soundAlerts: true,
          dailyReminders: false,
          weeklyEmailReports: false
        };
        setNotifyAt80(!!notif.notifyAt80);
        setNotifyAt100(!!notif.notifyAt100);
        setSoundAlerts(!!notif.soundAlerts);
        setDailyReminders(!!notif.dailyReminders);
        setWeeklyEmailReports(!!notif.weeklyEmailReports);

        const gchat = data.googleChatSettings || {
          selectedSpaceName: "",
          selectedSpaceDisplayName: "",
          webhookUrl: "",
          autoPostWarnings: false,
          autoPostWeeklyDigest: false
        };
        setSelectedSpace(gchat.selectedSpaceName || "");
        setSelectedSpaceDisplay(gchat.selectedSpaceDisplayName || "");
        setChatWebhookUrl(gchat.webhookUrl || "");
        setChatAutoPostWarnings(!!gchat.autoPostWarnings);
        setChatAutoPostWeekly(!!gchat.autoPostWeeklyDigest);
      } else {
        const newProfile: UserProfile = {
          uid: user.uid,
          name: user.displayName || "User",
          email: user.email || "",
          monthlyBudget: 15000,
          currency: "₹",
          customCategories: [],
          createdAt: new Date().toISOString(),
          customPeriodEnabled: false,
          customPeriodBudget: 15000,
          customPeriodStartDate: "2026-06-23",
          customPeriodEndDate: "2026-07-23",
          notificationSettings: {
            notifyAt80: true,
            notifyAt100: true,
            soundAlerts: true,
            dailyReminders: false,
            weeklyEmailReports: false
          },
          googleChatSettings: {
            selectedSpaceName: "",
            selectedSpaceDisplayName: "",
            webhookUrl: "",
            autoPostWarnings: false,
            autoPostWeeklyDigest: false
          }
        };
        setDoc(profileRef, stripUndefined(newProfile), { merge: true }).catch((err) => {
          console.error("Failed to initialize user profile:", err);
        });
        setProfile(newProfile);
      }
    }, (error) => {
      console.error("Error listening to user profile:", error);
      setLoading(false);
    });

    // Listen to real-time expenses
    const expensesRef = collection(db, "expenses");
    const q = fsQuery(expensesRef, where("userId", "==", user.uid));
    const unsubscribeExpenses = onSnapshot(q, (querySnapshot) => {
      const list: Expense[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Expense);
      });
      list.sort((a, b) => b.date.localeCompare(a.date));
      setExpenses(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching expenses: ", error);
      showNotification("Failed to synchronise data with Cloud Storage.", "warning");
      setLoading(false);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeExpenses();
    };
  }, [user]);

  // Audio Chime synthesizer using Web Audio API
  const playNotificationSound = (type: "warning" | "success" | "info") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === "warning") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn("Audio chime context failed: ", e);
    }
  };

  // Toast notifier
  const showNotification = (message: string, type: "success" | "warning" | "info") => {
    setNotification({ message, type });
    if (type === "success" && (!profile || profile.notificationSettings?.soundAlerts !== false)) {
      playNotificationSound("success");
    } else if (type === "warning" && (!profile || profile.notificationSettings?.soundAlerts !== false)) {
      playNotificationSound("warning");
    }
    setTimeout(() => {
      setNotification(null);
    }, 5500);
  };

  // Logout
  const handleLogout = async () => {
    try {
      setGmailAccessToken(null);
      setGoogleChatToken(null);
      await signOut(auth);
      showNotification("Signed out successfully", "info");
    } catch (err) {
      console.error(err);
    }
  };

  // Add / Edit expense handler
  const handleSaveExpense = async (expenseData: any) => {
    if (!user) return;
    try {
      if (expenseToEdit && expenseToEdit.id) {
        const docRef = doc(db, "expenses", expenseToEdit.id);
        await updateDoc(docRef, expenseData);
        showNotification("Transaction updated successfully", "success");
      } else {
        const collRef = collection(db, "expenses");
        await addDoc(collRef, {
          userId: user.uid,
          createdAt: serverTimestamp(),
          ...expenseData
        });
        showNotification("Transaction recorded successfully", "success");
      }
      setExpenseToEdit(null);

      // Trigger Superstar Rajinikanth punch dialogue popup!
      setThalaivarExpense({
        amount: Number(expenseData.amount) || 0,
        category: expenseData.category || "Expense",
        description: expenseData.description || ""
      });
      setIsThalaivarPopupOpen(true);
    } catch (err: any) {
      console.error(err);
      showNotification("Error saving transaction: " + err.message, "warning");
    }
  };

  // Delete transaction flow (in-app modal to avoid iframe window.confirm blocking)
  const requestDeleteExpense = (exp: Expense) => {
    setExpenseToDelete(exp);
  };

  const executeDeleteExpense = async (id: string) => {
    setIsDeletingRecord(true);
    try {
      // Optimistic update so UI reflects deletion instantly
      setExpenses((prev) => prev.filter((item) => item.id !== id));
      await deleteDoc(doc(db, "expenses", id));
      showNotification("Transaction record removed successfully", "success");
      setExpenseToDelete(null);
    } catch (err: any) {
      console.error("Delete expense error:", err);
      showNotification("Error deleting transaction: " + (err.message || "Failed to delete record"), "warning");
    } finally {
      setIsDeletingRecord(false);
    }
  };

  // Backwards-compatible alias that opens delete modal if item found, or deletes directly
  const handleDeleteExpense = async (id: string) => {
    const target = expenses.find((e) => e.id === id);
    if (target) {
      requestDeleteExpense(target);
    } else {
      await executeDeleteExpense(id);
    }
  };

  // Add custom category
  const handleAddCustomCategory = async (newCategory: string) => {
    if (!user || !profile) return;
    const updatedCustoms = [...(profile.customCategories || [])];
    if (!updatedCustoms.includes(newCategory)) {
      updatedCustoms.push(newCategory);
      try {
        await updateDoc(doc(db, "users", user.uid), {
          customCategories: updatedCustoms
        });
        showNotification(`Category "${newCategory}" added!`, "success");
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Connect Google Chat
  const handleConnectGoogleChat = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      provider.addScope("https://www.googleapis.com/auth/chat.spaces");
      provider.addScope("https://www.googleapis.com/auth/chat.spaces.readonly");
      provider.addScope("https://www.googleapis.com/auth/chat.messages");
      provider.addScope("https://www.googleapis.com/auth/chat.messages.create");
      provider.addScope("https://www.googleapis.com/auth/chat.memberships.readonly");

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleChatToken(credential.accessToken);
        showNotification("Google Chat connected successfully!", "success");
        await fetchGoogleChatSpaces(credential.accessToken);
      } else {
        throw new Error("Unable to retrieve OAuth token.");
      }
    } catch (err: any) {
      console.error(err);
      showNotification("Failed to connect Google Chat: " + (err.message || err), "warning");
    }
  };

  const fetchGoogleChatSpaces = async (token: string) => {
    setChatLoadingSpaces(true);
    try {
      const res = await fetch("https://chat.googleapis.com/v1/spaces", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Chat API error: ${res.status} - ${errText}`);
      }
      const data = await res.json();
      const spaces = data.spaces || [];
      setChatSpaces(spaces);
      if (spaces.length > 0 && !selectedSpace) {
        setSelectedSpace(spaces[0].name);
        setSelectedSpaceDisplay(spaces[0].displayName || spaces[0].name);
      }
    } catch (err: any) {
      console.error("Error fetching spaces:", err);
      showNotification("Could not fetch spaces: " + err.message, "warning");
    } finally {
      setChatLoadingSpaces(false);
    }
  };

  const sendGoogleChatMessage = async (text: string, spaceOverride?: string) => {
    if (chatWebhookUrl) {
      try {
        const res = await fetch(chatWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        });
        if (!res.ok) throw new Error(`Webhook error: ${res.status}`);
        showNotification("Message delivered to Google Chat via Webhook", "success");
        return true;
      } catch (err: any) {
        console.error(err);
        showNotification("Webhook failed: " + err.message, "warning");
        return false;
      }
    }

    const token = googleChatToken;
    const targetSpace = spaceOverride || selectedSpace;
    if (!token || !targetSpace) {
      showNotification("Please configure Google Chat webhook or connect spaces", "warning");
      return false;
    }

    try {
      const res = await fetch(`https://chat.googleapis.com/v1/${targetSpace}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text })
      });
      if (!res.ok) throw new Error(`Chat message error: ${res.status}`);
      showNotification("Message sent to Google Chat space", "success");
      return true;
    } catch (err: any) {
      console.error(err);
      showNotification("Message error: " + err.message, "warning");
      return false;
    }
  };

  const requestPushPermission = async () => {
    if (!("Notification" in window)) {
      showNotification("Push notifications are not supported in this browser.", "warning");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        showNotification("Push alert permissions enabled!", "success");
      } else {
        showNotification("Notification permission dismissed.", "warning");
      }
    } catch (e: any) {
      showNotification("Notification prompt blocked.", "warning");
    }
  };

  // Save Profile Preferences
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: profileName,
        monthlyBudget: Number(profileBudget) || 0,
        currency: profileCurrency,
        customPeriodEnabled: customPeriodEnabled,
        customPeriodBudget: Number(customPeriodBudget) || 0,
        customPeriodStartDate: customPeriodStartDate,
        customPeriodEndDate: customPeriodEndDate,
        notificationSettings: {
          notifyAt80,
          notifyAt100,
          soundAlerts,
          dailyReminders,
          weeklyEmailReports
        },
        googleChatSettings: {
          selectedSpaceName: selectedSpace,
          selectedSpaceDisplayName: selectedSpaceDisplay,
          webhookUrl: chatWebhookUrl,
          autoPostWarnings: chatAutoPostWarnings,
          autoPostWeeklyDigest: chatAutoPostWeekly
        }
      });
      setIsProfileOpen(false);
      showNotification("Profile & tracker settings saved!", "success");
    } catch (err: any) {
      console.error(err);
      showNotification("Failed to update profile: " + err.message, "warning");
    }
  };

  // Update Gmail automation preferences in Firestore
  const handleUpdateGmailSettings = async (settings: {
    connected: boolean;
    recipientEmail: string;
    weeklyReportsEnabled: boolean;
    monthlyReportsEnabled: boolean;
    lastWeeklyReportSentAt?: string;
    lastMonthlyReportSentAt?: string;
  }) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      const updatedGmailSettings = stripUndefined({
        ...(profile?.gmailSettings || {}),
        ...settings,
      });
      await setDoc(
        userDocRef,
        {
          gmailSettings: updatedGmailSettings,
        },
        { merge: true }
      );
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              gmailSettings: updatedGmailSettings,
            }
          : null
      );
    } catch (err: any) {
      console.error("Failed to update Gmail settings in Firestore:", err);
      throw err;
    }
  };

  const handleTriggerQuickSend = (type: "weekly" | "monthly") => {
    setGmailInitialReportType(type);
    setIsGmailModalOpen(true);
  };

  // Inline Active Budget Save
  const handleSaveActiveBudgetInline = async (limit: string, useCustom: boolean, start: string, end: string) => {
    if (!user) return;
    try {
      const budgetNum = Number(limit) || 0;
      await updateDoc(doc(db, "users", user.uid), {
        monthlyBudget: budgetNum,
        customPeriodEnabled: useCustom,
        customPeriodStartDate: start,
        customPeriodEndDate: end,
        customPeriodBudget: budgetNum
      });
      setIsEditingActiveBudgetBlock(false);
      showNotification("Monthly budget & cycle dates updated successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showNotification("Failed to update budget settings: " + err.message, "warning");
    }
  };

  // File import
  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const parsedExpenses = await parseImportFile(file);
      if (parsedExpenses.length === 0) {
        showNotification("No valid records found in the uploaded file.", "info");
        return;
      }
      const collRef = collection(db, "expenses");
      let count = 0;
      for (const item of parsedExpenses) {
        await addDoc(collRef, {
          userId: user.uid,
          createdAt: serverTimestamp(),
          ...item
        });
        count++;
      }
      showNotification(`Imported ${count} expenses into your ledger!`, "success");
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || "Failed to import expenses.", "warning");
    } finally {
      e.target.value = "";
    }
  };

  // Currency & Budget Variables
  const currencySymbol = profile?.currency || "₹";
  const activeBudget = profile?.monthlyBudget || 15000;
  const isCustomCycleActive = !!profile?.customPeriodEnabled;
  const customCycleBudget = profile?.customPeriodBudget || 15000;
  const customCycleStart = profile?.customPeriodStartDate || "2026-06-23";
  const customCycleEnd = profile?.customPeriodEndDate || "2026-07-23";

  // Calculate day-by-day mapping for calendar
  const expensesByDate = useMemo(() => {
    const map: Record<string, Expense[]> = {};
    expenses.forEach((exp) => {
      if (!map[exp.date]) map[exp.date] = [];
      map[exp.date].push(exp);
    });
    return map;
  }, [expenses]);

  // Calendar cells generator (42 cells standard matrix)
  const calendarCells = useMemo(() => {
    const cells = [];
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(calendarYear, calendarMonth, 0).getDate();

    for (let i = firstDay - 1; i >= 0; i--) {
      const prevDay = prevMonthTotalDays - i;
      const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
      const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(prevDay).padStart(2, "0")}`;
      cells.push({ day: prevDay, isCurrentMonth: false, dateStr });
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ day, isCurrentMonth: true, dateStr });
    }

    const remaining = 42 - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
      const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ day, isCurrentMonth: false, dateStr });
    }

    return cells;
  }, [calendarYear, calendarMonth]);

  // Dynamic daily spending intensity classification:
  // Low (Green) vs Average (Orange) vs Spends More (Red)
  const getDaySpendingTier = (dayTotal: number): "low" | "average" | "high" | null => {
    if (dayTotal <= 0) return null;
    const dailyBudget = activeBudget > 0 ? (activeBudget / 30) : 500;
    const lowThreshold = Math.max(100, Math.round(dailyBudget * 0.4)); // e.g. ₹200 for ₹15,000 budget
    const avgThreshold = Math.max(250, Math.round(dailyBudget * 1.0)); // e.g. ₹500 for ₹15,000 budget

    if (dayTotal > avgThreshold) {
      return "high"; // Spends more -> Red
    }
    if (dayTotal >= lowThreshold) {
      return "average"; // Average -> Orange
    }
    return "low"; // Low spendings -> Green
  };

  // Filtered dataset
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch = 
        e.description.toLowerCase().includes(search.toLowerCase()) || 
        e.category.toLowerCase().includes(search.toLowerCase()) || 
        (e.notes || "").toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = categoryFilter === "All" || e.category === categoryFilter;
      const matchesPayment = paymentFilter === "All" || e.paymentMode === paymentFilter;

      const amt = e.amount;
      const matchesMinAmount = minAmount === "" || amt >= parseFloat(minAmount);
      const matchesMaxAmount = maxAmount === "" || amt <= parseFloat(maxAmount);

      const expenseDate = new Date(e.date);
      const yearStr = expenseDate.getFullYear().toString();
      const monthStr = (expenseDate.getMonth() + 1).toString().padStart(2, "0");

      const matchesYear = yearFilter === "All" || yearStr === yearFilter;
      const matchesMonth = monthFilter === "All" || monthStr === monthFilter;

      const matchesStartDate = startDateFilter === "" || e.date >= startDateFilter;
      const matchesEndDate = endDateFilter === "" || e.date <= endDateFilter;

      return matchesSearch && matchesCategory && matchesPayment && matchesMinAmount && matchesMaxAmount && matchesYear && matchesMonth && matchesStartDate && matchesEndDate;
    });
  }, [expenses, search, categoryFilter, paymentFilter, minAmount, maxAmount, yearFilter, monthFilter, startDateFilter, endDateFilter]);

  // Aggregated Stats
  const totalSpentFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const highestExpense = filteredExpenses.length > 0 ? Math.max(...filteredExpenses.map(e => e.amount)) : 0;
  const averageDailySpent = filteredExpenses.length > 0 ? (totalSpentFiltered / filteredExpenses.length) : 0;

  // Monthly statistics
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(e => e.date.substring(0, 7) === currentMonthStr);
  }, [expenses, currentMonthStr]);

  const totalSpentCurrentMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = Math.max(0, activeBudget - totalSpentCurrentMonth);
  const monthProgressPct = activeBudget > 0 ? (totalSpentCurrentMonth / activeBudget) * 100 : 0;

  // Custom cycle computations
  const customCycleExpenses = useMemo(() => {
    return expenses.filter(e => e.date >= customCycleStart && e.date <= customCycleEnd);
  }, [expenses, customCycleStart, customCycleEnd]);
  const customCycleSpent = customCycleExpenses.reduce((sum, e) => sum + e.amount, 0);
  const customCycleRemaining = Math.max(0, customCycleBudget - customCycleSpent);
  const customCycleProgress = customCycleBudget > 0 ? (customCycleSpent / customCycleBudget) * 100 : 0;

  const getDaysRemaining = (endStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endStr);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  // Safe daily allowance
  const daysLeftInMonth = (() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(1, lastDay - now.getDate());
  })();

  const activeDaysRemaining = isCustomCycleActive ? getDaysRemaining(customCycleEnd) : daysLeftInMonth;
  const activeRemainingBalance = isCustomCycleActive ? customCycleRemaining : remainingBudget;
  const safeDailySpend = activeDaysRemaining > 0 ? (activeRemainingBalance / activeDaysRemaining) : 0;

  // Today & weekly spent
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const date = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${date}`;
  };
  const todayStr = getLocalDateString(new Date());
  const todaySpent = expenses.filter(e => e.date === todayStr).reduce((sum, e) => sum + e.amount, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklySpent = expenses
    .filter(e => e.date >= getLocalDateString(sevenDaysAgo) && e.date <= todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  // Category Chart Data
  const categoryChartData = useMemo(() => {
    const raw = filteredExpenses.reduce((acc: Record<string, number>, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});
    return Object.entries(raw).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  // Trend Chart Data
  const trendChartData = useMemo(() => {
    const raw = filteredExpenses.reduce((acc: Record<string, number>, e) => {
      acc[e.date] = (acc[e.date] || 0) + e.amount;
      return acc;
    }, {});
    return Object.entries(raw)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredExpenses]);

  // Monthly Bar Chart Data
  const monthlyBarData = useMemo(() => {
    const raw = expenses.reduce((acc: Record<string, number>, e) => {
      const monthYear = e.date.substring(0, 7);
      acc[monthYear] = (acc[monthYear] || 0) + e.amount;
      return acc;
    }, {});
    return Object.entries(raw)
      .map(([month, amount]) => {
        const [y, m] = month.split("-");
        const monthLabel = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'short' }) + " " + y;
        return { month: monthLabel, amount, rawDate: month };
      })
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
      .slice(-6);
  }, [expenses]);

  // Detail for clicked month
  const getMonthlyDetails = (rawMonth: string) => {
    const monthExpenses = expenses.filter(e => e.date.substring(0, 7) === rawMonth);
    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const topTx = monthExpenses.length > 0 
      ? [...monthExpenses].sort((a, b) => b.amount - a.amount)[0]
      : null;
    return { total, topTx, count: monthExpenses.length };
  };

  // Available Categories & Years
  const availableCategories = useMemo(() => {
    return Array.from(new Set([
      "Food", "PG", "Travel", "Auto", "Cab", "Tea", "Shopping", "Medicine", "Fuel", "Entertainment", "Bills", "Miscellaneous",
      ...(profile?.customCategories || []),
      ...expenses.map(e => e.category)
    ]));
  }, [profile, expenses]);

  const availableYears = useMemo(() => {
    return Array.from(new Set(
      expenses.map((e) => new Date(e.date).getFullYear().toString())
    )).sort((a: string, b: string) => b.localeCompare(a));
  }, [expenses]);

  // Early return during initial auth check
  if (loading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#07090e] text-slate-100">
        <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mb-3" />
        <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Loading TMK Ledger...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onSuccess={() => showNotification("Authenticated successfully", "success")} />;
  }

  // Active ring metrics
  const displayLimit = isCustomCycleActive ? customCycleBudget : activeBudget;
  const displaySpent = isCustomCycleActive ? customCycleSpent : totalSpentCurrentMonth;
  const displayRemaining = isCustomCycleActive ? customCycleRemaining : remainingBudget;
  const displayProgress = isCustomCycleActive ? customCycleProgress : monthProgressPct;
  const isOverBudget = displaySpent > displayLimit;

  return (
    <div className={`min-h-screen ${darkMode ? "grid-bg-dark text-slate-100" : "grid-bg-light text-slate-900"} font-sans transition-colors duration-200 relative selection:bg-emerald-500/20 selection:text-emerald-400 overflow-x-hidden`}>
      
      {/* Dynamic ambient colored aura glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-36 left-1/4 w-[550px] h-[400px] bg-indigo-500/[0.06] rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-20 w-[450px] h-[400px] bg-teal-500/[0.05] rounded-full blur-[140px]" />
        <div className="absolute -bottom-24 left-1/3 w-[500px] h-[350px] bg-violet-500/[0.05] rounded-full blur-[140px]" />
      </div>

      {/* Global Toast Alert */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.96 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 py-2.5 px-4 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl ${
              notification.type === "warning"
                ? "bg-rose-950/85 border-rose-500/30 text-rose-300 shadow-rose-950/50"
                : notification.type === "info"
                ? "bg-slate-900/90 border-cyan-500/30 text-cyan-300 shadow-cyan-950/50"
                : "bg-slate-900/90 border-emerald-500/30 text-emerald-300 shadow-emerald-950/50"
            }`}
          >
            {notification.type === "warning" ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : notification.type === "info" ? (
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="text-xs font-medium tracking-wide">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP BAR CONTRACT: STRICT 1-ROW, 3-ZONE LAYOUT */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors ${
        darkMode ? "bg-[#080d1a]/90 border-white/[0.08]" : "bg-white/95 border-slate-200 light-surface"
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* ZONE 1: BRAND EMBLEM & CLOUD STATUS */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-[1px] shadow-lg shadow-emerald-500/20 shrink-0">
              <div className={`w-full h-full ${darkMode ? "bg-[#080d1a]" : "bg-white"} rounded-[11px] flex items-center justify-center text-emerald-400`}>
                <Wallet2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className={`font-extrabold text-xs sm:text-sm tracking-tight font-sans ${darkMode ? "text-white" : "text-slate-900"}`}>
                  TMK <span className="hidden sm:inline">LEDGER</span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded-full font-semibold">
                  PRO
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 hidden xs:flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Cloud Sync
              </p>
            </div>
          </div>

          {/* ZONE 2: SEGMENTED VIEW SWITCHER TABS (Desktop / Tablet) */}
          <nav className="hidden lg:flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "overview"
                  ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Command Center</span>
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "calendar"
                  ? "bg-sky-500 text-slate-950 shadow-md font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "analytics"
                  ? "bg-violet-500 text-white shadow-md font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "transactions"
                  ? "bg-cyan-500 text-slate-950 shadow-md font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Spreadsheet</span>
            </button>
          </nav>

          {/* ZONE 3: ACTIONS & CONTROLS */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            
            {/* Superstar Rajini Punch Button */}
            <button
              id="thalaivar-punch-trigger-btn"
              onClick={() => {
                const sampleAmount = expenses.length > 0 ? expenses[0].amount : 500;
                const sampleCategory = expenses.length > 0 ? expenses[0].category : "Tea & Mass";
                setThalaivarExpense({
                  amount: sampleAmount,
                  category: sampleCategory,
                  description: "Thalaivar Punch Check"
                });
                setIsThalaivarPopupOpen(true);
              }}
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-orange-500/10 hover:from-amber-500/25 hover:to-yellow-500/20 border border-amber-500/35 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-amber-500/10"
              title="Superstar Rajinikanth Dialogues"
            >
              <span className="text-sm">🕶️</span>
              <span className="hidden md:inline font-mono">Thalaivar</span>
            </button>

            {/* Quick Gemini AI Launcher */}
            <button
              id="ai-insights-trigger-btn"
              onClick={() => setIsAiOpen(true)}
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-gradient-to-r from-teal-500/15 to-emerald-500/10 hover:from-teal-500/25 hover:to-emerald-500/20 border border-teal-500/35 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-teal-500/10"
              title="Gemini AI Financial Advisor"
            >
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400" />
              <span className="hidden md:inline font-mono">Gemini AI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping hidden lg:inline-block" />
            </button>

            {/* Dark/Light mode toggle */}
            <button
              id="dark-mode-toggle-btn"
              onClick={() => setDarkMode(!darkMode)}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 transition cursor-pointer"
              title="Toggle theme"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
            </button>

            {/* Profile / Settings Button */}
            <button
              id="user-profile-menu-trigger"
              onClick={() => setIsProfileOpen(true)}
              className="h-8 sm:h-9 px-1.5 sm:px-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 transition cursor-pointer flex items-center gap-1.5"
              title="Settings"
            >
              <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-[10px]">
                {profile?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <Settings className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            </button>

            {/* Gmail AI Reports Button */}
            <button
              id="gmail-reports-header-btn"
              onClick={() => setIsGmailModalOpen(true)}
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-gradient-to-r from-rose-500/15 via-red-500/10 to-orange-500/10 hover:from-rose-500/25 hover:to-red-500/20 border border-rose-500/35 text-rose-300 font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-rose-500/10 transition cursor-pointer"
              title="Gmail AI Reports (Weekly & Monthly)"
            >
              <Mail className="w-3.5 h-3.5 text-rose-400 stroke-[2.2]" />
              <span className="hidden md:inline font-mono">Gmail AI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </button>

            {/* Scan Bill / Receipt (AI OCR) Button */}
            <button
              id="scan-bill-header-btn"
              onClick={() => setIsReceiptScannerOpen(true)}
              className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-teal-500/20 hover:from-cyan-500/30 hover:to-teal-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/10 transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              title="Scan physical bill or receipt with AI OCR"
            >
              <ScanLine className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 stroke-[2.5]" />
              <span className="hidden sm:inline">Scan Bill</span>
            </button>

            {/* Primary Action Button */}
            <button
              id="add-expense-trigger-btn"
              onClick={() => {
                setExpenseToEdit(null);
                setIsModalOpen(true);
              }}
              className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-lg shadow-emerald-500/25 transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
              <span className="hidden sm:inline">Record</span>
            </button>

            {/* Sign Out */}
            <button
              id="logout-header-btn"
              onClick={handleLogout}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl border border-white/[0.08] hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile secondary tab strip (4-column balanced grid) */}
        <div className={`lg:hidden grid grid-cols-4 gap-1 p-1.5 border-t backdrop-blur-md text-[11px] font-semibold ${
          darkMode ? "border-white/[0.06] bg-[#070b14]/90" : "border-slate-200 bg-slate-100/95"
        }`}>
          <button 
            onClick={() => setActiveTab("overview")} 
            className={`py-1.5 px-1 rounded-xl flex items-center justify-center gap-1 transition ${
              activeTab === "overview" 
                ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Overview</span>
          </button>
          <button 
            onClick={() => setActiveTab("calendar")} 
            className={`py-1.5 px-1 rounded-xl flex items-center justify-center gap-1 transition ${
              activeTab === "calendar" 
                ? "bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Calendar</span>
          </button>
          <button 
            onClick={() => setActiveTab("analytics")} 
            className={`py-1.5 px-1 rounded-xl flex items-center justify-center gap-1 transition ${
              activeTab === "analytics" 
                ? "bg-violet-500 text-white font-bold shadow-md shadow-violet-500/20" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <PieIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Analytics</span>
          </button>
          <button 
            onClick={() => setActiveTab("transactions")} 
            className={`py-1.5 px-1 rounded-xl flex items-center justify-center gap-1 transition ${
              activeTab === "transactions" 
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Receipt className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Ledger</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER VIEWPORT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* =========================================================================
            SECTION: EXECUTIVE HERO BENTO (Rendered on 'overview' and 'analytics')
           ========================================================================= */}
        {(activeTab === "overview" || activeTab === "analytics") && (
          <div className="grid grid-cols-12 gap-5">

            {/* CARD 1: ACTIVE MONTHLY BUDGET GAUGE (HERO COMPONENT FROM USER SCREENSHOT) */}
            <div className={`col-span-12 lg:col-span-5 ${darkMode ? "bento-card-dark" : "bento-card-light"} flex flex-col justify-between relative group`}>
              {/* Subtle ambient corner aura */}
              <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-start justify-between pb-3.5 border-b border-white/[0.08]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-white font-sans">
                      {isCustomCycleActive ? "Active Cycle Budget" : "Active Monthly Budget"}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isCustomCycleActive 
                      ? `Cycle: ${customCycleStart} to ${customCycleEnd}`
                      : "Smart budgeting limit check"}
                  </p>
                </div>

                {/* Inline Edit Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    const currentLimit = isCustomCycleActive ? customCycleBudget : activeBudget;
                    setActiveBudgetLimitInput(currentLimit.toString());
                    setActiveBudgetStartInput(profile?.customPeriodStartDate || "2026-06-23");
                    setActiveBudgetEndInput(profile?.customPeriodEndDate || "2026-07-23");
                    setActiveBudgetUseCustomInput(isCustomCycleActive);
                    setIsEditingActiveBudgetBlock(!isEditingActiveBudgetBlock);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    isEditingActiveBudgetBlock
                      ? "bg-rose-500/15 border-rose-500/35 text-rose-300"
                      : "bg-white/[0.04] border-white/10 hover:border-emerald-500/40 text-slate-300 hover:text-white"
                  }`}
                  title="Configure budget limits and custom cycle dates"
                >
                  {isEditingActiveBudgetBlock ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Close</span>
                    </>
                  ) : (
                    <>
                      <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden xs:inline">Configure Cycle</span>
                    </>
                  )}
                </button>
              </div>

              {/* Body: Either Inline Configuration Form OR The Stunning SVG Gauge */}
              {isEditingActiveBudgetBlock ? (
                <div className="py-4 space-y-3.5 my-auto">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Monthly Limit ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      value={activeBudgetLimitInput}
                      onChange={(e) => setActiveBudgetLimitInput(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full bg-slate-950/70 border border-white/15 rounded-xl py-2 px-3 text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={activeBudgetUseCustomInput}
                        onChange={(e) => setActiveBudgetUseCustomInput(e.target.checked)}
                        className="rounded text-emerald-500 bg-slate-950 border-slate-700 focus:ring-emerald-500/20 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-200">Enable Custom Date Range</span>
                    </label>

                    {activeBudgetUseCustomInput && (
                      <div className="grid grid-cols-2 gap-2.5 pt-1.5">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-mono mb-1">Start Date</label>
                          <input
                            type="date"
                            value={activeBudgetStartInput}
                            onChange={(e) => setActiveBudgetStartInput(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg py-1.5 px-2 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-mono mb-1">End Date</label>
                          <input
                            type="date"
                            value={activeBudgetEndInput}
                            onChange={(e) => setActiveBudgetEndInput(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg py-1.5 px-2 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSaveActiveBudgetInline(activeBudgetLimitInput, activeBudgetUseCustomInput, activeBudgetStartInput, activeBudgetEndInput)}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs transition cursor-pointer shadow-md"
                    >
                      Save Budget & Cycle
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingActiveBudgetBlock(false)}
                      className="py-2 px-3 rounded-xl border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/5 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="my-auto py-5 sm:py-6 flex flex-col items-center justify-center">
                  {/* Breathtaking Circular Gauge (User Screenshot Spec) */}
                  <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className={darkMode ? "text-slate-800/80" : "text-slate-200"}
                        strokeWidth="3.4"
                        stroke="currentColor"
                        fill="none"
                        strokeDasharray="100, 100"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={`transition-all duration-700 ${
                          isOverBudget 
                            ? "text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]" 
                            : displayProgress > 80 
                            ? "text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" 
                            : "text-[#10b981] drop-shadow-[0_0_14px_rgba(16,185,129,0.6)]"
                        }`}
                        strokeWidth="3.4"
                        strokeDasharray={`${Math.min(100, displayProgress)}, 100`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    
                    <div className="absolute flex flex-col items-center select-none text-center">
                      <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white tabular-nums">
                        {displayProgress.toFixed(0)}%
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-slate-400 font-semibold mt-0.5">
                        {isOverBudget ? "Exceeded" : "USED"}
                      </span>
                    </div>
                  </div>

                  {/* Daily safe allowance pill & Gemini Forecast shortcut */}
                  <div className="mt-3 flex flex-col items-center gap-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono">
                      <span className="text-slate-400">Safe pace:</span>
                      <span className="text-emerald-400 font-bold tabular-nums">
                        {currencySymbol}{safeDailySpend.toFixed(0)} / day
                      </span>
                      <span className="text-slate-500">({activeDaysRemaining}d left)</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-0.5">
                      <button
                        type="button"
                        onClick={() => setActiveTab("analytics")}
                        className="text-[11px] font-mono text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 transition cursor-pointer"
                        title="View AI spending projection and future trends"
                      >
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span>AI Spending Forecast →</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsReceiptScannerOpen(true)}
                        className="text-[11px] font-mono text-emerald-300 hover:text-emerald-200 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition cursor-pointer"
                        title="Scan bill or receipt using Gemini OCR"
                      >
                        <ScanLine className="w-3 h-3 text-emerald-400" />
                        <span>Scan Bill (OCR) 📷</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Metrics Row (User Screenshot Spec) */}
              <div className="space-y-2.5 pt-3.5 border-t border-white/[0.08] text-xs sm:text-sm">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-normal text-slate-400">Limit</span>
                  <span className="font-mono font-bold text-white tabular-nums text-sm sm:text-base">
                    {currencySymbol}{displayLimit.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-normal">
                    {isCustomCycleActive ? "Spent (Cycle)" : "Spent (Month)"}
                  </span>
                  <span className={`font-mono font-bold tabular-nums text-sm sm:text-base ${isOverBudget ? "text-rose-400" : "text-[#10b981]"}`}>
                    {currencySymbol}{displaySpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-normal">Remaining</span>
                  <span className={`font-mono font-bold tabular-nums text-sm sm:text-base ${isOverBudget ? "text-rose-400" : "text-[#10b981]"}`}>
                    {currencySymbol}{displayRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 2: REAL-TIME BURN RATE & SPENDING ARCHIVES */}
            <div className="col-span-12 lg:col-span-7 grid grid-cols-12 gap-5">
              
              {/* Stat 1: Total Spent Filtered */}
              <div className={`col-span-12 sm:col-span-6 ${darkMode ? "bento-card-dark" : "bento-card-light"} relative`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Total Ledger Spent
                  </span>
                  <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white tabular-nums">
                  {currencySymbol}{totalSpentFiltered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-400 mt-2.5 flex items-center justify-between">
                  <span>Volume: {filteredExpenses.length} records</span>
                  <span className="font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">Active</span>
                </div>
              </div>

              {/* Stat 2: Today & Week Burn */}
              <div className={`col-span-12 sm:col-span-6 ${darkMode ? "bento-card-dark" : "bento-card-light"} relative`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Real-Time Velocity
                  </span>
                  <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10">
                    <Flame className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-300 tabular-nums">
                    {currencySymbol}{todaySpent.toLocaleString()}
                  </div>
                  <span className="text-xs text-slate-400 font-mono">today</span>
                </div>
                <div className="text-xs text-slate-400 mt-2.5 flex items-center justify-between font-mono">
                  <span>Last 7 Days:</span>
                  <span className="text-cyan-400 font-bold">{currencySymbol}{weeklySpent.toLocaleString()}</span>
                </div>
              </div>

              {/* Stat 3: MONTHLY SPEND ARCHIVES (THE FEATURE TO CLICK MONTH & SEE TOTAL SPENT + TOP TRANSACTION) */}
              <div className={`col-span-12 ${darkMode ? "bento-card-dark" : "bento-card-light"}`}>
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Monthly Spend Archive</h4>
                      <p className="text-[11px] text-slate-400">
                        Click any month to inspect total spent and top transactions
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 hidden sm:inline-block">
                    Interactive
                  </span>
                </div>

                {/* Monthly Pills Carousel */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {monthlyBarData.map((item) => (
                    <button
                      key={item.rawDate}
                      type="button"
                      onClick={() => setSelectedMonthDetails(item.rawDate)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer select-none group relative overflow-hidden ${
                        selectedMonthDetails === item.rawDate
                          ? "bg-gradient-to-br from-indigo-500/20 to-violet-500/15 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                          : "bg-white/[0.03] border-white/10 hover:border-indigo-500/40 text-slate-300 hover:text-white"
                      }`}
                    >
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block group-hover:text-indigo-300 transition">
                        {item.month}
                      </span>
                      <span className="text-xs font-mono font-bold block mt-1 tabular-nums text-white">
                        {currencySymbol}{item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Selected Month Inspector Popover / Card */}
                <AnimatePresence>
                  {selectedMonthDetails && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="mt-4 p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/35 shadow-2xl relative"
                    >
                      <button
                        onClick={() => setSelectedMonthDetails(null)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {(() => {
                        const details = getMonthlyDetails(selectedMonthDetails);
                        const [y, m] = selectedMonthDetails.split("-");
                        const monthName = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                        
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                              <h5 className="font-bold text-sm text-white font-sans">
                                {monthName} Comprehensive Breakdown
                              </h5>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Left: Total Spent */}
                              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Total Spent</span>
                                <div className="text-xl font-mono font-bold text-emerald-400 mt-1 tabular-nums">
                                  {currencySymbol}{details.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                                  {details.count} recorded transactions
                                </span>
                              </div>

                              {/* Right: Top Transaction */}
                              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Top Transaction</span>
                                {details.topTx ? (
                                  <div className="mt-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                                        {details.topTx.description}
                                      </span>
                                      <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                                        {currencySymbol}{details.topTx.amount.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-1">
                                      {(() => {
                                        const topCatStyle = getCategoryStyle(details.topTx.category);
                                        return (
                                          <span className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded border ${topCatStyle.bg} ${topCatStyle.border} ${topCatStyle.text}`}>
                                            <span className={`w-1 h-1 rounded-full ${topCatStyle.dot}`} />
                                            {details.topTx.category}
                                          </span>
                                        );
                                      })()}
                                      <span>·</span>
                                      <span>{details.topTx.date}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500 italic mt-1">No transactions recorded</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] text-slate-500 font-mono">
                                Data synced with Firestore database
                              </span>
                              <button
                                onClick={() => {
                                  const [yr, mo] = selectedMonthDetails.split("-");
                                  setYearFilter(yr);
                                  setMonthFilter(mo);
                                  setActiveTab("transactions");
                                  setSelectedMonthDetails(null);
                                  showNotification(`Filtered ledger to ${monthName}`, "success");
                                }}
                                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition"
                              >
                                <span>Filter ledger by this month</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>

          </div>
        )}

        {/* =========================================================================
            SECTION: SAVINGS GOALS & TARGETS (Command Center 'overview')
           ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <SavingsGoalsCard
              user={user}
              currencySymbol={currencySymbol}
              darkMode={darkMode}
              onGoalCompleted={(goalName) => {
                setThalaivarExpense({
                  amount: 10000,
                  category: "Savings Milestone",
                  description: `Achieved: ${goalName}`
                });
                setIsThalaivarPopupOpen(true);
                showNotification(`🎉 Congratulations! You achieved your savings goal: "${goalName}"!`, "success");
              }}
            />

            {/* Gmail Automated AI Reports Hub Card */}
            <GmailReportsCard
              profile={profile}
              expenses={expenses}
              currencySymbol={currencySymbol}
              monthlyBudget={displayLimit}
              onOpenGmailModal={() => setIsGmailModalOpen(true)}
              onTriggerQuickSend={handleTriggerQuickSend}
              darkMode={darkMode}
            />
          </div>
        )}

        {/* =========================================================================
            VIEW 1: DEEP ANALYTICS & TIMELINE (Active when 'analytics' or 'overview')
           ========================================================================= */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            
            {/* Gemini Predictive Spending Trends & Forward Projections */}
            <SpendingProjectionCard
              currentMonth={monthFilter === "All" || !monthFilter ? currentMonthStr : `${yearFilter}-${monthFilter}`}
              monthlyBudget={displayLimit}
              currentMonthExpenses={currentMonthExpenses}
              allExpenses={expenses}
              currencySymbol={currencySymbol}
              darkMode={darkMode}
            />

            <div className="grid grid-cols-12 gap-5">
            
            {/* Timeline Spending Area Chart */}
            <div className={`col-span-12 lg:col-span-8 ${darkMode ? "bento-card-dark" : "bento-card-light"}`}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.08]">
                <div>
                  <h4 className="font-bold text-base text-white">Daily Spending Trajectory</h4>
                  <p className="text-xs text-slate-400">Cumulative expenditure trajectory over time</p>
                </div>
                <div className="text-xs font-mono text-emerald-400 font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  {trendChartData.length} active data points
                </div>
              </div>

              <div className="h-72 w-full">
                {trendChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="glowArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#ffffff" : "#94a3b8"} opacity={darkMode ? 0.05 : 0.28} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${currencySymbol}${v}`} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: darkMode ? "#080b11" : "#ffffff", 
                          border: darkMode ? "1px solid rgba(255,255,255,0.15)" : "1px solid #cbd5e1",
                          color: darkMode ? "#f8fafc" : "#0f172a",
                          borderRadius: "14px",
                          fontFamily: "JetBrains Mono"
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#10b981" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#glowArea)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs italic font-mono">
                    No transactions recorded to build trend chart.
                  </div>
                )}
              </div>
            </div>

            {/* Category Donut Distribution */}
            <div className={`col-span-12 lg:col-span-4 ${darkMode ? "bento-card-dark" : "bento-card-light"} flex flex-col justify-between`}>
              <div>
                <h4 className="font-bold text-base text-white">Category Allocation</h4>
                <p className="text-xs text-slate-400">Share of wallet across spending streams</p>
              </div>

              <div className="h-52 w-full my-auto relative">
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={78}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getCategoryStyle(entry.name).hex} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: darkMode ? "#080d1a" : "#ffffff", 
                          border: darkMode ? "1px solid rgba(255,255,255,0.15)" : "1px solid #cbd5e1",
                          color: darkMode ? "#f8fafc" : "#0f172a",
                          borderRadius: "14px",
                          fontFamily: "JetBrains Mono"
                        }}
                        formatter={(val: any) => [`${currencySymbol}${Number(val).toFixed(2)}`, "Spent"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                    No category data.
                  </div>
                )}
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1.5 pt-2 border-t border-white/[0.08]">
                {categoryChartData.map((item) => {
                  const pct = totalSpentFiltered > 0 ? ((item.value / totalSpentFiltered) * 100).toFixed(0) : "0";
                  const style = getCategoryStyle(item.name);
                  return (
                    <div key={item.name} className="flex items-center justify-between text-xs py-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: style.hex }} />
                        <span className="text-slate-200 font-medium truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <div className="font-mono flex items-center gap-2">
                        <span className="text-slate-400">{currencySymbol}{item.value.toFixed(0)}</span>
                        <span className="text-emerald-400 font-bold">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
        )}

        {/* =========================================================================
            VIEW 2: CALENDAR MATRIX LEDGER (Active when 'calendar' or 'overview')
           ========================================================================= */}
        {(activeTab === "calendar" || (activeTab === "overview" && expenses.length > 0)) && (
          <div className="grid grid-cols-12 gap-5">
            
            {/* 42-Cell Monthly Matrix Calendar */}
            <div className={`col-span-12 lg:col-span-8 ${darkMode ? "bento-card-dark" : "bento-card-light"}`}>
              {/* Header with Month Nav and Spending Color Legend */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-white/[0.08] gap-2.5">
                <div>
                  <h4 className="font-bold text-base text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    Interactive Calendar Ledger
                  </h4>
                  <p className="text-xs text-slate-400">Click any date to view itemized expenses and day totals</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Heatmap Legend: Green = Low, Orange = Average, Red = Spends More */}
                  <div className="flex items-center gap-2.5 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.07] text-[10px] font-mono">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                      <span>Low</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
                      <span>Average</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500 animate-pulse" />
                      <span>Spends More</span>
                    </span>
                  </div>

                  {/* Month Nav Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        if (calendarMonth === 0) {
                          setCalendarMonth(11);
                          setCalendarYear(prev => prev - 1);
                        } else {
                          setCalendarMonth(prev => prev - 1);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-slate-300 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-white px-2">
                      {MONTH_NAMES[calendarMonth]} {calendarYear}
                    </span>
                    <button
                      onClick={() => {
                        if (calendarMonth === 11) {
                          setCalendarMonth(0);
                          setCalendarYear(prev => prev + 1);
                        } else {
                          setCalendarMonth(prev => prev + 1);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-slate-300 transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] text-slate-500 font-bold uppercase mb-1">
                {WEEK_DAYS.map((wd) => (
                  <div key={wd} className="py-1">{wd}</div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarCells.map((cell, idx) => {
                  const dayExpenses = expensesByDate[cell.dateStr] || [];
                  const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
                  const isSelected = selectedCalendarDate === cell.dateStr;
                  const isToday = cell.dateStr === todayStr;
                  const tier = getDaySpendingTier(dayTotal);

                  // Colors:
                  // High / Spends More -> Red (rose-400 / rose-500)
                  // Average -> Orange / Amber (amber-400 / amber-500)
                  // Low -> Green (emerald-400 / emerald-500)
                  let cellStyle = darkMode
                    ? "bg-transparent border-transparent text-slate-700 opacity-40"
                    : "bg-transparent border-transparent text-slate-400 opacity-50";
                  let amountColor = "text-emerald-400";

                  if (isSelected) {
                    if (tier === "high") {
                      cellStyle = darkMode
                        ? "bg-rose-500/25 border-rose-400 text-white shadow-lg shadow-rose-500/25 ring-2 ring-rose-400"
                        : "bg-rose-100 border-rose-500 text-rose-950 shadow-md ring-2 ring-rose-500";
                      amountColor = "text-rose-300 font-bold";
                    } else if (tier === "average") {
                      cellStyle = darkMode
                        ? "bg-amber-500/25 border-amber-400 text-white shadow-lg shadow-amber-500/25 ring-2 ring-amber-400"
                        : "bg-amber-100 border-amber-500 text-amber-950 shadow-md ring-2 ring-amber-500";
                      amountColor = "text-amber-300 font-bold";
                    } else if (tier === "low") {
                      cellStyle = darkMode
                        ? "bg-emerald-500/25 border-emerald-400 text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400"
                        : "bg-emerald-100 border-emerald-500 text-emerald-950 shadow-md ring-2 ring-emerald-500";
                      amountColor = "text-emerald-300 font-bold";
                    } else {
                      cellStyle = darkMode
                        ? "bg-white/10 border-white/40 text-white shadow-lg ring-2 ring-white/30"
                        : "bg-slate-200 border-slate-500 text-slate-900 shadow-md ring-2 ring-slate-400";
                      amountColor = "text-slate-300 font-bold";
                    }
                  } else if (tier === "high") {
                    // Spends more -> Red
                    cellStyle = darkMode
                      ? "bg-rose-500/10 border-rose-500/35 hover:border-rose-500/60 text-slate-200 hover:shadow-sm hover:shadow-rose-500/20"
                      : "bg-rose-50 border-rose-300 hover:border-rose-400 text-slate-900";
                    amountColor = "text-rose-400 font-bold";
                  } else if (tier === "average") {
                    // Average -> Orange
                    cellStyle = darkMode
                      ? "bg-amber-500/10 border-amber-500/35 hover:border-amber-500/60 text-slate-200 hover:shadow-sm hover:shadow-amber-500/20"
                      : "bg-amber-50 border-amber-300 hover:border-amber-400 text-slate-900";
                    amountColor = "text-amber-400 font-bold";
                  } else if (tier === "low") {
                    // Low spendings -> Green
                    cellStyle = darkMode
                      ? "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50 text-slate-200 hover:shadow-sm hover:shadow-emerald-500/20"
                      : "bg-emerald-50 border-emerald-300 hover:border-emerald-400 text-slate-900";
                    amountColor = "text-emerald-400 font-bold";
                  } else if (cell.isCurrentMonth) {
                    cellStyle = darkMode
                      ? "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] text-slate-400"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700";
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedCalendarDate(cell.dateStr)}
                      className={`min-h-[58px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer relative ${cellStyle}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[11px] font-mono font-semibold ${isToday ? "text-white font-bold" : ""}`}>
                          {cell.day}
                        </span>
                        {isToday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                        )}
                      </div>

                      {dayTotal > 0 && (
                        <div className={`mt-auto text-[10px] font-mono truncate tabular-nums ${amountColor}`}>
                          {currencySymbol}{dayTotal >= 1000 ? `${(dayTotal / 1000).toFixed(1)}k` : dayTotal.toFixed(0)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Inspector Panel */}
            <div className={`col-span-12 lg:col-span-4 ${darkMode ? "bento-card-dark" : "bento-card-light"} flex flex-col justify-between`}>
              {(() => {
                const dayList = expensesByDate[selectedCalendarDate] || [];
                const daySum = dayList.reduce((sum, e) => sum + e.amount, 0);

                return (
                  <>
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Date Inspector</span>
                          <h4 className="font-bold text-sm text-white font-mono">{selectedCalendarDate}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-mono block">Day Total</span>
                          {(() => {
                            const inspectorTier = getDaySpendingTier(daySum);
                            const totalColor = inspectorTier === "high" 
                              ? "text-rose-400" 
                              : inspectorTier === "average" 
                              ? "text-amber-400" 
                              : daySum > 0 
                              ? "text-emerald-400" 
                              : "text-slate-400";
                            return (
                              <span className={`text-sm font-mono font-bold tabular-nums ${totalColor}`}>
                                {currencySymbol}{daySum.toFixed(2)}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="my-3 space-y-2 max-h-64 overflow-y-auto pr-1">
                        {dayList.length > 0 ? (
                          dayList.map((item) => {
                            const cStyle = getCategoryStyle(item.category);
                            const pStyle = getPaymentStyle(item.paymentMode);
                            return (
                              <div 
                                key={item.id} 
                                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between"
                              >
                                <div className="truncate max-w-[170px]">
                                  <div className="text-xs font-semibold text-white truncate">{item.description}</div>
                                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                                    <span className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.2 rounded border ${cStyle.bg} ${cStyle.border} ${cStyle.text}`}>
                                      <span className={`w-1 h-1 rounded-full ${cStyle.dot}`} />
                                      {item.category}
                                    </span>
                                    <span>·</span>
                                    <span className={`px-1 rounded border ${pStyle.bg} ${pStyle.border} ${pStyle.text}`}>
                                      {item.paymentMode}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                                    {currencySymbol}{item.amount.toFixed(2)}
                                  </div>
                                  <button
                                    onClick={() => {
                                      setExpenseToEdit(item);
                                      setIsModalOpen(true);
                                    }}
                                    className="text-[10px] text-emerald-400 hover:underline font-mono mt-0.5 inline-block cursor-pointer font-semibold"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-12 text-center text-slate-500 text-xs italic font-mono">
                            No expenses recorded on this date.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-white/[0.08] flex gap-2">
                      <button
                        onClick={() => {
                          setExpenseToEdit(null);
                          setIsModalOpen(true);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Log for this Date</span>
                      </button>
                      <button
                        onClick={() => {
                          setStartDateFilter(selectedCalendarDate);
                          setEndDateFilter(selectedCalendarDate);
                          setActiveTab("transactions");
                          showNotification(`Filtered ledger to ${selectedCalendarDate}`, "success");
                        }}
                        className="py-2 px-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-semibold transition cursor-pointer"
                        title="Filter spreadsheet table"
                      >
                        <Filter className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>

          </div>
        )}

        {/* =========================================================================
            SECTION: DATA MANAGEMENT & EXPORT SUITE (Always accessible on 'transactions' and 'overview')
           ========================================================================= */}
        <div className={`p-4 rounded-2xl ${darkMode ? "bg-white/[0.02] border border-white/[0.06]" : "bg-white border border-slate-200 shadow-sm light-surface"}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Financial Report Export & Spreadsheet Integration
              </h4>
              <p className="text-[11px] text-slate-400">Download formatted accounting statements or batch ingest records</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* PDF Export */}
            <button
              id="export-pdf-action-btn"
              onClick={() => exportToPDF(filteredExpenses, profile?.name || "User", profile?.email || "", currencySymbol, activeBudget)}
              className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-emerald-500/30 text-left transition cursor-pointer group"
            >
              <Download className="w-4 h-4 text-rose-400 mb-1.5 group-hover:scale-110 transition" />
              <div className="text-xs font-bold text-white">Export PDF</div>
              <p className="text-[10px] text-slate-400 mt-0.5">Formal executive tabular statement</p>
            </button>

            {/* Excel Export */}
            <button
              id="export-excel-action-btn"
              onClick={() => exportToExcel(filteredExpenses, currencySymbol)}
              className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-emerald-500/30 text-left transition cursor-pointer group"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 mb-1.5 group-hover:scale-110 transition" />
              <div className="text-xs font-bold text-white">Export Excel</div>
              <p className="text-[10px] text-slate-400 mt-0.5">XLSX workbook with styling</p>
            </button>

            {/* CSV Export */}
            <button
              id="export-csv-action-btn"
              onClick={() => exportToCSV(filteredExpenses, currencySymbol)}
              className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-emerald-500/30 text-left transition cursor-pointer group"
            >
              <Download className="w-4 h-4 text-cyan-400 mb-1.5 group-hover:scale-110 transition" />
              <div className="text-xs font-bold text-white">Export CSV</div>
              <p className="text-[10px] text-slate-400 mt-0.5">Universal raw data stream</p>
            </button>

            {/* Bulk File Ingestion */}
            <div className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-dashed border-white/20 hover:border-emerald-500/50 text-left transition relative group cursor-pointer">
              <Upload className="w-4 h-4 text-purple-400 mb-1.5 group-hover:scale-110 transition" />
              <div className="text-xs font-bold text-white">Import Records</div>
              <p className="text-[10px] text-slate-400 mt-0.5">Upload .xlsx or .csv files</p>
              <input
                id="bulk-import-file-uploader"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleBulkImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION: TRANSACTIONS LEDGER SPREADSHEET TABLE (Full Width)
           ========================================================================= */}
        <div className={`p-5 rounded-2xl ${darkMode ? "bento-card-dark" : "bento-card-light"}`}>
          
          {/* Table Header Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
            <div>
              <h3 className="text-base font-bold text-white">Ledger Transactions</h3>
              <p className="text-xs text-slate-400">Search, filter, and inspect detailed account entries</p>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              {/* Live Search */}
              <div className="relative flex-1 md:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="expense-search-input"
                  type="text"
                  placeholder="Search description, tags, notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-950/70 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              {/* Filter Panel Toggle */}
              <button
                id="filter-toggle-btn"
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                  showFilters
                    ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                    : "bg-white/[0.04] border-white/10 text-slate-300 hover:text-white"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filters</span>
              </button>

              {/* Scan Bill OCR CTA */}
              <button
                id="ledger-scan-bill-btn"
                onClick={() => setIsReceiptScannerOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
                title="Scan Bill or Receipt with Gemini AI OCR"
              >
                <ScanLine className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Scan Bill</span>
              </button>

              {/* Record CTA */}
              <button
                onClick={() => {
                  setExpenseToEdit(null);
                  setIsModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Record</span>
              </button>
            </div>
          </div>

          {/* Collapsible Filter Toolbar */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border-b border-white/[0.08] pb-4 mb-4"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Category</label>
                    <select
                      id="filter-category-select"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-2.5 text-xs text-white"
                    >
                      <option value="All">All Categories</option>
                      {availableCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Payment Mode</label>
                    <select
                      id="filter-payment-select"
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-2.5 text-xs text-white"
                    >
                      <option value="All">All Modes</option>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Net Banking">Net Banking</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Month</label>
                    <select
                      id="filter-month-select"
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-2.5 text-xs text-white"
                    >
                      <option value="All">All Months</option>
                      {MONTH_NAMES.map((name, i) => (
                        <option key={name} value={String(i + 1).padStart(2, "0")}>{name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">From Date</label>
                    <input
                      id="filter-start-date-input"
                      type="date"
                      value={startDateFilter}
                      onChange={(e) => setStartDateFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">To Date</label>
                    <input
                      id="filter-end-date-input"
                      type="date"
                      value={endDateFilter}
                      onChange={(e) => setEndDateFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Amount Max</label>
                    <input
                      id="filter-max-amount-input"
                      type="number"
                      placeholder="Max Amount"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-2.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    id="clear-all-filters-btn"
                    onClick={() => {
                      setStartDateFilter("");
                      setEndDateFilter("");
                      setCategoryFilter("All");
                      setPaymentFilter("All");
                      setMonthFilter("All");
                      setYearFilter("All");
                      setMinAmount("");
                      setMaxAmount("");
                      showNotification("Filters cleared", "info");
                    }}
                    className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition"
                  >
                    Reset Filters
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop & Tablet Table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 font-mono uppercase text-[10px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((exp) => {
                    const catStyle = getCategoryStyle(exp.category);
                    const payStyle = getPaymentStyle(exp.paymentMode);
                    return (
                      <tr key={exp.id} className="hover:bg-white/[0.03] transition group">
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">{exp.date}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 font-semibold text-xs px-2.5 py-0.5 rounded-lg border ${catStyle.bg} ${catStyle.border} ${catStyle.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-200">{exp.description}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 tabular-nums">
                          {currencySymbol}{exp.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${payStyle.bg} ${payStyle.border} ${payStyle.text}`}>
                            {exp.paymentMode}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{exp.notes || "—"}</td>
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            id={`edit-expense-btn-${exp.id}`}
                            onClick={() => {
                              setExpenseToEdit(exp);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`delete-expense-btn-${exp.id}`}
                            onClick={() => requestDeleteExpense(exp)}
                            title="Delete transaction record"
                            className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-400 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-mono italic text-xs">
                      No matching transaction entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List (Refined, colored, and touch-friendly for all phones) */}
          <div className="md:hidden space-y-3">
            {filteredExpenses.map((exp) => {
              const catStyle = getCategoryStyle(exp.category);
              const payStyle = getPaymentStyle(exp.paymentMode);
              return (
                <div key={exp.id} className="p-3.5 rounded-2xl bg-[#0d1424]/90 border border-white/[0.08] shadow-sm hover:border-white/15 transition space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${catStyle.bg} ${catStyle.border} ${catStyle.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                          {exp.category}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${payStyle.bg} ${payStyle.border} ${payStyle.text}`}>
                          {exp.paymentMode}
                        </span>
                      </div>
                      <h5 className="font-semibold text-white text-xs sm:text-sm pt-0.5">{exp.description}</h5>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-base font-mono font-bold text-emerald-400 tabular-nums block">
                        {currencySymbol}{exp.amount.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{exp.date}</span>
                    </div>
                  </div>

                  {exp.notes && (
                    <p className="text-[11px] text-slate-300 italic bg-black/25 px-2.5 py-1.5 rounded-lg border border-white/[0.04]">
                      {exp.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/[0.06] text-xs">
                    <button
                      onClick={() => {
                        setExpenseToEdit(exp);
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-emerald-400 font-semibold flex items-center gap-1 transition"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => requestDeleteExpense(exp)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>{filteredExpenses.length} records displayed</span>
            <span>Total: {currencySymbol}{totalSpentFiltered.toFixed(2)}</span>
          </div>

        </div>

      </main>

      {/* EXPENSE FORM MODAL */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setExpenseToEdit(null);
        }}
        expenseToEdit={expenseToEdit}
        onSave={handleSaveExpense}
        onDelete={executeDeleteExpense}
        customCategories={profile?.customCategories || []}
        onAddCustomCategory={handleAddCustomCategory}
        currency={currencySymbol}
        defaultDate={selectedCalendarDate}
      />

      {/* RECEIPT / BILL OCR SCANNER MODAL */}
      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        onLogExpense={async (data) => {
          await handleSaveExpense(data);
          showNotification(`Bill "${data.description}" logged via OCR!`, "success");
        }}
        onOpenFullModalWithData={(prefilled) => {
          setExpenseToEdit(prefilled);
          setIsModalOpen(true);
        }}
        currencySymbol={currencySymbol}
        customCategories={profile?.customCategories || []}
        darkMode={darkMode}
      />

      {/* GMAIL AI SPENDING REPORTS & AUTOMATION MODAL */}
      <GmailReportsModal
        isOpen={isGmailModalOpen}
        onClose={() => {
          setIsGmailModalOpen(false);
          setGmailInitialReportType(null);
        }}
        userEmail={user?.email || "thulasitmk181@gmail.com"}
        userName={profile?.name || user?.displayName || "Member"}
        profile={profile}
        expenses={expenses}
        monthlyBudget={activeBudget}
        currencySymbol={currencySymbol}
        onUpdateGmailSettings={handleUpdateGmailSettings}
        showNotification={showNotification}
        initialReportType={gmailInitialReportType}
        onClearInitialReportType={() => setGmailInitialReportType(null)}
        darkMode={darkMode}
      />

      {/* SUPERSTAR RAJINIKANTH PUNCH DIALOGUE & EMOJI BURST POPUP */}
      <ThalaivarPopup
        isOpen={isThalaivarPopupOpen}
        onClose={() => {
          setIsThalaivarPopupOpen(false);
          setThalaivarExpense(null);
        }}
        expense={thalaivarExpense}
        currency={currencySymbol}
        monthlyBudget={activeBudget}
      />

      {/* TRANSACTION DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {expenseToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeletingRecord && setExpenseToDelete(null)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-rose-500/30 rounded-2xl p-6 shadow-2xl shadow-rose-950/40 z-10"
            >
              <div className="flex items-center gap-3.5 text-rose-400 mb-4">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <Trash2 className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Transaction Record?</h3>
                  <p className="text-xs text-slate-400">Permanently delete this entry from your cloud ledger.</p>
                </div>
              </div>

              {/* Expense summary preview */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 mb-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white truncate max-w-[220px]">
                    {expenseToDelete.description || "Untitled Transaction"}
                  </span>
                  <span className="text-base font-mono font-bold text-rose-400 tabular-nums">
                    {currencySymbol}{Number(expenseToDelete.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                    {expenseToDelete.category}
                  </span>
                  <span>{expenseToDelete.date} · {expenseToDelete.paymentMode}</span>
                </div>
                {expenseToDelete.notes && (
                  <p className="text-[11px] text-slate-400 italic border-t border-white/[0.06] pt-1.5 mt-1 truncate">
                    Note: {expenseToDelete.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  id="cancel-delete-expense-btn"
                  type="button"
                  disabled={isDeletingRecord}
                  onClick={() => setExpenseToDelete(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/[0.06] text-xs font-semibold text-slate-300 transition cursor-pointer disabled:opacity-50"
                >
                  Cancel / Keep
                </button>
                <button
                  id="confirm-delete-expense-btn"
                  type="button"
                  disabled={isDeletingRecord || !expenseToDelete.id}
                  onClick={() => expenseToDelete.id && executeDeleteExpense(expenseToDelete.id)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingRecord ? "Deleting..." : "Yes, Delete Record"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* USER PROFILE & TRACKER SETTINGS MODAL */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-[#0e1422] border border-white/10 rounded-3xl shadow-2xl relative z-10 overflow-hidden text-slate-100"
              id="user-profile-settings-modal"
            >
              <div className="px-6 py-4.5 bg-slate-900/70 border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Settings className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-sm">Ledger Configuration</h3>
                </div>
                <button
                  id="close-profile-settings-btn"
                  onClick={() => setIsProfileOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="p-6">
                <div className="max-h-[64vh] overflow-y-auto pr-1 space-y-4 text-xs">
                  
                  {/* Basic Profile */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold pb-1 border-b border-white/[0.08]">
                      Account Credentials
                    </h4>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">User Display Name</label>
                      <input
                        id="profile-name-input"
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">Monthly Budget</label>
                        <input
                          id="profile-budget-input"
                          type="number"
                          required
                          value={profileBudget}
                          onChange={(e) => setProfileBudget(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">Base Currency</label>
                        <select
                          id="profile-currency-select"
                          value={profileCurrency}
                          onChange={(e) => setProfileCurrency(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-white font-mono"
                        >
                          <option value="₹">₹ INR (Rupees)</option>
                          <option value="$">$ USD (Dollars)</option>
                          <option value="€">€ EUR (Euros)</option>
                          <option value="£">£ GBP (Pounds)</option>
                          <option value="¥">¥ JPY (Yen)</option>
                          <option value="₩">₩ KRW (Won)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Push & Sound Alerts */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between pb-1 border-b border-white/[0.08]">
                      <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
                        Alert Controls
                      </h4>
                      <button
                        type="button"
                        onClick={requestPushPermission}
                        className="text-[9px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold cursor-pointer"
                      >
                        Push Perms
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/40 border border-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifyAt80}
                          onChange={(e) => setNotifyAt80(e.target.checked)}
                          className="rounded text-emerald-500 bg-slate-950 border-slate-700 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-slate-300">Alert at 80%</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/40 border border-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifyAt100}
                          onChange={(e) => setNotifyAt100(e.target.checked)}
                          className="rounded text-emerald-500 bg-slate-950 border-slate-700 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-slate-300">Alert at 100%</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/40 border border-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={soundAlerts}
                          onChange={(e) => setSoundAlerts(e.target.checked)}
                          className="rounded text-emerald-500 bg-slate-950 border-slate-700 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-slate-300">Audio chimes</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/40 border border-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dailyReminders}
                          onChange={(e) => setDailyReminders(e.target.checked)}
                          className="rounded text-emerald-500 bg-slate-950 border-slate-700 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-slate-300">Daily reminder</span>
                      </label>
                    </div>
                  </div>

                  {/* Google Chat Webhook */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold pb-1 border-b border-white/[0.08]">
                      Google Chat Integration
                    </h4>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Incoming Webhook URL</label>
                      <input
                        id="gchat-webhook-input"
                        type="text"
                        placeholder="https://chat.googleapis.com/v1/spaces/..."
                        value={chatWebhookUrl}
                        onChange={(e) => setChatWebhookUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    {chatWebhookUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          await sendGoogleChatMessage(`👋 *Hello from TMK Ledger!* Webhook alerts are active.`);
                        }}
                        className="w-full py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold cursor-pointer"
                      >
                        Send Test Ping
                      </button>
                    )}
                  </div>

                </div>

                <div className="pt-4 mt-4 flex items-center justify-end gap-2.5 border-t border-white/[0.08]">
                  <button
                    id="cancel-profile-settings-btn"
                    type="button"
                    onClick={() => setIsProfileOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="save-profile-settings-btn"
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Save Preferences
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Gemini AI Launcher Button */}
      <motion.button
        id="floating-gemini-chat-btn"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsAiOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 text-slate-950 p-3.5 sm:px-4 sm:py-3 rounded-full shadow-2xl shadow-emerald-500/30 flex items-center gap-2 font-bold text-xs cursor-pointer border border-emerald-300/40 select-none group"
        title="Open Gemini AI Financial Advisor"
      >
        <Bot className="w-5 h-5 text-slate-950 shrink-0" />
        <span className="hidden sm:inline font-bold">Ask Gemini AI</span>
        <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
      </motion.button>

      {/* Gemini AI Multi-Turn Drawer */}
      <AIChatAssistant
        expenses={expenses}
        budget={activeBudget}
        currency={currencySymbol}
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        googleChatToken={googleChatToken}
        selectedSpace={selectedSpace}
        selectedSpaceDisplay={selectedSpaceDisplay}
        webhookUrl={chatWebhookUrl}
        onSendGoogleChatMessage={sendGoogleChatMessage}
        profileName={profile?.name}
      />

    </div>
  );
}
