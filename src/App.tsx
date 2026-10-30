import React, { useState, useEffect } from "react";
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
import { auth, db } from "./lib/firebase";
import { UserProfile, Expense } from "./types";
import AuthScreen from "./components/AuthScreen";
import ExpenseModal from "./components/ExpenseModal";
import AIChatAssistant from "./components/AIChatAssistant";
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
  Receipt
} from "lucide-react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
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

const COLORS = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
  "#a855f7", // Light Purple
  "#f97316", // Orange
  "#64748b"  // Slate
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 90,
      damping: 15
    }
  }
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  // Modals & Assistant Toggle
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Dark Mode
  const [darkMode, setDarkMode] = useState(true);

  // Feedback Notification
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "warning" | "info";
  } | null>(null);

  // Profile Edit fields
  const [profileName, setProfileName] = useState("");
  const [profileBudget, setProfileBudget] = useState("");
  const [profileCurrency, setProfileCurrency] = useState("₹");

  // Start/End date manual list filters
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Custom period states for editing in settings form
  const [customPeriodBudget, setCustomPeriodBudget] = useState("15000");
  const [customPeriodStartDate, setCustomPeriodStartDate] = useState("2026-06-23");
  const [customPeriodEndDate, setCustomPeriodEndDate] = useState("2026-07-23");
  const [customPeriodEnabled, setCustomPeriodEnabled] = useState(false);
  const [isEditingCustomCycle, setIsEditingCustomCycle] = useState(false);

  // Notification states for settings form
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

  // Selected Month details panel (bento monthly insights click)
  const [selectedMonthDetails, setSelectedMonthDetails] = useState<string | null>(null);

  // Local state for inline Active Monthly Budget block editing
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

  // Mobile viewport detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

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
  const [trendViewMode, setTrendViewMode] = useState<"chart" | "calendar">("calendar");

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Track Auth State changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
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

    // Listen to profile
    const profileRef = doc(db, "users", user.uid);
    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setProfileName(data.name || "");
        setProfileBudget(data.monthlyBudget?.toString() || "15000");
        setProfileCurrency(data.currency || "₹");
        
        // Load custom period states
        setCustomPeriodBudget(data.customPeriodBudget?.toString() || "15000");
        setCustomPeriodStartDate(data.customPeriodStartDate || "2026-06-23");
        setCustomPeriodEndDate(data.customPeriodEndDate || "2026-07-23");
        setCustomPeriodEnabled(!!data.customPeriodEnabled);

        // Load notification preference states
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

        // Load Google Chat settings
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
        // Fallback or bootstrap
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
        setDoc(profileRef, newProfile);
        setProfile(newProfile);
      }
    });

    // Listen to real-time expenses
    const expensesRef = collection(db, "expenses");
    const q = fsQuery(expensesRef, where("userId", "==", user.uid));
    const unsubscribeExpenses = onSnapshot(q, (querySnapshot) => {
      const list: Expense[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Expense);
      });
      // Sort primarily by date descending, then createdAt descending
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

  // Elegant Sound Chime synthesizer using Web Audio API
  const playNotificationSound = (type: "warning" | "success" | "info") => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      if (type === "warning") {
        // Warning chime - double high beeps
        const osc1 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc1.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.4);
      } else {
        // Success/Info chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
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

  // Budget exceeded trigger check (Real-time in-app/push alerts at 80% & 100%)
  useEffect(() => {
    if (!profile || expenses.length === 0) return;
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const currentMonthSpent = expenses
      .filter(e => e.date.substring(0, 7) === currentMonth)
      .reduce((sum, e) => sum + e.amount, 0);

    const budget = profile.monthlyBudget || 15000;
    const ratio = currentMonthSpent / budget;
    
    const notifySettings = profile.notificationSettings || {
      notifyAt80: true,
      notifyAt100: true,
      soundAlerts: true,
      dailyReminders: false
    };

    // Check 100% budget limit
    if (currentMonthSpent > budget) {
      const storageKey = `alert-100-${currentMonth}-${budget}`;
      if (!sessionStorage.getItem(storageKey)) {
        sessionStorage.setItem(storageKey, "triggered");
        
        const msg = `⚠️ Budget Limit Exceeded! Spent: ${profile.currency}${currentMonthSpent.toLocaleString()} / Limit: ${profile.currency}${budget.toLocaleString()}`;
        showNotification(msg, "warning");
        
        if (notifySettings.soundAlerts) {
          playNotificationSound("warning");
        }
        
        if (notifySettings.notifyAt100 && "Notification" in window && Notification.permission === "granted") {
          try {
            new Notification("TMK Budget Exceeded!", {
              body: `You have spent ${profile.currency}${currentMonthSpent.toFixed(2)} of your ${profile.currency}${budget} limit.`,
              tag: "budget-limit-exceeded"
            });
          } catch (e) {
            console.warn("Browser Notification instantiation blocked.", e);
          }
        }

        // Auto post warning to Google Chat
        if (profile.googleChatSettings?.autoPostWarnings && (chatWebhookUrl || (googleChatToken && selectedSpace))) {
          const chatMsg = `🚨 *TMK Budget Alert: 100% Exceeded!* 🚨\nHi! Your spending for this month has reached *${profile.currency}${currentMonthSpent.toLocaleString()}*, which exceeds your limit of *${profile.currency}${budget.toLocaleString()}*.\nPlease review your expenses on the TMK Expense Tracker dashboard.`;
          sendGoogleChatMessage(chatMsg);
        }
      }
    } 
    // Check 80% warning limit
    else if (ratio >= 0.8) {
      const storageKey = `alert-80-${currentMonth}-${budget}`;
      if (!sessionStorage.getItem(storageKey)) {
        sessionStorage.setItem(storageKey, "triggered");
        
        const msg = `⚠️ Budget Alert: You have utilized ${((ratio) * 100).toFixed(0)}% of your monthly budget limit (${profile.currency}${currentMonthSpent.toLocaleString()} / ${profile.currency}${budget.toLocaleString()})`;
        showNotification(msg, "warning");
        
        if (notifySettings.soundAlerts) {
          playNotificationSound("warning");
        }
        
        if (notifySettings.notifyAt80 && "Notification" in window && Notification.permission === "granted") {
          try {
            new Notification("TMK Budget Alert (80% used)", {
              body: `You have spent ${profile.currency}${currentMonthSpent.toFixed(2)} (${((ratio) * 100).toFixed(0)}%) of your ${profile.currency}${budget} limit.`,
              tag: "budget-limit-warning"
            });
          } catch (e) {
            console.warn("Browser Notification instantiation blocked.", e);
          }
        }

        // Auto post warning to Google Chat
        if (profile.googleChatSettings?.autoPostWarnings && (chatWebhookUrl || (googleChatToken && selectedSpace))) {
          const chatMsg = `⚠️ *TMK Budget Warning: 80% Utilized!* ⚠️\nHi! You have utilized *${((ratio) * 100).toFixed(0)}%* of your monthly budget limit.\nSpent: *${profile.currency}${currentMonthSpent.toLocaleString()}* / Limit: *${profile.currency}${budget.toLocaleString()}*.\nKeep an eye on your remaining budget!`;
          sendGoogleChatMessage(chatMsg);
        }
      }
    }
  }, [expenses, profile, googleChatToken, selectedSpace, chatWebhookUrl]);

  const showNotification = (message: string, type: "success" | "warning" | "info") => {
    setNotification({ message, type });
    // Play subtle audio cue for success/warning chimes
    if (type === "success" && (!profile || profile.notificationSettings?.soundAlerts !== false)) {
      playNotificationSound("success");
    } else if (type === "warning" && (!profile || profile.notificationSettings?.soundAlerts !== false)) {
      playNotificationSound("warning");
    }
    setTimeout(() => {
      setNotification(null);
    }, 6000);
  };

  // Auth logout
  const handleLogout = async () => {
    try {
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
        // Update existing doc
        const docRef = doc(db, "expenses", expenseToEdit.id);
        await updateDoc(docRef, expenseData);
        showNotification("Expense updated successfully!", "success");
      } else {
        // Create new doc
        const collRef = collection(db, "expenses");
        await addDoc(collRef, {
          userId: user.uid,
          createdAt: serverTimestamp(),
          ...expenseData
        });
        showNotification("Expense added successfully!", "success");
      }
      setExpenseToEdit(null);
    } catch (err: any) {
      console.error(err);
      showNotification("Error saving transaction: " + err.message, "warning");
    }
  };

  // Delete transaction
  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await deleteDoc(doc(db, "expenses", id));
      showNotification("Expense deleted successfully", "success");
    } catch (err: any) {
      console.error(err);
      showNotification("Error deleting: " + err.message, "warning");
    }
  };

  // Add a custom category to Firestore profile
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

  // Connect to Google Chat
  const handleConnectGoogleChat = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account"
      });
      // Add standard user-delegated Google Chat scopes
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
        // Fetch spaces
        await fetchGoogleChatSpaces(credential.accessToken);
      } else {
        throw new Error("Failed to retrieve access token.");
      }
    } catch (err: any) {
      console.error(err);
      showNotification("Failed to connect to Google Chat: " + (err.message || err), "warning");
    }
  };

  const fetchGoogleChatSpaces = async (token: string) => {
    setChatLoadingSpaces(true);
    try {
      const res = await fetch("https://chat.googleapis.com/v1/spaces", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Google API error: ${res.status} - ${errText}`);
      }
      const data = await res.json();
      const spaces = data.spaces || [];
      setChatSpaces(spaces);
      
      if (spaces.length > 0) {
        const exists = spaces.some((s: any) => s.name === selectedSpace);
        if (!exists && !selectedSpace) {
          setSelectedSpace(spaces[0].name);
          setSelectedSpaceDisplay(spaces[0].displayName || spaces[0].name);
        }
      }
    } catch (err: any) {
      console.error("Error fetching Google Chat spaces:", err);
      showNotification("Could not fetch spaces: " + err.message, "warning");
    } finally {
      setChatLoadingSpaces(false);
    }
  };

  const sendGoogleChatMessage = async (text: string, spaceOverride?: string) => {
    // If webhookUrl is configured, send directly via webhook first as it's highly robust
    if (chatWebhookUrl) {
      try {
        const res = await fetch(chatWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ text })
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Webhook error: ${res.status} - ${errText}`);
        }
        showNotification("Message sent to Google Chat space (via Webhook)!", "success");
        return true;
      } catch (err: any) {
        console.error("Error sending Google Chat webhook message:", err);
        showNotification("Could not send message via Webhook: " + err.message, "warning");
        return false;
      }
    }

    const token = googleChatToken;
    const targetSpace = spaceOverride || selectedSpace;
    if (!token) {
      showNotification("Please connect Google Chat or configure an Incoming Webhook URL first.", "warning");
      return false;
    }
    if (!targetSpace) {
      showNotification("Please select a Google Chat space first.", "warning");
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
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Google API error: ${res.status} - ${errText}`);
      }
      showNotification("Message sent to Google Chat space!", "success");
      return true;
    } catch (err: any) {
      console.error("Error sending Google Chat message:", err);
      showNotification("Could not send message: " + err.message, "warning");
      return false;
    }
  };

  // Request push notification permissions
  const requestPushPermission = async () => {
    if (!("Notification" in window)) {
      showNotification("Push notifications are not supported on this browser.", "warning");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        showNotification("Browser notification permission granted! Alerts are now active.", "success");
        new Notification("TMK Alerts Activated!", {
          body: "You will now receive push notifications at 80% and 100% budget utilization.",
          tag: "welcome-alert"
        });
      } else {
        showNotification("Notification permission denied or dismissed.", "warning");
      }
    } catch (e: any) {
      console.warn("Notification request failed: ", e);
      showNotification("Notification prompt failed or blocked.", "warning");
    }
  };

  // Save updated User Profile settings
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
          notifyAt80: notifyAt80,
          notifyAt100: notifyAt100,
          soundAlerts: soundAlerts,
          dailyReminders: dailyReminders,
          weeklyEmailReports: weeklyEmailReports
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
      showNotification("Preferences, custom cycles, and notifications saved!", "success");
    } catch (err: any) {
      console.error(err);
      showNotification("Failed to update profile: " + err.message, "warning");
    }
  };

  // Save updated Custom Period settings directly
  const handleSaveCustomCycleDirectly = async (enabled: boolean, start: string, end: string, budget: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        customPeriodEnabled: enabled,
        customPeriodStartDate: start,
        customPeriodEndDate: end,
        customPeriodBudget: Number(budget) || 0
      });
      setIsEditingCustomCycle(false);
      showNotification("Custom budget cycle saved successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showNotification("Failed to update custom cycle: " + err.message, "warning");
    }
  };

  // Save updated Active Budget settings inline from the bento widget
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
      showNotification("Monthly budget & billing period updated successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showNotification("Failed to update budget settings: " + err.message, "warning");
    }
  };

  // Bulk Import handler
  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const parsedExpenses = await parseImportFile(file);
      if (parsedExpenses.length === 0) {
        showNotification("No valid expenses found to import.", "info");
        return;
      }

      // Add each parsed expense to Firestore in batch simulated
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

      showNotification(`Successfully bulk-imported ${count} expenses!`, "success");
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || "Failed to import expenses.", "warning");
    } finally {
      // Clear target input value
      e.target.value = "";
    }
  };

  // Filter application helper
  const currencySymbol = profile?.currency || "₹";
  const activeBudget = profile?.monthlyBudget || 15000;

  // Memoize expenses grouped by date for fast calendar queries
  const expensesByDate = React.useMemo(() => {
    const map: Record<string, Expense[]> = {};
    expenses.forEach((exp) => {
      if (!map[exp.date]) {
        map[exp.date] = [];
      }
      map[exp.date].push(exp);
    });
    return map;
  }, [expenses]);

  // Calendar grid cell generator
  const getCalendarCells = () => {
    const cells = [];
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(calendarYear, calendarMonth, 0).getDate();

    // Previous month padding cells
    for (let i = firstDay - 1; i >= 0; i--) {
      const prevDay = prevMonthTotalDays - i;
      const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
      const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(prevDay).padStart(2, "0")}`;
      cells.push({
        day: prevDay,
        isCurrentMonth: false,
        dateStr,
      });
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({
        day,
        isCurrentMonth: true,
        dateStr,
      });
    }

    // Next month padding cells to complete standard 42-cell grid
    const totalGridCells = 42;
    const remaining = totalGridCells - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
      const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({
        day,
        isCurrentMonth: false,
        dateStr,
      });
    }

    return cells;
  };

  const filteredExpenses = expenses.filter((e) => {
    // Description Search
    const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase()) || 
                          e.category.toLowerCase().includes(search.toLowerCase()) || 
                          (e.notes || "").toLowerCase().includes(search.toLowerCase());
    
    // Category Filter
    const matchesCategory = categoryFilter === "All" || e.category === categoryFilter;

    // Payment Filter
    const matchesPayment = paymentFilter === "All" || e.paymentMode === paymentFilter;

    // Amount Range Filter
    const amt = e.amount;
    const matchesMinAmount = minAmount === "" || amt >= parseFloat(minAmount);
    const matchesMaxAmount = maxAmount === "" || amt <= parseFloat(maxAmount);

    // Date / Period Filter
    // Date is format YYYY-MM-DD
    const expenseDate = new Date(e.date);
    const yearStr = expenseDate.getFullYear().toString();
    const monthStr = (expenseDate.getMonth() + 1).toString().padStart(2, "0"); // "01", "02"...

    const matchesYear = yearFilter === "All" || yearStr === yearFilter;
    const matchesMonth = monthFilter === "All" || monthStr === monthFilter;

    // Custom manual date range filters
    const matchesStartDate = startDateFilter === "" || e.date >= startDateFilter;
    const matchesEndDate = endDateFilter === "" || e.date <= endDateFilter;

    return matchesSearch && matchesCategory && matchesPayment && matchesMinAmount && matchesMaxAmount && matchesYear && matchesMonth && matchesStartDate && matchesEndDate;
  });

  // Calculate high-level financial stats based on filtered selection
  const totalSpentFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const noOfTransactions = filteredExpenses.length;
  
  // Calculate stats based specifically on the current calendar month
  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  const currentMonthExpenses = expenses.filter(e => e.date.substring(0, 7) === currentMonthStr);
  const totalSpentCurrentMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = Math.max(0, activeBudget - totalSpentCurrentMonth);
  const currentMonthTransactionsCount = currentMonthExpenses.length;

  // Extract Category distribution for Pie Chart (filtered dataset)
  const categoryChartData = Object.entries(
    filteredExpenses.reduce((acc: Record<string, number>, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number }));

  // Dynamic analytic calculations
  const highestExpense = filteredExpenses.length > 0 ? Math.max(...filteredExpenses.map(e => e.amount)) : 0;
  const lowestExpense = filteredExpenses.length > 0 ? Math.min(...filteredExpenses.map(e => e.amount)) : 0;
  const averageDailySpent = filteredExpenses.length > 0 ? (totalSpentFiltered / (filteredExpenses.length || 1)) : 0;

  // Group trend chart data by Date (Line Chart)
  const trendChartRaw = filteredExpenses.reduce((acc: Record<string, number>, e) => {
    acc[e.date] = (acc[e.date] || 0) + e.amount;
    return acc;
  }, {});
  // Convert to array and sort chronologically
  const trendChartData = Object.entries(trendChartRaw)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Monthly Comparison grouping for Bar Chart
  const monthlyBarRaw = expenses.reduce((acc: Record<string, number>, e) => {
    const monthYear = e.date.substring(0, 7); // YYYY-MM
    acc[monthYear] = (acc[monthYear] || 0) + e.amount;
    return acc;
  }, {});
  const monthlyBarData = Object.entries(monthlyBarRaw)
    .map(([month, amount]) => {
      const [y, m] = month.split("-");
      const monthLabel = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'short' }) + " " + y;
      return { month: monthLabel, amount, rawDate: month };
    })
    .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
    .slice(-6); // Limit to last 6 months

  // Get total spent and top transaction for a specific raw month (e.g., "2026-07")
  const getMonthlyDetails = (rawMonth: string) => {
    const monthExpenses = expenses.filter(e => e.date.substring(0, 7) === rawMonth);
    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const topTx = monthExpenses.length > 0 
      ? [...monthExpenses].sort((a, b) => b.amount - a.amount)[0]
      : null;
    return { total, topTx, count: monthExpenses.length };
  };

  // Real-time spending overview (Daily/weekly/monthly)
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const date = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${date}`;
  };
  
  const todayStr = getLocalDateString(new Date());
  
  // Calculate yesterday's date string
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  
  // 1. Today's Spent
  const todaySpent = expenses
    .filter(e => e.date === todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  // 2. Yesterday's Spent
  const yesterdaySpent = expenses
    .filter(e => e.date === yesterdayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  // 3. Weekly Spent (Last 7 days, including today)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = getLocalDateString(sevenDaysAgo);
  const weeklySpent = expenses
    .filter(e => e.date >= sevenDaysAgoStr && e.date <= todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  // Custom tracking period/cycle calculations (e.g., 23 June to 23 July)
  const isCustomCycleActive = !!profile?.customPeriodEnabled;
  const customCycleBudget = profile?.customPeriodBudget || 15000;
  const customCycleStart = profile?.customPeriodStartDate || "2026-06-23";
  const customCycleEnd = profile?.customPeriodEndDate || "2026-07-23";

  const customCycleExpenses = expenses.filter(
    (e) => e.date >= customCycleStart && e.date <= customCycleEnd
  );
  const customCycleSpent = customCycleExpenses.reduce((sum, e) => sum + e.amount, 0);
  const customCycleRemaining = Math.max(0, customCycleBudget - customCycleSpent);
  const customCycleProgress = customCycleBudget > 0 ? (customCycleSpent / customCycleBudget) * 100 : 0;

  // Calculate days remaining in custom cycle
  const getDaysRemainingOrDiff = (endStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endStr);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  const customCycleDaysLeft = getDaysRemainingOrDiff(customCycleEnd);

  // Comparison (Period A vs Period B)
  const getPeriodStats = (start: string, end: string) => {
    if (!start || !end) return { total: 0, count: 0, avg: 0 };
    const filtered = expenses.filter(e => e.date >= start && e.date <= end);
    const total = filtered.reduce((sum, e) => sum + e.amount, 0);
    const count = filtered.length;
    const avg = count > 0 ? total / count : 0;
    return { total, count, avg };
  };

  const compStatsA = getPeriodStats(compStartA, compEndA);
  const compStatsB = getPeriodStats(compStartB, compEndB);

  const calculatePctDiff = (valA: number, valB: number) => {
    if (valA === 0) return valB > 0 ? 100 : 0;
    return ((valB - valA) / valA) * 100;
  };

  const compTotalDiff = calculatePctDiff(compStatsA.total, compStatsB.total);
  const compCountDiff = calculatePctDiff(compStatsA.count, compStatsB.count);
  const compAvgDiff = calculatePctDiff(compStatsA.avg, compStatsB.avg);

  // Default values for comparison dates setup effect
  useEffect(() => {
    if (!compStartA && expenses.length > 0) {
      const now = new Date();
      
      // Period B: Current month to today
      const yearB = now.getFullYear();
      const monthB = String(now.getMonth() + 1).padStart(2, '0');
      const startB = `${yearB}-${monthB}-01`;
      
      const lastDayB = new Date(yearB, now.getMonth() + 1, 0).getDate();
      const endB = `${yearB}-${monthB}-${String(lastDayB).padStart(2, '0')}`;
      
      // Period A: Previous month
      const prevMonthDate = new Date();
      prevMonthDate.setMonth(now.getMonth() - 1);
      const yearA = prevMonthDate.getFullYear();
      const monthA = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
      const startA = `${yearA}-${monthA}-01`;
      
      const lastDayA = new Date(yearA, prevMonthDate.getMonth() + 1, 0).getDate();
      const endA = `${yearA}-${monthA}-${String(lastDayA).padStart(2, '0')}`;
      
      setCompStartA(startA);
      setCompEndA(endA);
      setCompStartB(startB);
      setCompEndB(endB);
    }
  }, [expenses, compStartA]);

  // Unique lists for filter dropdown selections
  const availableCategories = Array.from(new Set([
    "Food", "PG", "Travel", "Auto", "Cab", "Tea", "Shopping", "Medicine", "Fuel", "Entertainment", "Bills", "Miscellaneous",
    ...(profile?.customCategories || []),
    ...expenses.map(e => e.category)
  ]));

  const availableYears = Array.from(new Set(
    expenses.map((e) => new Date(e.date).getFullYear().toString())
  )).sort((a: string, b: string) => b.localeCompare(a));

  if (loading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-400">Loading TMK secure workspaces...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onSuccess={() => showNotification("Welcome back! App initialized.", "success")} />;
  }

  return (
    <div className={`min-h-screen ${darkMode ? "bg-[#020617] text-[#f8fafc]" : "bg-slate-50 text-slate-900"} transition-colors duration-300 relative`}>
      
      {/* Decorative Grid Mesh */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Real-time Toast Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 max-w-lg ${
              notification.type === "warning"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : notification.type === "info"
                ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}
          >
            {notification.type === "warning" ? (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            ) : notification.type === "info" ? (
              <Info className="w-5 h-5 shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 shrink-0" />
            )}
            <span className="text-xs font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-white/10 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* APP HEADER */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b ${
        darkMode ? "bg-[#0f172a]/80 border-slate-800" : "bg-white/80 border-slate-200"
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 shrink-0">
              <Wallet2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className={`text-sm sm:text-base font-bold tracking-tight flex items-center gap-1 sm:gap-1.5 ${
                darkMode ? "text-white" : "text-slate-900"
              }`}>
                TMK Expense <span className="hidden sm:inline">Tracker</span>
                <span className="hidden min-[450px]:inline-block text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                  Analytics
                </span>
              </h1>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium leading-none mt-0.5">Smart Budgeting</p>
            </div>
          </div>

          {/* Quick Actions Container */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            
            {/* Gemini Insights Launch Icon */}
            <button
              id="ai-insights-trigger-btn"
              onClick={() => setIsAiOpen(true)}
              className="relative p-2 sm:p-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-xs transition duration-200 flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 hover:scale-[1.02] cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4 animate-pulse shrink-0" />
              <span className="hidden md:inline">AI Advisor</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              id="dark-mode-toggle-btn"
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all hover:scale-[1.01] cursor-pointer shrink-0 ${
                darkMode 
                  ? "bg-slate-850 border-slate-700/60 text-emerald-400 hover:bg-slate-800" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {darkMode ? <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
            </button>

            {/* User Profile Action Menu Trigger */}
            <button
              id="user-profile-menu-trigger"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`flex items-center gap-1.5 p-1.5 sm:pl-3 border rounded-xl transition cursor-pointer shrink-0 ${
                darkMode 
                  ? "bg-slate-850 border-slate-700/60 text-slate-200 hover:bg-slate-850/80" 
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="hidden md:inline text-xs font-semibold max-w-[100px] truncate">
                {profile?.name || "Settings"}
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/20 shrink-0">
                {profile?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Logout Trigger */}
            <button
              id="logout-header-btn"
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 sm:p-2.5 rounded-xl hover:bg-rose-500/10 text-rose-400 transition cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>

        </div>
      </header>

      {/* MAIN SCREEN BENTO GRID */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-12 gap-5"
      >
        
        {/* ROW 1: 4 BENTO STATS CARDS */}
        <motion.div variants={cardVariants} className={`col-span-12 sm:col-span-6 lg:col-span-3 transition-all duration-300 flex items-center justify-between ${
          darkMode ? "bento-card-dark" : "bento-card-light"
        }`}>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Spent (Filtered)</p>
            <h3 className={`text-2xl font-extrabold mt-2 ${darkMode ? "text-[#f8fafc]" : "text-slate-900"}`}>
              {currencySymbol}{totalSpentFiltered.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Based on active filters</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={cardVariants} className={`col-span-12 sm:col-span-6 lg:col-span-3 transition-all duration-300 flex items-center justify-between ${
          darkMode ? "bento-card-dark" : "bento-card-light"
        }`}>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Top Spending Item</p>
            <h3 className={`text-2xl font-extrabold mt-2 truncate max-w-[160px] ${darkMode ? "text-[#f8fafc]" : "text-slate-900"}`}>
              {currencySymbol}{highestExpense.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Highest logged single cost</p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <TrendingUp className="w-5 h-5 rotate-90" />
          </div>
        </motion.div>

        <motion.div variants={cardVariants} className={`col-span-12 sm:col-span-6 lg:col-span-3 transition-all duration-300 flex items-center justify-between ${
          darkMode ? "bento-card-dark" : "bento-card-light"
        }`}>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Avg Spending (Filtered)</p>
            <h3 className={`text-2xl font-extrabold mt-2 ${darkMode ? "text-[#f8fafc]" : "text-slate-900"}`}>
              {currencySymbol}{averageDailySpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Per transaction average cost</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={cardVariants} className={`col-span-12 sm:col-span-6 lg:col-span-3 transition-all duration-300 flex items-center justify-between ${
          darkMode ? "bento-card-dark" : "bento-card-light"
        }`}>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Transactions Count</p>
            <h3 className={`text-2xl font-extrabold mt-2 ${darkMode ? "text-[#f8fafc]" : "text-slate-900"}`}>
              {noOfTransactions}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Matches active filter parameters</p>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
        </motion.div>

        {/* ROW 1.5: ADVANCED ANALYTICS & BUDGET CYCLES */}
        <div className="col-span-12 grid grid-cols-12 gap-5">
          
          {/* Card 1: Real-time Spending Breakdown */}
          <motion.div variants={cardVariants} className={`col-span-12 md:col-span-4 transition-all duration-300 p-5 rounded-2xl border flex flex-col justify-between ${
            darkMode ? "bg-slate-900/60 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800 shadow-sm"
          }`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className={`font-bold text-sm ${darkMode ? "text-[#f8fafc]" : "text-slate-900"}`}>Real-Time Overview</h3>
                  <p className="text-[11px] text-slate-400">Current dynamic spending cycles</p>
                </div>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-2.5 mt-2">
                <div className="flex justify-between items-center text-xs pb-1.5 border-b border-slate-800/20">
                  <span className="text-slate-400">Today's Spent</span>
                  <span className={`font-mono font-bold ${todaySpent > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                    {currencySymbol}{todaySpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pb-1.5 border-b border-slate-800/20">
                  <span className="text-slate-400">Yesterday's Spent</span>
                  <span className="font-mono text-slate-400 font-semibold">
                    {currencySymbol}{yesterdaySpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pb-1.5 border-b border-slate-800/20">
                  <span className="text-slate-400">Weekly Spent (Last 7d)</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {currencySymbol}{weeklySpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pb-1">
                  <span className="text-slate-400">Monthly Spent</span>
                  <span className="font-mono text-indigo-400 font-extrabold">
                    {currencySymbol}{totalSpentCurrentMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-2 border-t border-slate-800/20 flex justify-between items-center text-[10px] text-slate-500">
              <span>Automatic real-time calculation</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-0.5 animate-pulse">
                ● Live Sync
              </span>
            </div>
          </motion.div>

          {/* Card 2: Custom Period Cycle Tracker (date customization example set amount 15000) */}
          <motion.div variants={cardVariants} className={`col-span-12 md:col-span-4 transition-all duration-300 p-5 rounded-2xl border flex flex-col justify-between ${
            darkMode ? "bg-slate-900/60 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800 shadow-sm"
          }`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className={`font-bold text-sm ${darkMode ? "text-[#f8fafc]" : "text-slate-900"}`}>Custom Budget Cycle</h3>
                  <p className="text-[11px] text-slate-400">Target goal tracking period</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    id="toggle-edit-custom-cycle-btn"
                    type="button"
                    onClick={() => {
                      if (!isEditingCustomCycle) {
                        // Populate with latest saved values
                        setCustomPeriodEnabled(!!profile?.customPeriodEnabled);
                        setCustomPeriodStartDate(profile?.customPeriodStartDate || "2026-06-23");
                        setCustomPeriodEndDate(profile?.customPeriodEndDate || "2026-07-23");
                        setCustomPeriodBudget(profile?.customPeriodBudget?.toString() || "15000");
                      }
                      setIsEditingCustomCycle(!isEditingCustomCycle);
                    }}
                    className={`text-[10px] px-2.5 py-1.5 rounded-lg font-extrabold tracking-wide uppercase transition cursor-pointer border ${
                      isEditingCustomCycle
                        ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30"
                        : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {isEditingCustomCycle ? "Cancel" : "Configure"}
                  </button>
                  <div className={`p-2 rounded-lg ${isCustomCycleActive ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {isEditingCustomCycle ? (
                <div className="space-y-3 mt-1.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/20">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Configure Period</span>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={customPeriodEnabled}
                        onChange={(e) => setCustomPeriodEnabled(e.target.checked)}
                        className="rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500/20 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-300 font-bold">Enabled</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Start Date</label>
                      <input
                        type="date"
                        value={customPeriodStartDate}
                        onChange={(e) => setCustomPeriodStartDate(e.target.value)}
                        className={`w-full border rounded-lg p-1.5 text-xs focus:outline-none focus:border-emerald-500 ${
                          darkMode ? "bg-slate-950/60 border-slate-850 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">End Date</label>
                      <input
                        type="date"
                        value={customPeriodEndDate}
                        onChange={(e) => setCustomPeriodEndDate(e.target.value)}
                        className={`w-full border rounded-lg p-1.5 text-xs focus:outline-none focus:border-emerald-500 ${
                          darkMode ? "bg-slate-950/60 border-slate-850 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Budget Limit ({currencySymbol})</label>
                    <input
                      type="number"
                      value={customPeriodBudget}
                      onChange={(e) => setCustomPeriodBudget(e.target.value)}
                      placeholder="e.g. 15000"
                      className={`w-full border rounded-lg p-1.5 text-xs focus:outline-none focus:border-emerald-500 ${
                        darkMode ? "bg-slate-950/60 border-slate-855 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                      }`}
                    />
                  </div>

                  <div className="pt-1 flex items-center gap-2">
                    <button
                      id="save-custom-cycle-inline-btn"
                      type="button"
                      onClick={() => handleSaveCustomCycleDirectly(customPeriodEnabled, customPeriodStartDate, customPeriodEndDate, customPeriodBudget)}
                      className="flex-1 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold text-center cursor-pointer transition shadow-md"
                    >
                      Save Cycle
                    </button>
                    <button
                      id="cancel-custom-cycle-inline-btn"
                      type="button"
                      onClick={() => {
                        setCustomPeriodEnabled(!!profile?.customPeriodEnabled);
                        setCustomPeriodStartDate(profile?.customPeriodStartDate || "2026-06-23");
                        setCustomPeriodEndDate(profile?.customPeriodEndDate || "2026-07-23");
                        setCustomPeriodBudget(profile?.customPeriodBudget?.toString() || "15000");
                        setIsEditingCustomCycle(false);
                      }}
                      className={`py-1.5 px-3 border rounded-lg text-xs font-bold cursor-pointer transition ${
                        darkMode 
                          ? "border-slate-800 hover:bg-slate-800 text-slate-400" 
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : isCustomCycleActive ? (
                <div className="space-y-3 mt-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">
                      {new Date(customCycleStart).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} - {new Date(customCycleEnd).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      Goal: {currencySymbol}{customCycleBudget.toLocaleString()}
                    </span>
                  </div>

                  {/* Custom Progress Bar */}
                  <div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          customCycleProgress > 100 
                            ? "bg-rose-500" 
                            : customCycleProgress > 80 
                            ? "bg-amber-500" 
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, customCycleProgress)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1.5">
                      <span>Spent: {currencySymbol}{customCycleSpent.toLocaleString()} ({customCycleProgress.toFixed(0)}%)</span>
                      <span>Left: {currencySymbol}{customCycleRemaining.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Pace Indicator & Days left */}
                  <div className="flex items-center justify-between text-[11px] bg-slate-950/20 p-2 rounded-xl border border-slate-800/10">
                    <span className="text-slate-400">
                      {customCycleDaysLeft > 0 ? `${customCycleDaysLeft} days remaining` : "Cycle completed"}
                    </span>
                    {customCycleSpent > customCycleBudget ? (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> Over Limit!
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 shrink-0" /> On Track
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500 italic text-xs">
                  <p className="mb-2">Custom cycle budget is inactive.</p>
                  <button 
                    onClick={() => {
                      setCustomPeriodEnabled(true);
                      setIsEditingCustomCycle(true);
                    }}
                    className="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition"
                  >
                    Configure In-Card
                  </button>
                </div>
              )}
            </div>

            {isCustomCycleActive && !isEditingCustomCycle && (
              <div className="mt-4 pt-2 border-t border-slate-800/20 flex gap-2">
                <button
                  onClick={() => {
                    setStartDateFilter(customCycleStart);
                    setEndDateFilter(customCycleEnd);
                    setMonthFilter("All");
                    setYearFilter("All");
                    showNotification("Applied custom cycle date filter to spreadsheet!", "success");
                  }}
                  className={`flex-1 py-1 px-2.5 rounded-lg text-[10px] font-bold text-center border cursor-pointer transition ${
                    startDateFilter === customCycleStart && endDateFilter === customCycleEnd
                      ? "bg-emerald-500 text-slate-950 border-emerald-500"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                  }`}
                >
                  Apply Cycle Filter
                </button>
                {(startDateFilter !== "" || endDateFilter !== "") && (
                  <button
                    onClick={() => {
                      setStartDateFilter("");
                      setEndDateFilter("");
                      showNotification("Cleared date range filters", "info");
                    }}
                    className="py-1 px-2 border border-slate-700/60 hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 rounded-lg text-[10px] font-bold cursor-pointer transition"
                    title="Clear filters"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            )}
          </motion.div>

          {/* Card 3: Custom Date Comparison Selector & Scorecard */}
          <motion.div variants={cardVariants} className={`col-span-12 md:col-span-4 transition-all duration-300 p-5 rounded-2xl border flex flex-col justify-between ${
            darkMode ? "bg-slate-900/60 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800 shadow-sm"
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className={`font-bold text-sm ${darkMode ? "text-[#f8fafc]" : "text-slate-900"}`}>Period Comparison</h3>
                  <p className="text-[11px] text-slate-400">Compare any custom ranges side-by-side</p>
                </div>
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <Filter className="w-4 h-4" />
                </div>
              </div>

              {/* Range Selectors */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-[8px] uppercase tracking-wider font-bold text-slate-500 mb-0.5">Range A (Base)</label>
                  <div className="space-y-1">
                    <input 
                      type="date" 
                      value={compStartA}
                      onChange={(e) => setCompStartA(e.target.value)}
                      className={`w-full border rounded-lg p-1 text-[9px] focus:outline-none focus:border-emerald-500 ${
                        darkMode ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                      }`}
                    />
                    <input 
                      type="date" 
                      value={compEndA}
                      onChange={(e) => setCompEndA(e.target.value)}
                      className={`w-full border rounded-lg p-1 text-[9px] focus:outline-none focus:border-emerald-500 ${
                        darkMode ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                      }`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[8px] uppercase tracking-wider font-bold text-slate-500 mb-0.5">Range B (Compare)</label>
                  <div className="space-y-1">
                    <input 
                      type="date" 
                      value={compStartB}
                      onChange={(e) => setCompStartB(e.target.value)}
                      className={`w-full border rounded-lg p-1 text-[9px] focus:outline-none focus:border-emerald-500 ${
                        darkMode ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                      }`}
                    />
                    <input 
                      type="date" 
                      value={compEndB}
                      onChange={(e) => setCompEndB(e.target.value)}
                      className={`w-full border rounded-lg p-1 text-[9px] focus:outline-none focus:border-emerald-500 ${
                        darkMode ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Side-by-Side Statistics */}
              <div className="space-y-1.5 mt-3 pt-2.5 border-t border-slate-800/10">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Total Spent</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500 text-[10px]">{currencySymbol}{compStatsA.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    <span className="text-slate-400 font-semibold">&rarr;</span>
                    <span className={`font-bold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{currencySymbol}{compStatsB.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                      compTotalDiff <= 0 
                        ? "bg-emerald-500/10 text-emerald-400" 
                        : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {compTotalDiff >= 0 ? "+" : ""}{compTotalDiff.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Transactions</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500 text-[10px]">{compStatsA.count}</span>
                    <span className="text-slate-400 font-semibold">&rarr;</span>
                    <span className={`font-bold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{compStatsB.count}</span>
                    <span className={`text-[10px] font-semibold px-1 py-0.5 rounded ${
                      darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                    }`}>
                      {compCountDiff >= 0 ? "+" : ""}{compCountDiff.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2.5 text-[9px] text-slate-500 italic text-right">
              Comparison dates automatically update statistics.
            </div>
          </motion.div>

        </div>

        {/* ROW 2: SPENDING TREND AREA CHART (8 columns) & ACTIVE MONTHLY BUDGET BLOCK (4 columns) */}
        {/* Main Line / Area Trend Chart */}
        <motion.div variants={cardVariants} className={`col-span-12 lg:col-span-8 flex flex-col justify-between transition-all duration-300 ${
          darkMode ? "bento-card-dark" : "bento-card-light"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-800/10">
            <div>
              <h3 className={`font-bold text-base ${darkMode ? "text-[#f8fafc]" : "text-slate-900"}`}>
                {trendViewMode === "chart" ? "Expense Spending Trend" : "Interactive Calendar View"}
              </h3>
              <p className="text-xs text-slate-400">
                {trendViewMode === "chart" 
                  ? "Interactive visual timeline of transactions" 
                  : "Click any date to see exact expenses and track daily spending density"
                }
              </p>
            </div>

            {/* Toggle Switch */}
            <div className={`flex items-center p-0.5 rounded-xl border ${
              darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-100 border-slate-200"
            }`}>
              <button
                id="toggle-trend-chart-view"
                type="button"
                onClick={() => setTrendViewMode("chart")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  trendViewMode === "chart"
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : darkMode 
                      ? "text-slate-400 hover:text-slate-200" 
                      : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Timeline Chart</span>
              </button>
              <button
                id="toggle-trend-calendar-view"
                type="button"
                onClick={() => setTrendViewMode("calendar")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  trendViewMode === "calendar"
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : darkMode 
                      ? "text-slate-400 hover:text-slate-200" 
                      : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Calendar Grid</span>
              </button>
            </div>
          </div>

          {trendViewMode === "chart" ? (
            <div className="h-52 sm:h-64 md:h-72 w-full mt-auto">
              {trendChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart 
                    data={trendChartData}
                    margin={{
                      top: 5,
                      right: isMobile ? 10 : 20,
                      left: isMobile ? -15 : 0,
                      bottom: 0
                    }}
                  >
                    <defs>
                      <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      fontSize={windowWidth < 480 ? 8.5 : (isMobile ? 9 : 11)}
                      tickLine={false} 
                      minTickGap={windowWidth < 360 ? 70 : (windowWidth < 480 ? 55 : (isMobile ? 35 : 15))}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={isMobile ? 9 : 11}
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(v) => `${currencySymbol}${v}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: darkMode ? "#1e293b" : "#ffffff", 
                        border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`,
                        borderRadius: "12px",
                        color: darkMode ? "#f8fafc" : "#0f172a" 
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorSpent)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                  No historical data to display. Please log transaction records.
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-4 w-full mt-2">
              {/* Calendar Grid Column */}
              <div className="col-span-12 md:col-span-7 lg:col-span-8 space-y-3">
                {/* Calendar Month & Year Selector Header */}
                <div className="flex items-center justify-between p-1 bg-slate-950/20 rounded-xl border border-slate-800/10">
                  <button
                    id="calendar-prev-month-btn"
                    type="button"
                    onClick={() => {
                      if (calendarMonth === 0) {
                        setCalendarMonth(11);
                        setCalendarYear(prev => prev - 1);
                      } else {
                        setCalendarMonth(prev => prev - 1);
                      }
                    }}
                    className={`p-1 rounded-lg border transition cursor-pointer ${
                      darkMode 
                        ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300" 
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className={`text-xs font-extrabold tracking-wide uppercase ${darkMode ? "text-slate-200" : "text-slate-850"}`}>
                    {MONTH_NAMES[calendarMonth]} {calendarYear}
                  </span>

                  <button
                    id="calendar-next-month-btn"
                    type="button"
                    onClick={() => {
                      if (calendarMonth === 11) {
                        setCalendarMonth(0);
                        setCalendarYear(prev => prev + 1);
                      } else {
                        setCalendarMonth(prev => prev + 1);
                      }
                    }}
                    className={`p-1 rounded-lg border transition cursor-pointer ${
                      darkMode 
                        ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300" 
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] uppercase tracking-wider text-slate-500">
                  {WEEK_DAYS.map(day => (
                    <div key={day} className="py-0.5">{day}</div>
                  ))}
                </div>

                {/* Calendar Days cells */}
                <div className="grid grid-cols-7 gap-1">
                  {getCalendarCells().map((cell, idx) => {
                    const cellExpenses = expensesByDate[cell.dateStr] || [];
                    const cellTotal = cellExpenses.reduce((sum, e) => sum + e.amount, 0);
                    const isSelected = selectedCalendarDate === cell.dateStr;
                    
                    // Highlight style based on spend density
                    let densityBg = "";
                    if (cellTotal > 0) {
                      if (cellTotal > activeBudget * 0.1) {
                        densityBg = darkMode ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-100 text-rose-800 border-rose-200";
                      } else if (cellTotal > activeBudget * 0.03) {
                        densityBg = darkMode ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-100 text-amber-850 border-amber-200";
                      } else {
                        densityBg = darkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-100 text-emerald-800 border-emerald-200";
                      }
                    } else {
                      densityBg = cell.isCurrentMonth
                        ? darkMode ? "bg-slate-900/40 text-slate-400 border-slate-850" : "bg-slate-50/50 text-slate-500 border-slate-100"
                        : darkMode ? "bg-slate-950/20 text-slate-600 border-transparent opacity-40" : "bg-slate-100/30 text-slate-400 border-transparent opacity-40";
                    }

                    return (
                      <button
                        id={`calendar-cell-${cell.dateStr}`}
                        key={`${cell.dateStr}-${idx}`}
                        type="button"
                        onClick={() => setSelectedCalendarDate(cell.dateStr)}
                        className={`relative aspect-square flex flex-col items-center justify-between p-1 rounded-lg border text-center transition cursor-pointer ${densityBg} ${
                          isSelected 
                            ? "ring-2 ring-emerald-500 border-emerald-500 scale-102 z-10" 
                            : "hover:scale-101 hover:border-slate-500"
                        }`}
                      >
                        {/* Day number */}
                        <span className="text-[10px] font-bold self-start pl-0.5">{cell.day}</span>
                        
                        {/* Optional total spending label */}
                        {cellTotal > 0 && (
                          <span className="text-[8px] font-extrabold font-mono truncate max-w-full leading-none mb-0.5">
                            {currencySymbol}{cellTotal.toFixed(0)}
                          </span>
                        )}

                        {/* Spend Dot Indicator */}
                        {cellTotal > 0 && (
                          <span className={`w-1 h-1 rounded-full ${
                            cellTotal > activeBudget * 0.1 ? "bg-rose-500" : cellTotal > activeBudget * 0.03 ? "bg-amber-500" : "bg-emerald-500"
                          }`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Density Legend */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[9px] text-slate-400 font-medium">
                  <span>Legend:</span>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-emerald-500/10 border border-emerald-500/20" />
                    <span>Low Spend</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-amber-500/10 border border-amber-500/20" />
                    <span>Medium Spend</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-rose-500/10 border border-rose-500/20" />
                    <span>High Spend (&gt;10% budget)</span>
                  </div>
                </div>
              </div>

              {/* Selected Day Inspector Panel Column */}
              <div className={`col-span-12 md:col-span-5 lg:col-span-4 p-3 rounded-xl border flex flex-col justify-between ${
                darkMode ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}>
                {(() => {
                  const dayExpList = expensesByDate[selectedCalendarDate] || [];
                  const dayTotalAmt = dayExpList.reduce((sum, e) => sum + e.amount, 0);
                  
                  const formattedDate = (() => {
                    try {
                      const [y, m, d] = selectedCalendarDate.split("-");
                      const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                      return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                    } catch (e) {
                      return selectedCalendarDate;
                    }
                  })();

                  return (
                    <div className="flex flex-col h-full justify-between space-y-3">
                      <div>
                        {/* Date Header */}
                        <div className="flex items-center justify-between border-b border-slate-800/20 pb-1.5 mb-2">
                          <div>
                            <h4 className={`text-xs font-extrabold ${darkMode ? "text-slate-200" : "text-slate-850"}`}>
                              {formattedDate}
                            </h4>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Day Breakdown</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-slate-500 block">Total Spent</span>
                            <span className={`text-xs font-mono font-extrabold ${dayTotalAmt > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                              {currencySymbol}{dayTotalAmt.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>

                        {/* Expenses List */}
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {dayExpList.length > 0 ? (
                            dayExpList.map((exp) => (
                              <div 
                                key={exp.id || exp.createdAt?.toString()} 
                                className={`p-2 rounded-lg border flex items-center justify-between text-[11px] transition ${
                                  darkMode 
                                    ? "bg-slate-900/50 border-slate-850 hover:bg-slate-900" 
                                    : "bg-white border-slate-100 hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    exp.paymentMode === "UPI" ? "bg-indigo-500" : "bg-emerald-500"
                                  }`} />
                                  <div className="truncate">
                                    <div className={`font-bold truncate ${darkMode ? "text-slate-200" : "text-slate-850"}`}>
                                      {exp.description}
                                    </div>
                                    <div className="text-[8px] text-slate-500 flex items-center gap-1 font-semibold">
                                      <span className="uppercase tracking-wider">{exp.category}</span>
                                      <span>•</span>
                                      <span>{exp.paymentMode}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0 pl-1.5">
                                  <div className={`font-mono font-bold ${darkMode ? "text-slate-200" : "text-slate-850"}`}>
                                    {currencySymbol}{exp.amount.toFixed(0)}
                                  </div>
                                  <div className="flex gap-1 justify-end mt-0.5">
                                    <button
                                      id={`calendar-edit-btn-${exp.id}`}
                                      type="button"
                                      onClick={() => {
                                        setExpenseToEdit(exp);
                                        setIsModalOpen(true);
                                      }}
                                      className="text-[8px] text-slate-500 hover:text-emerald-400 font-bold"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-6 text-center text-slate-500 italic text-[10px] flex flex-col items-center justify-center gap-1">
                              <Info className="w-4 h-4 text-slate-600" />
                              <span>No expenses logged.</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Day Action Buttons */}
                      <div className="pt-2 border-t border-slate-800/10 flex flex-col gap-1.5 mt-auto">
                        <button
                          id="calendar-add-expense-for-date"
                          type="button"
                          onClick={() => {
                            setExpenseToEdit(null);
                            setIsModalOpen(true);
                          }}
                          className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[10px] rounded-lg transition duration-150 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Expense</span>
                        </button>
                        
                        <button
                          id="calendar-filter-table-to-date"
                          type="button"
                          onClick={() => {
                            setStartDateFilter(selectedCalendarDate);
                            setEndDateFilter(selectedCalendarDate);
                            showNotification(`Filtered transaction records by date: ${formattedDate}`, "success");
                            
                            const element = document.getElementById("search-filter-controls-header");
                            if (element) {
                              element.scrollIntoView({ behavior: "smooth" });
                            }
                          }}
                          className={`w-full py-1.5 border font-bold text-[10px] rounded-lg transition duration-150 flex items-center justify-center gap-1 cursor-pointer ${
                            darkMode 
                              ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300" 
                              : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          <Filter className="w-3 h-3" />
                          <span>Filter Table</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </motion.div>

        {/* BUDGET MODULE BLOCK */}
        <motion.div variants={cardVariants} className={`col-span-12 lg:col-span-4 flex flex-col justify-between transition-all duration-300 ${
          darkMode ? "bento-card-dark" : "bento-card-light"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className={`font-bold text-base ${darkMode ? "text-[#f8fafc]" : "text-slate-900"}`}>
                {isCustomCycleActive ? "Active Cycle Budget" : "Active Monthly Budget"}
              </h3>
              <p className="text-xs text-slate-400">
                {isCustomCycleActive 
                  ? `${new Date(customCycleStart).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} - ${new Date(customCycleEnd).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
                  : "Smart budgeting limit check"}
              </p>
            </div>
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
              className={`p-2 rounded-xl transition-all cursor-pointer border ${
                isEditingActiveBudgetBlock
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  : "bg-slate-500/10 text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-500/20"
              }`}
              title="Edit Budget and Cycle"
            >
              {isEditingActiveBudgetBlock ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
            </button>
          </div>

          {isEditingActiveBudgetBlock ? (
            <div className="space-y-4 my-auto py-2">
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Budget Limit ({currencySymbol})
                </label>
                <input
                  type="number"
                  value={activeBudgetLimitInput}
                  onChange={(e) => setActiveBudgetLimitInput(e.target.value)}
                  placeholder="e.g. 15000"
                  className={`w-full border rounded-xl p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    darkMode ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                  }`}
                />
              </div>

              <div className="space-y-1.5 border-t border-slate-800/15 pt-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={activeBudgetUseCustomInput}
                    onChange={(e) => setActiveBudgetUseCustomInput(e.target.checked)}
                    className="rounded text-blue-500 bg-slate-950 border-slate-800 focus:ring-blue-500/20 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-300 font-bold">Use Custom Start & End Dates</span>
                </label>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Enable custom billing period cycle rather than default full calendar months.
                </p>
              </div>

              {activeBudgetUseCustomInput && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      Cycle Start
                    </label>
                    <input
                      type="date"
                      value={activeBudgetStartInput}
                      onChange={(e) => setActiveBudgetStartInput(e.target.value)}
                      className={`w-full border rounded-xl p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                        darkMode ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      Cycle End
                    </label>
                    <input
                      type="date"
                      value={activeBudgetEndInput}
                      onChange={(e) => setActiveBudgetEndInput(e.target.value)}
                      className={`w-full border rounded-xl p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                        darkMode ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                      }`}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveActiveBudgetInline(activeBudgetLimitInput, activeBudgetUseCustomInput, activeBudgetStartInput, activeBudgetEndInput)}
                  className="flex-1 py-2 px-3 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                >
                  Save Settings
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingActiveBudgetBlock(false)}
                  className={`py-2 px-3 border rounded-xl text-xs font-bold transition cursor-pointer ${
                    darkMode 
                      ? "border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200" 
                      : "border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800"
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Gorgeous Circular Progress Indicator */}
              <div className="flex flex-col items-center justify-center py-4 my-auto">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className={`${darkMode ? "text-slate-800/80" : "text-slate-200"}`}
                      strokeWidth="3.2"
                      stroke="currentColor"
                      fill="none"
                      strokeDasharray="100, 100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={`${
                        (isCustomCycleActive ? customCycleSpent : totalSpentCurrentMonth) > (isCustomCycleActive ? customCycleBudget : activeBudget) 
                          ? "text-rose-500" 
                          : (isCustomCycleActive ? customCycleProgress : (totalSpentCurrentMonth / activeBudget) * 100) > 85
                          ? "text-amber-500"
                          : "text-emerald-500"
                      }`}
                      strokeWidth="3.2"
                      strokeDasharray={`${Math.min(100, (isCustomCycleActive ? customCycleBudget : activeBudget) > 0 ? (isCustomCycleActive ? customCycleProgress : (totalSpentCurrentMonth / activeBudget) * 100) : 0)}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className={`text-2xl font-extrabold ${darkMode ? "text-[#f8fafc]" : "text-slate-900"}`}>
                      {(isCustomCycleActive ? customCycleProgress : (totalSpentCurrentMonth / activeBudget) * 100).toFixed(0)}%
                    </span>
                    <span className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">Used</span>
                  </div>
                </div>
              </div>

              {/* Budget status metrics */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs border-b border-slate-800/30 pb-2">
                  <span className="text-slate-400">Limit</span>
                  <span className={`font-bold ${darkMode ? "text-[#f8fafc]" : "text-slate-900"}`}>
                    {currencySymbol}{(isCustomCycleActive ? customCycleBudget : activeBudget).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-slate-800/30 pb-2">
                  <span className="text-slate-400">
                    {isCustomCycleActive ? "Spent (Cycle)" : "Spent (Month)"}
                  </span>
                  <span className="font-bold text-emerald-400">
                    {currencySymbol}{(isCustomCycleActive ? customCycleSpent : totalSpentCurrentMonth).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pb-1">
                  <span className="text-slate-400">Remaining</span>
                  <span className={`font-bold ${(isCustomCycleActive ? customCycleRemaining : remainingBudget) === 0 ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                    {currencySymbol}{(isCustomCycleActive ? customCycleRemaining : remainingBudget).toLocaleString()}
                  </span>
                </div>

                {isCustomCycleActive && (
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 font-semibold border-t border-slate-800/20">
                    <span>Days Remaining:</span>
                    <span className="text-blue-400">
                      {customCycleDaysLeft > 0 ? `${customCycleDaysLeft} days` : "Ended / Last Day"}
                    </span>
                  </div>
                )}

                {(isCustomCycleActive ? customCycleSpent : totalSpentCurrentMonth) > (isCustomCycleActive ? customCycleBudget : activeBudget) && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[10px] flex items-center gap-1.5 mt-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-bounce" />
                    <span>Over budget by {currencySymbol}{((isCustomCycleActive ? customCycleSpent : totalSpentCurrentMonth) - (isCustomCycleActive ? customCycleBudget : activeBudget)).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>

        {/* ROW 3: CATEGORY PIE CHART (4 columns), MONTHLY BAR CHART (4 columns), DATA ACTIONS (4 columns) */}
        {/* Category distribution (Pie Chart) */}
        <motion.div variants={cardVariants} className={`col-span-12 lg:col-span-4 flex flex-col justify-between transition-all duration-300 ${
          darkMode ? "bento-card-dark" : "bento-card-light"
        }`}>
          <div>
            <h3 className={`font-bold text-base ${darkMode ? "text-[#f8fafc]" : "text-slate-900"}`}>Category distribution</h3>
            <p className="text-xs text-slate-400">Percentage allocation of total spending</p>
          </div>

          <div className="h-48 w-full relative my-auto">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: darkMode ? "#1e293b" : "#ffffff", 
                      border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`,
                      borderRadius: "12px"
                    }}
                    itemStyle={{ color: darkMode ? "#f8fafc" : "#0f172a" }}
                    formatter={(value: any) => [`${currencySymbol}${parseFloat(value).toFixed(2)}`, "Spent"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                No categories logged.
              </div>
            )}
          </div>

          {/* Custom Interactive Legend with Percentage indicators */}
          <div className="overflow-y-auto max-h-[140px] pr-1 space-y-2 mt-2">
            {categoryChartData.map((entry, index) => {
              const percentage = totalSpentFiltered > 0 ? ((entry.value / totalSpentFiltered) * 100).toFixed(0) : "0";
              return (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className={`font-medium truncate max-w-[120px] ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-400">{currencySymbol}{entry.value.toFixed(0)}</span>
                    <span className="text-emerald-400 font-bold">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Monthly Comparison Bar Chart */}
        <motion.div variants={cardVariants} className={`col-span-12 lg:col-span-4 relative flex flex-col justify-between transition-all duration-300 ${
          darkMode ? "bento-card-dark" : "bento-card-light"
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="w-5 h-5 text-blue-500 animate-pulse-subtle shrink-0" />
              <h3 className={`font-bold text-base ${darkMode ? "text-[#f8fafc]" : "text-slate-900"}`}>Monthly Comparison</h3>
            </div>
            <p className="text-xs text-slate-400">Click a month bar or button below to inspect details</p>
          </div>

          <div className="h-44 sm:h-48 md:h-52 w-full my-auto mt-4">
            {monthlyBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart 
                  data={monthlyBarData}
                  margin={{
                    top: 5,
                    right: isMobile ? 10 : 20,
                    left: isMobile ? -15 : 0,
                    bottom: 0
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b" 
                    fontSize={isMobile ? 9 : 11} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={isMobile ? 9 : 11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(v) => `${currencySymbol}${v}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                    backgroundColor: darkMode ? "#1e293b" : "#ffffff", 
                    border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`,
                    borderRadius: "12px",
                    color: darkMode ? "#f8fafc" : "#0f172a"
                    }} 
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {monthlyBarData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === monthlyBarData.length - 1 ? "#10b981" : "#3b82f6"}
                        onClick={() => setSelectedMonthDetails(entry.rawDate)}
                        className="cursor-pointer hover:opacity-80 transition"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                No monthly spending logs.
              </div>
            )}
          </div>

          {/* Clickable Monthly Pills area */}
          {monthlyBarData.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800/10">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                Inspect Month
              </p>
              <div className="flex flex-wrap gap-1.5">
                {monthlyBarData.map((item) => (
                  <button
                    key={item.rawDate}
                    onClick={() => setSelectedMonthDetails(item.rawDate)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition cursor-pointer select-none ${
                      selectedMonthDetails === item.rawDate
                        ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                        : darkMode
                        ? "bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 text-slate-300 hover:text-slate-100"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{item.month}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Inspector Drawer Overlay */}
          <AnimatePresence>
            {selectedMonthDetails && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className={`absolute inset-0 z-20 p-5 rounded-2xl flex flex-col justify-between ${
                  darkMode 
                    ? "bg-slate-900/98 backdrop-blur-md border border-slate-800 text-slate-100" 
                    : "bg-white/98 backdrop-blur-md border border-slate-200 text-slate-800 shadow-xl"
                }`}
              >
                {/* Header with Close */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/10">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">
                        {(() => {
                          const [y, m] = selectedMonthDetails.split("-");
                          return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                        })()}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">Monthly spending breakdown</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedMonthDetails(null)}
                    className="p-1 rounded-lg hover:bg-slate-800/30 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content details */}
                {(() => {
                  const details = getMonthlyDetails(selectedMonthDetails);
                  return (
                    <div className="flex-1 my-3 flex flex-col justify-center space-y-3.5">
                      {/* Total Spent */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                            <DollarSign className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-medium">Total Spent</p>
                            <p className="text-xl font-black text-blue-500">{currencySymbol}{details.total.toLocaleString()}</p>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/15">
                          {details.count} txs
                        </span>
                      </div>

                      {/* Top Transaction */}
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Top Transaction</p>
                        {details.topTx ? (
                          <div className={`p-3 rounded-xl border ${darkMode ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                                  {details.topTx.category}
                                </span>
                                <span className="text-[10px] text-slate-500">{details.topTx.date}</span>
                              </div>
                              <span className={`text-sm font-black ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                                {currencySymbol}{details.topTx.amount.toLocaleString()}
                              </span>
                            </div>
                            <p className={`text-xs font-medium truncate ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                              {details.topTx.description}
                            </p>
                            {details.topTx.notes && (
                              <p className="text-[10px] text-slate-500 mt-1 italic truncate">
                                "{details.topTx.notes}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 italic py-2 text-center">
                            No transactions recorded this month.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Footer action */}
                <div className="text-center pt-2 border-t border-slate-800/10">
                  <button
                    onClick={() => {
                      const [y, m] = selectedMonthDetails.split("-");
                      setYearFilter(y);
                      setMonthFilter(m);
                      setSelectedMonthDetails(null);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
                  >
                    Filter Dashboard by this Month
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Quick Metrics & Actions panel */}
        <motion.div variants={cardVariants} className={`col-span-12 lg:col-span-4 flex flex-col justify-between transition-all duration-300 ${
          darkMode ? "bento-card-dark" : "bento-card-light"
        }`}>
          <div>
            <h3 className={`font-bold text-base ${darkMode ? "text-[#f8fafc]" : "text-slate-900"}`}>Data Management</h3>
            <p className="text-xs text-slate-400 mb-4">Backup, export, or parse spreadsheet budgets</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* PDF Export */}
              <button
                id="export-pdf-action-btn"
                onClick={() => exportToPDF(filteredExpenses, profile?.name || "User", profile?.email || "", currencySymbol, activeBudget)}
                className={`p-3 rounded-xl text-left transition group cursor-pointer border ${
                  darkMode ? "bg-slate-950/40 hover:bg-slate-800/40 border-slate-800/60 hover:border-emerald-500/30" : "bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300"
                }`}
              >
                <Download className="w-5 h-5 text-rose-500 mb-1.5 group-hover:scale-110 transition" />
                <h4 className={`text-xs font-semibold ${darkMode ? "text-slate-200" : "text-slate-850"}`}>Export PDF</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Generates comprehensive tabular breakdown reports.</p>
              </button>

              {/* Excel Export */}
              <button
                id="export-excel-action-btn"
                onClick={() => exportToExcel(filteredExpenses, currencySymbol)}
                className={`p-3 rounded-xl text-left transition group cursor-pointer border ${
                  darkMode ? "bg-slate-950/40 hover:bg-slate-800/40 border-slate-800/60 hover:border-emerald-500/30" : "bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300"
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-500 mb-1.5 group-hover:scale-110 transition" />
                <h4 className={`text-xs font-semibold ${darkMode ? "text-slate-200" : "text-slate-850"}`}>Export Excel</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Microsoft Excel & Google Sheets fully compatible.</p>
              </button>

              {/* CSV Export */}
              <button
                id="export-csv-action-btn"
                onClick={() => exportToCSV(filteredExpenses, currencySymbol)}
                className={`p-3 rounded-xl text-left transition group cursor-pointer border ${
                  darkMode ? "bg-slate-950/40 hover:bg-slate-800/40 border-slate-800/60 hover:border-emerald-500/30" : "bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300"
                }`}
              >
                <Download className="w-5 h-5 text-blue-500 mb-1.5 group-hover:scale-110 transition" />
                <h4 className={`text-xs font-semibold ${darkMode ? "text-slate-200" : "text-slate-850"}`}>Export CSV</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Universal format for databases & spreadsheets.</p>
              </button>

              {/* Bulk Import Slot (Spreadsheet) */}
              <div className={`p-3 border border-dashed rounded-xl text-left transition relative group ${
                darkMode ? "bg-slate-950/40 border-slate-700 hover:border-emerald-500/50" : "bg-slate-50 border-slate-300 hover:border-emerald-500/50"
              }`}>
                <Upload className="w-5 h-5 text-purple-500 mb-1.5 group-hover:scale-110 transition" />
                <h4 className={`text-xs font-semibold ${darkMode ? "text-slate-200" : "text-slate-850"}`}>Import Sheets</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Upload .xlsx or .csv to batch upload logs.</p>
                
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

          <div className="mt-4 pt-4 border-t border-slate-800/20 flex items-center gap-2 text-[10px] text-slate-400">
            <Info className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Required mapping layout: Date, Category, Description, Amount, Mode, Notes.</span>
          </div>
        </motion.div>

        {/* ROW 4: TRANSACTIONS TABLE & SEARCH / FILTER BLOCK (Full width 12 columns) */}
        <motion.div variants={cardVariants} className={`col-span-12 p-6 rounded-2xl transition-all duration-300 ${
          darkMode ? "bento-card-dark" : "bento-card-light"
        }`}>
          
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 className={`font-bold text-base ${darkMode ? "text-[#f8fafc]" : "text-slate-900"}`}>Expense Transactions</h3>
              <p className="text-xs text-slate-400">Manage, search, and filter transaction history</p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
              
              {/* Dynamic Search */}
              <div className="relative flex-1 md:w-64 md:flex-initial">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  id="expense-search-input"
                  type="text"
                  placeholder="Search description, notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full border rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-emerald-500 ${
                    darkMode ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
                />
              </div>

              {/* Filter toggle */}
              <button
                id="filter-toggle-btn"
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 border rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 ${
                  showFilters 
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" 
                    : darkMode 
                    ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700"
                }`}
              >
                <Filter className="w-4 h-4" />
              </button>

              {/* Add Expense Trigger */}
              <button
                id="add-expense-trigger-btn"
                onClick={() => {
                  setExpenseToEdit(null);
                  setIsModalOpen(true);
                }}
                className="px-3 sm:px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 shrink-0 hover:scale-[1.01] transition duration-200 shadow-lg shadow-emerald-500/15 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Expense
              </button>

            </div>
          </div>

          {/* Expanded Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border-b border-slate-800/50 mb-6"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 pb-4">
                  
                  {/* Category Filter */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                    <select
                      id="filter-category-select"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className={`w-full border rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500 ${
                        darkMode ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <option value="All">All Categories</option>
                      {availableCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Filter */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Payment Mode</label>
                    <select
                      id="filter-payment-select"
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                      className={`w-full border rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500 ${
                        darkMode ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <option value="All">All Modes</option>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Net Banking">Net Banking</option>
                    </select>
                  </div>

                  {/* Month Filter */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Month</label>
                    <select
                      id="filter-month-select"
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                      className={`w-full border rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500 ${
                        darkMode ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <option value="All">All Months</option>
                      <option value="01">January</option>
                      <option value="02">February</option>
                      <option value="03">March</option>
                      <option value="04">April</option>
                      <option value="05">May</option>
                      <option value="06">June</option>
                      <option value="07">July</option>
                      <option value="08">August</option>
                      <option value="09">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                  </div>

                  {/* Year Filter */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Year</label>
                    <select
                      id="filter-year-select"
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                      className={`w-full border rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500 ${
                        darkMode ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <option value="All">All Years</option>
                      {availableYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom From Date Filter */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">From Date</label>
                    <input
                      id="filter-start-date-input"
                      type="date"
                      value={startDateFilter}
                      onChange={(e) => setStartDateFilter(e.target.value)}
                      className={`w-full border rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500 ${
                        darkMode ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    />
                  </div>

                  {/* Custom To Date Filter */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">To Date</label>
                    <input
                      id="filter-end-date-input"
                      type="date"
                      value={endDateFilter}
                      onChange={(e) => setEndDateFilter(e.target.value)}
                      className={`w-full border rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500 ${
                        darkMode ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    />
                  </div>

                  {/* Amount Min/Max */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Amount Range</label>
                    <div className="flex items-center gap-2">
                      <input
                        id="filter-min-amount-input"
                        type="number"
                        placeholder="Min"
                        value={minAmount}
                        onChange={(e) => setMinAmount(e.target.value)}
                        className={`w-1/2 border rounded-xl py-2 px-2.5 text-xs focus:outline-none focus:border-emerald-500 ${
                          darkMode ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      />
                      <span className="text-slate-600 text-xs">-</span>
                      <input
                        id="filter-max-amount-input"
                        type="number"
                        placeholder="Max"
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(e.target.value)}
                        className={`w-1/2 border rounded-xl py-2 px-2.5 text-xs focus:outline-none focus:border-emerald-500 ${
                          darkMode ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      />
                    </div>
                  </div>

                </div>

                {/* Reset Filters Option */}
                {(startDateFilter || endDateFilter || categoryFilter !== "All" || paymentFilter !== "All" || monthFilter !== "All" || yearFilter !== "All" || minAmount || maxAmount) && (
                  <div className="flex justify-end gap-2 pb-4">
                    <button
                      id="clear-all-filters-btn"
                      type="button"
                      onClick={() => {
                        setStartDateFilter("");
                        setEndDateFilter("");
                        setCategoryFilter("All");
                        setPaymentFilter("All");
                        setMonthFilter("All");
                        setYearFilter("All");
                        setMinAmount("");
                        setMaxAmount("");
                        showNotification("All transaction filters reset successfully!", "info");
                      }}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                        darkMode 
                          ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300" 
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      <X className="w-3 h-3" />
                      <span>Reset All Filters</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spreadsheet Table Container (Desktop & Tablet) */}
          <div className={`hidden md:block overflow-x-auto border rounded-2xl ${
            darkMode ? "border-slate-800/85 bg-slate-950/20" : "border-slate-200 bg-slate-50/20"
          }`}>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b font-medium ${
                  darkMode ? "bg-[#0f172a] border-slate-800 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"
                }`}>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Mode</th>
                  <th className="py-3 px-4 font-semibold">Notes</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? "divide-slate-850" : "divide-slate-200"}`}>
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((e) => (
                    <tr key={e.id} className={`transition ${
                      darkMode ? "hover:bg-slate-900/40 text-slate-300" : "hover:bg-slate-100/40 text-slate-700"
                    }`}>
                      <td className="py-3 px-4 font-mono">{e.date}</td>
                      <td className={`py-3 px-4 font-medium ${darkMode ? "text-white" : "text-slate-900"}`}>{e.category}</td>
                      <td className="py-3 px-4 font-medium">{e.description}</td>
                      <td className="py-3 px-4 font-bold text-emerald-500 font-mono">
                        {currencySymbol}{e.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`py-0.5 px-2 border rounded-full text-[10px] ${
                          darkMode ? "bg-slate-800 border-slate-700/50 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600"
                        }`}>
                          {e.paymentMode}
                        </span>
                      </td>
                      <td className={`py-3 px-4 max-w-xs truncate ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{e.notes || "-"}</td>
                      <td className="py-3 px-4 text-right space-x-1 shrink-0">
                        <button
                          id={`edit-expense-btn-${e.id}`}
                          onClick={() => {
                            setExpenseToEdit(e);
                            setIsModalOpen(true);
                          }}
                          className={`p-1.5 rounded-lg transition cursor-pointer inline-flex items-center ${
                            darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-emerald-400" : "hover:bg-slate-100 text-slate-500 hover:text-emerald-600"
                          }`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-expense-btn-${e.id}`}
                          onClick={() => e.id && handleDeleteExpense(e.id)}
                          className={`p-1.5 rounded-lg transition cursor-pointer inline-flex items-center ${
                            darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-rose-400" : "hover:bg-slate-100 text-slate-500 hover:text-rose-600"
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                      No matching transactions found. Please log some expenses!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Card-based list for mobile */}
          <div className="block md:hidden space-y-3">
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((e) => (
                <div
                  key={e.id}
                  className={`p-4 border rounded-2xl flex flex-col gap-3 transition-all ${
                    darkMode 
                      ? "border-slate-800/80 bg-slate-900/10 hover:bg-slate-900/30" 
                      : "border-slate-200 bg-slate-50/20 hover:bg-slate-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-xs font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                          {e.category}
                        </span>
                        <span className={`py-0.5 px-2 border rounded-full text-[9px] font-semibold ${
                          darkMode 
                            ? "bg-slate-800/80 border-slate-700/40 text-slate-300" 
                            : "bg-slate-100/80 border-slate-200/60 text-slate-600"
                        }`}>
                          {e.paymentMode}
                        </span>
                      </div>
                      <p className={`text-xs mt-1.5 font-medium leading-relaxed ${darkMode ? "text-slate-300" : "text-slate-750"}`}>
                        {e.description}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end shrink-0 pl-2">
                      <span className="text-sm font-extrabold text-emerald-500 font-mono">
                        {currencySymbol}{e.amount.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">{e.date}</span>
                    </div>
                  </div>

                  {e.notes && (
                    <div className={`text-[10px] p-2.5 rounded-xl border leading-relaxed ${
                      darkMode ? "bg-slate-950/40 border-slate-800/50 text-slate-400" : "bg-slate-100/30 border-slate-200/50 text-slate-500"
                    }`}>
                      {e.notes}
                    </div>
                  )}

                  <div className={`flex items-center justify-between pt-2.5 border-t ${
                    darkMode ? "border-slate-800/40" : "border-slate-200/40"
                  }`}>
                    <span className="text-[10px] text-slate-500 font-medium">Quick Actions</span>
                    <div className="flex items-center gap-2">
                      <button
                        id={`mobile-edit-btn-${e.id}`}
                        onClick={() => {
                          setExpenseToEdit(e);
                          setIsModalOpen(true);
                        }}
                        className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                          darkMode 
                            ? "hover:bg-slate-800 text-slate-400 hover:text-emerald-400" 
                            : "hover:bg-slate-100 text-slate-500 hover:text-emerald-600"
                        }`}
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        id={`mobile-delete-btn-${e.id}`}
                        onClick={() => e.id && handleDeleteExpense(e.id)}
                        className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-500 italic text-xs">
                No matching transactions found. Please log some expenses!
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
            <span>Showing {filteredExpenses.length} of {expenses.length} total transactions</span>
            {filteredExpenses.length > 0 && (
              <span>Total Spent: {currencySymbol}{totalSpentFiltered.toFixed(2)}</span>
            )}
          </div>

        </motion.div>

      </motion.main>

      {/* EXPENSE FORM MODAL */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setExpenseToEdit(null);
        }}
        expenseToEdit={expenseToEdit}
        onSave={handleSaveExpense}
        customCategories={profile?.customCategories || []}
        onAddCustomCategory={handleAddCustomCategory}
        currency={currencySymbol}
        defaultDate={selectedCalendarDate}
      />

      {/* COLLAPSIBLE USER PROFILE SETTINGS DRAWERS/MODALS */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative z-10 overflow-hidden text-slate-100"
              id="user-profile-settings-modal"
            >
              <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4 text-emerald-400" />
                  Tracker Preferences
                </h3>
                <button
                  id="close-profile-settings-btn"
                  onClick={() => setIsProfileOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="p-6">
                <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-5">
                  
                  {/* Section 1: Basic Profile */}
                  <div className="space-y-4">
                    <h4 className="text-[11px] uppercase font-bold tracking-wider text-slate-400 pb-1 border-b border-slate-800/60">Basic Configuration</h4>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Your Full Name</label>
                      <input
                        id="profile-name-input"
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
                          <span>Monthly Budget Limit</span>
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 font-mono text-xs text-slate-400">
                            {profileCurrency}
                          </span>
                          <input
                            id="profile-budget-input"
                            type="number"
                            required
                            value={profileBudget}
                            onChange={(e) => setProfileBudget(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-7 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Base Currency Symbol</label>
                        <select
                          id="profile-currency-select"
                          value={profileCurrency}
                          onChange={(e) => setProfileCurrency(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="₹">INR (₹)</option>
                          <option value="$">USD ($)</option>
                          <option value="€">EUR (€)</option>
                          <option value="£">GBP (£)</option>
                          <option value="¥">JPY (¥)</option>
                          <option value="₩">KRW (₩)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Custom Date Customization Cycle */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                      <h4 className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Custom Cycle Goal Tracker</h4>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="custom-period-enabled-toggle"
                          type="checkbox"
                          checked={customPeriodEnabled}
                          onChange={(e) => setCustomPeriodEnabled(e.target.checked)}
                          className="rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500/20 w-3.5 h-3.5 cursor-pointer"
                        />
                        <label htmlFor="custom-period-enabled-toggle" className="text-[10px] text-slate-300 font-bold cursor-pointer select-none">Enable</label>
                      </div>
                    </div>

                    {customPeriodEnabled && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-3.5"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-semibold mb-1">Start Date</label>
                            <input
                              type="date"
                              required={customPeriodEnabled}
                              value={customPeriodStartDate}
                              onChange={(e) => setCustomPeriodStartDate(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 font-semibold mb-1">End Date</label>
                            <input
                              type="date"
                              required={customPeriodEnabled}
                              value={customPeriodEndDate}
                              onChange={(e) => setCustomPeriodEndDate(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 font-semibold mb-1">Custom Period Budget Amount (e.g., 15000)</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 font-mono text-xs text-slate-500">
                              {profileCurrency}
                            </span>
                            <input
                              type="number"
                              required={customPeriodEnabled}
                              value={customPeriodBudget}
                              onChange={(e) => setCustomPeriodBudget(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-7 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">
                            Allows tracking expenses precisely between custom ranges (e.g. 23rd June to 23rd July) with dedicated visual progress.
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Section 3: Notification Alerts & Budget Warnings */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                      <h4 className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Budget Warning Alerts</h4>
                      <button
                        type="button"
                        onClick={requestPushPermission}
                        className="text-[9px] px-2 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded font-semibold transition cursor-pointer"
                      >
                        Enable Push
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-950/20 border border-slate-800/30 cursor-pointer hover:bg-slate-950/40 select-none">
                        <input
                          type="checkbox"
                          checked={notifyAt80}
                          onChange={(e) => setNotifyAt80(e.target.checked)}
                          className="rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500/20 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-slate-300">Notify at 80% budget</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-950/20 border border-slate-800/30 cursor-pointer hover:bg-slate-950/40 select-none">
                        <input
                          type="checkbox"
                          checked={notifyAt100}
                          onChange={(e) => setNotifyAt100(e.target.checked)}
                          className="rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500/20 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-slate-300">Notify at 100% budget</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-950/20 border border-slate-800/30 cursor-pointer hover:bg-slate-950/40 select-none">
                        <input
                          type="checkbox"
                          checked={soundAlerts}
                          onChange={(e) => setSoundAlerts(e.target.checked)}
                          className="rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500/20 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-slate-300">Sound chime effects</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-950/20 border border-slate-800/30 cursor-pointer hover:bg-slate-950/40 select-none">
                        <input
                          type="checkbox"
                          checked={dailyReminders}
                          onChange={(e) => setDailyReminders(e.target.checked)}
                          className="rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500/20 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-slate-300">Daily entry reminders</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-950/20 border border-slate-800/30 cursor-pointer hover:bg-slate-950/40 col-span-1 sm:col-span-2 select-none">
                        <input
                          type="checkbox"
                          checked={weeklyEmailReports}
                          onChange={(e) => setWeeklyEmailReports(e.target.checked)}
                          className="rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500/20 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-slate-300">Weekly email report diagnostics</span>
                      </label>
                    </div>
                  </div>

                  {/* Section 4: Google Chat Integration */}
                  <div className="space-y-4 pt-4 border-t border-slate-800/60">
                    <div className="flex items-center justify-between pb-1">
                      <h4 className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Google Chat Integration</h4>
                      {(chatWebhookUrl || googleChatToken) ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700/60 font-semibold">
                          Inactive
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-normal">
                      Receive real-time notifications, budget warning alerts, and automated spending summaries directly in your Google Chat spaces. You can use an <strong>Incoming Webhook</strong> or connect via <strong>Google Account Login</strong>.
                    </p>

                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 leading-normal">
                      <strong>⚠️ Google API 404 Error?</strong> If you get a 404 error saying <em>"Google Chat app not found"</em> while using Google Account OAuth (Option B), this is because Google requires creating and publishing a Chat App in your Google Cloud Console. To bypass this complex setup, we highly recommend using <strong>Option A (Incoming Webhook)</strong> for your <strong>expense tracker</strong> space. It works instantly without any Google Cloud project configuration!
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Option A: Webhook URL */}
                      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">Option A: Incoming Webhook</span>
                          <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/15">Instant & Simple</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Create an Incoming Webhook in your Google Chat space settings and paste the URL below. No login required.
                        </p>
                        <div className="space-y-2">
                          <input
                            id="gchat-webhook-input"
                            type="text"
                            placeholder="https://chat.googleapis.com/v1/spaces/..."
                            value={chatWebhookUrl}
                            onChange={(e) => setChatWebhookUrl(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                          />
                          {chatWebhookUrl && (
                            <button
                              type="button"
                              onClick={async () => {
                                const confirmed = window.confirm("Send a test greeting via your Google Chat webhook?");
                                if (confirmed) {
                                  await sendGoogleChatMessage(`👋 *Hello from TMK Expense Tracker!* \nYour Incoming Webhook is connected and working perfectly!`);
                                }
                              }}
                              className="w-full py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Test Webhook Message
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Option B: OAuth Spaces Connect */}
                      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">Option B: Google Account OAuth</span>
                          {googleChatToken && (
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/15">Connected</span>
                          )}
                        </div>

                        {!googleChatToken ? (
                          <div className="space-y-3">
                            <p className="text-[10px] text-slate-400 leading-normal">
                              Log in with your Google Workspace account to dynamically browse and select your active Chat spaces.
                            </p>
                            <button
                              id="connect-gchat-settings-btn"
                              type="button"
                              onClick={handleConnectGoogleChat}
                              className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-700 hover:border-slate-500 font-semibold text-xs rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <svg className="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                              </svg>
                              Connect Google Account
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[9px] text-slate-400 font-semibold mb-1">Target Space</label>
                              {chatLoadingSpaces ? (
                                <div className="text-xs text-slate-400 animate-pulse py-1">Loading spaces...</div>
                              ) : chatSpaces.length === 0 ? (
                                <div className="space-y-1.5">
                                  <p className="text-[10px] text-amber-400 leading-normal">
                                    No spaces found for this account. Make sure you belong to at least one active Google Chat space.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => fetchGoogleChatSpaces(googleChatToken)}
                                    className="text-[10px] text-emerald-400 hover:underline"
                                  >
                                    Retry Fetching Spaces
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  <select
                                    id="gchat-space-select"
                                    value={selectedSpace}
                                    onChange={(e) => {
                                      const sName = e.target.value;
                                      setSelectedSpace(sName);
                                      const found = chatSpaces.find(s => s.name === sName);
                                      setSelectedSpaceDisplay(found ? (found.displayName || found.name) : sName);
                                    }}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                  >
                                    {chatSpaces.map((space) => (
                                      <option key={space.name} value={space.name}>
                                        {space.displayName || space.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const confirmed = window.confirm(`Send a test greeting to Google Chat space "${selectedSpaceDisplay}"?`);
                                      if (confirmed) {
                                        await sendGoogleChatMessage(`👋 *Hello from TMK Expense Tracker!* \nYour connected account space is working perfectly!`);
                                      }
                                    }}
                                    className="w-full py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold transition cursor-pointer"
                                  >
                                    Test OAuth Message
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Common Alert Configuration Controls */}
                    {(chatWebhookUrl || (googleChatToken && selectedSpace)) && (
                      <div className="p-4 rounded-xl bg-slate-950/20 border border-slate-800/40 space-y-4 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/40 border border-slate-800/40 cursor-pointer hover:bg-slate-900 select-none">
                            <input
                              type="checkbox"
                              checked={chatAutoPostWarnings}
                              onChange={(e) => setChatAutoPostWarnings(e.target.checked)}
                              className="rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500/20 w-4 h-4 cursor-pointer"
                            />
                            <div className="flex flex-col">
                              <span className="text-slate-200 font-semibold">Post warnings automatically</span>
                              <span className="text-[9px] text-slate-500">Post at 80% and 100% budget</span>
                            </div>
                          </label>

                          <button
                            type="button"
                            onClick={async () => {
                              const activeMonth = new Date().toISOString().substring(0, 7);
                              const currentMonthSpent = expenses
                                .filter(e => e.date.substring(0, 7) === activeMonth)
                                .reduce((sum, e) => sum + e.amount, 0);
                              const budget = profile?.monthlyBudget || 15000;
                              const ratio = (currentMonthSpent / budget) * 100;
                              const remaining = budget - currentMonthSpent;

                              const confirmed = window.confirm(`Post your current monthly financial status report to Google Chat?`);
                              if (!confirmed) return;

                              const chatMsg = `📊 *TMK Expense Tracker: Monthly Spending Report* \n` +
                                `Month: *${activeMonth}*\n` +
                                `Total Spent: *${profileCurrency}${currentMonthSpent.toLocaleString()}*\n` +
                                `Budget Limit: *${profileCurrency}${budget.toLocaleString()}*\n` +
                                `Utilization: *${ratio.toFixed(1)}%*\n` +
                                `Remaining Balance: *${profileCurrency}${remaining.toLocaleString()}*\n` +
                                `_Report generated directly from the TMK Dashboard._`;
                              
                              await sendGoogleChatMessage(chatMsg);
                            }}
                            className="flex items-center justify-center gap-2 p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 cursor-pointer transition select-none text-left"
                          >
                            <svg className="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
                            </svg>
                            <div className="flex flex-col">
                              <span className="font-semibold">Publish Spending Digest</span>
                              <span className="text-[9px] text-slate-500">Post current balance & status</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                <div className="pt-4 mt-5 flex items-center justify-end gap-3 border-t border-slate-800/60">
                  <button
                    id="cancel-profile-settings-btn"
                    type="button"
                    onClick={() => setIsProfileOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="save-profile-settings-btn"
                    type="submit"
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition duration-150 cursor-pointer"
                  >
                    Save Preferences
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CHAT ASSISTANT PANEL */}
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
      />

    </div>
  );
}
