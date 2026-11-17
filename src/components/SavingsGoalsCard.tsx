import React, { useState, useEffect } from "react";
import {
  Target,
  Plus,
  CheckCircle2,
  Trophy,
  Calendar,
  Pencil,
  Trash2,
  Wallet,
  PiggyBank,
  Sparkles,
  ArrowRight,
  X,
  Coins,
  ShieldCheck,
  Laptop,
  Plane,
  Car,
  Home,
  GraduationCap,
  HeartHandshake
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { SavingsGoal } from "../types";

interface SavingsGoalsCardProps {
  user: any;
  currencySymbol: string;
  darkMode?: boolean;
  onGoalCompleted?: (goalName: string) => void;
}

const PRESET_ICONS = [
  { icon: "🛡️", label: "Emergency", id: "emergency" },
  { icon: "💻", label: "Tech / Laptop", id: "tech" },
  { icon: "🏖️", label: "Travel / Trip", id: "travel" },
  { icon: "🚗", label: "Vehicle", id: "vehicle" },
  { icon: "🏠", label: "Home", id: "home" },
  { icon: "🎓", label: "Education", id: "education" },
  { icon: "📱", label: "Phone", id: "phone" },
  { icon: "💍", label: "Special", id: "special" },
  { icon: "🚀", label: "Startup / Fund", id: "startup" },
  { icon: "🪙", label: "Gold / Wealth", id: "gold" }
];

const PRESET_COLORS = [
  { name: "Emerald", value: "emerald", border: "border-emerald-500/40", bar: "from-emerald-500 to-teal-400", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", text: "text-emerald-400" },
  { name: "Cyan", value: "cyan", border: "border-cyan-500/40", bar: "from-cyan-500 to-blue-500", badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30", text: "text-cyan-400" },
  { name: "Violet", value: "violet", border: "border-violet-500/40", bar: "from-violet-500 to-purple-500", badge: "bg-violet-500/15 text-violet-300 border-violet-500/30", text: "text-violet-400" },
  { name: "Amber", value: "amber", border: "border-amber-500/40", bar: "from-amber-500 to-orange-500", badge: "bg-amber-500/15 text-amber-300 border-amber-500/30", text: "text-amber-400" },
  { name: "Rose", value: "rose", border: "border-rose-500/40", bar: "from-rose-500 to-pink-500", badge: "bg-rose-500/15 text-rose-300 border-rose-500/30", text: "text-rose-400" },
  { name: "Indigo", value: "indigo", border: "border-indigo-500/40", bar: "from-indigo-500 to-sky-400", badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30", text: "text-indigo-400" },
];

export default function SavingsGoalsCard({
  user,
  currencySymbol,
  darkMode = true,
  onGoalCompleted
}: SavingsGoalsCardProps) {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  // Contribution quick-deposit modal/popover
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositMode, setDepositMode] = useState<"add" | "withdraw">("add");

  // Form fields
  const [formName, setFormName] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formCurrent, setFormCurrent] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formIcon, setFormIcon] = useState("🛡️");
  const [formColor, setFormColor] = useState("emerald");
  const [formNotes, setFormNotes] = useState("");

  // Purge any stale legacy mock seeds from localStorage on mount
  useEffect(() => {
    try {
      ["tmk_savings_goals_guest", user?.uid ? `tmk_savings_goals_${user.uid}` : null].forEach((k) => {
        if (!k) return;
        const item = localStorage.getItem(k);
        if (item && (item.includes("seed-emergency-fund") || item.includes("seed-new-laptop"))) {
          localStorage.removeItem(k);
        }
      });
    } catch {
      // ignore
    }
  }, [user?.uid]);

  // Load goals exclusively from Firestore database
  useEffect(() => {
    let unsubscribe = () => {};

    if (user?.uid && db) {
      setLoading(true);
      try {
        const goalsCol = collection(db, "users", user.uid, "savingsGoals");
        unsubscribe = onSnapshot(
          goalsCol,
          (snapshot) => {
            const loadedGoals: SavingsGoal[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              loadedGoals.push({
                id: docSnap.id,
                userId: user.uid,
                name: data.name || "Untitled Goal",
                targetAmount: Number(data.targetAmount) || 0,
                currentAmount: Number(data.currentAmount) || 0,
                category: data.category || "General",
                targetDate: data.targetDate || "",
                icon: data.icon || "🎯",
                color: data.color || "emerald",
                notes: data.notes || "",
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString()
              });
            });
            // Sort by completion / target
            loadedGoals.sort((a, b) => (b.currentAmount / (b.targetAmount || 1)) - (a.currentAmount / (a.targetAmount || 1)));
            setGoals(loadedGoals);
            setLoading(false);
          },
          (err) => {
            console.error("Firestore savingsGoals error:", err.message);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("Error setting up Firestore listener:", err);
        setLoading(false);
      }
    } else {
      setGoals([]);
      setLoading(false);
    }

    return () => unsubscribe();
  }, [user?.uid]);

  // Open modal for Create or Edit
  const handleOpenModal = (goal?: SavingsGoal) => {
    if (goal) {
      setEditingGoal(goal);
      setFormName(goal.name);
      setFormTarget(goal.targetAmount.toString());
      setFormCurrent(goal.currentAmount.toString());
      setFormDate(goal.targetDate || "");
      setFormCategory(goal.category || "General");
      setFormIcon(goal.icon || "🛡️");
      setFormColor(goal.color || "emerald");
      setFormNotes(goal.notes || "");
    } else {
      setEditingGoal(null);
      setFormName("");
      setFormTarget("");
      setFormCurrent("0");
      setFormDate("");
      setFormCategory("General");
      setFormIcon("🛡️");
      setFormColor("emerald");
      setFormNotes("");
    }
    setIsModalOpen(true);
  };

  // Submit Goal form to Firestore Database
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmt = parseFloat(formTarget);
    const currentAmt = parseFloat(formCurrent) || 0;

    if (!formName.trim() || isNaN(targetAmt) || targetAmt <= 0) {
      return;
    }

    const goalData = {
      name: formName.trim(),
      targetAmount: targetAmt,
      currentAmount: Math.max(0, currentAmt),
      targetDate: formDate || "",
      category: formCategory,
      icon: formIcon,
      color: formColor,
      notes: formNotes.trim(),
      updatedAt: new Date().toISOString()
    };

    if (editingGoal) {
      // Update existing document in Firestore
      if (user?.uid && db) {
        try {
          const docRef = doc(db, "users", user.uid, "savingsGoals", editingGoal.id);
          await updateDoc(docRef, {
            ...goalData,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error("Firestore update error:", err);
        }
      }
      setGoals((prev) => prev.map((g) => (g.id === editingGoal.id ? { ...g, ...goalData } : g)));
    } else {
      // Create new document in Firestore database
      if (user?.uid && db) {
        try {
          const colRef = collection(db, "users", user.uid, "savingsGoals");
          const createdSnap = await addDoc(colRef, {
            ...goalData,
            userId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          const newGoal: SavingsGoal = {
            id: createdSnap.id,
            userId: user.uid,
            ...goalData,
            createdAt: new Date().toISOString()
          };
          setGoals((prev) => [...prev, newGoal]);
        } catch (err) {
          console.error("Firestore add error:", err);
        }
      }
    }

    setIsModalOpen(false);
  };

  // Delete Goal directly from Firestore Database
  const handleDeleteGoal = async (goalId: string) => {
    if (!window.confirm("Are you sure you want to remove this savings goal?")) return;

    // Optimistic removal from UI
    setGoals((prev) => prev.filter((g) => g.id !== goalId));

    if (user?.uid && db) {
      try {
        const docRef = doc(db, "users", user.uid, "savingsGoals", goalId);
        await deleteDoc(docRef);
      } catch (err) {
        console.error("Firestore delete error:", err);
      }
    }
  };

  // Quick contribute or withdraw from Firestore Database
  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoal) return;
    const delta = parseFloat(depositAmount);
    if (isNaN(delta) || delta <= 0) return;

    const newAmount = depositMode === "add"
      ? contributeGoal.currentAmount + delta
      : Math.max(0, contributeGoal.currentAmount - delta);

    const isNewlyCompleted = contributeGoal.currentAmount < contributeGoal.targetAmount && newAmount >= contributeGoal.targetAmount;

    if (user?.uid && db) {
      try {
        const docRef = doc(db, "users", user.uid, "savingsGoals", contributeGoal.id);
        await updateDoc(docRef, {
          currentAmount: newAmount,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Firestore update error:", err);
      }
    }

    setGoals((prev) => prev.map((g) => (g.id === contributeGoal.id ? { ...g, currentAmount: newAmount } : g)));

    if (isNewlyCompleted && onGoalCompleted) {
      onGoalCompleted(contributeGoal.name);
    }

    setContributeGoal(null);
    setDepositAmount("");
  };

  // Aggregate metrics
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalRemaining = Math.max(0, totalTarget - totalSaved);
  const overallPercentage = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
  const completedGoalsCount = goals.filter((g) => g.currentAmount >= g.targetAmount).length;

  const getColorConfig = (colorName?: string) => {
    return PRESET_COLORS.find((c) => c.value === colorName) || PRESET_COLORS[0];
  };

  return (
    <>
    <div className={`col-span-12 ${darkMode ? "bento-card-dark" : "bento-card-light"} relative overflow-hidden transition-all duration-300`}>
      {/* Background ambient light */}
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.08] gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-cyan-500/15 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-500/10">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white font-sans">
                Savings Goals & Vaults
              </h3>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
                {goals.length} Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Set target amounts for milestones, track real-time funding progress, and achieve your financial targets
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* Summary Portfolio Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.07]">
        {/* Metric 1 */}
        <div className="p-2.5 rounded-xl bg-slate-950/40 border border-white/[0.05]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
            Total Target
          </span>
          <div className="text-lg sm:text-xl font-mono font-bold text-white tabular-nums mt-0.5">
            {currencySymbol}{totalTarget.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Cumulative ceiling</span>
        </div>

        {/* Metric 2 */}
        <div className="p-2.5 rounded-xl bg-slate-950/40 border border-white/[0.05]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
            Total Saved
          </span>
          <div className="text-lg sm:text-xl font-mono font-bold text-emerald-400 tabular-nums mt-0.5">
            {currencySymbol}{totalSaved.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-500/80 font-mono font-semibold">
            {overallPercentage}% funded
          </span>
        </div>

        {/* Metric 3 */}
        <div className="p-2.5 rounded-xl bg-slate-950/40 border border-white/[0.05]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
            Remaining To Goal
          </span>
          <div className="text-lg sm:text-xl font-mono font-bold text-cyan-300 tabular-nums mt-0.5">
            {currencySymbol}{totalRemaining.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Needed to complete</span>
        </div>

        {/* Metric 4 */}
        <div className="p-2.5 rounded-xl bg-slate-950/40 border border-white/[0.05]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
            Milestones Hit
          </span>
          <div className="text-lg sm:text-xl font-mono font-bold text-amber-300 tabular-nums mt-0.5 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>{completedGoalsCount} of {goals.length}</span>
          </div>
          <span className="text-[10px] text-amber-400/80 font-mono font-semibold">
            {completedGoalsCount === goals.length && goals.length > 0 ? "All completed! 🚀" : "In progress"}
          </span>
        </div>
      </div>

      {/* Aggregate Progress Bar */}
      <div className="mb-5 px-1">
        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            Portfolio Funding Progress
          </span>
          <span className="text-emerald-400 font-bold tabular-nums">
            {overallPercentage}% Complete
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-950 border border-white/10 overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallPercentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full"
          />
        </div>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white/[0.05] flex items-center justify-center text-slate-400 mb-3">
            <Target className="w-6 h-6 text-slate-500" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">No Savings Goals Set Yet</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Create your first savings target to allocate funds towards an Emergency Fund, New Laptop, Travel, or Investments.
          </p>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const pct = goal.targetAmount > 0 
              ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
              : 0;
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            const isCompleted = goal.currentAmount >= goal.targetAmount;
            const colorCfg = getColorConfig(goal.color);

            return (
              <motion.div
                key={goal.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-4 rounded-2xl bg-slate-950/70 border ${
                  isCompleted 
                    ? "border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30" 
                    : "border-white/[0.08] hover:border-white/20"
                } transition-all duration-200 flex flex-col justify-between group relative`}
              >
                {/* Top Row: Icon + Title + Category + Options */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-xl shadow-inner select-none shrink-0">
                        {goal.icon || "🎯"}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white group-hover:text-emerald-300 transition line-clamp-1">
                          {goal.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${colorCfg.badge}`}>
                            {goal.category || "General"}
                          </span>
                          {goal.targetDate && (
                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              {goal.targetDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(goal)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        title="Edit Goal"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Goal Motivation Note (if any) */}
                  {goal.notes && (
                    <p className="text-[11px] text-slate-400 italic line-clamp-1 mb-3">
                      "{goal.notes}"
                    </p>
                  )}

                  {/* Financial Figures */}
                  <div className="my-3 space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] font-mono uppercase text-slate-400">Saved</span>
                      <div className="text-right">
                        <span className="text-base font-mono font-bold text-white tabular-nums">
                          {currencySymbol}{goal.currentAmount.toLocaleString()}
                        </span>
                        <span className="text-xs font-mono text-slate-400 ml-1">
                          / {currencySymbol}{goal.targetAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Remaining or Over-funded */}
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Remaining:</span>
                      <span className={`font-semibold tabular-nums ${isCompleted ? "text-emerald-400" : "text-amber-300"}`}>
                        {isCompleted 
                          ? "Goal Complete! 🎉" 
                          : `${currencySymbol}${remaining.toLocaleString()} left`}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Progress Bar */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Progress</span>
                      <span className={`font-bold tabular-nums ${isCompleted ? "text-emerald-400" : colorCfg.text}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-900 border border-white/10 overflow-hidden relative p-0.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={`h-full rounded-full bg-gradient-to-r ${isCompleted ? "from-emerald-500 to-teal-300" : colorCfg.bar} relative`}
                      >
                        {isCompleted && (
                          <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                        )}
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Quick Deposit Action */}
                <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {[500, 1000, 5000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={async () => {
                          const newAmount = goal.currentAmount + amt;
                          const isNewlyHit = goal.currentAmount < goal.targetAmount && newAmount >= goal.targetAmount;
                          if (user?.uid && db) {
                            try {
                              const docRef = doc(db, "users", user.uid, "savingsGoals", goal.id);
                              await updateDoc(docRef, { currentAmount: newAmount, updatedAt: serverTimestamp() });
                            } catch (err) {
                              console.error("Firestore update notice:", err);
                            }
                          }
                          setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, currentAmount: newAmount } : g)));
                          if (isNewlyHit && onGoalCompleted) onGoalCompleted(goal.name);
                        }}
                        className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 text-[10px] font-mono text-slate-300 transition cursor-pointer"
                        title={`Add ${currencySymbol}${amt}`}
                      >
                        +{amt >= 1000 ? `${amt / 1000}k` : amt}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setContributeGoal(goal);
                      setDepositAmount("");
                      setDepositMode("add");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Coins className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Contribute</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>

      {/* MODAL 1: Create or Edit Goal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/15 p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingGoal ? "Edit Savings Goal" : "Create New Savings Goal"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Define target amount, icon, and milestones
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveGoal} className="space-y-4">
                {/* Goal Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Goal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Emergency Fund, New Laptop, Japan Trip"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl py-2 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Amounts Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Target Amount ({currencySymbol}) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="e.g. 50000"
                      value={formTarget}
                      onChange={(e) => setFormTarget(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl py-2 px-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Already Saved ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 10000"
                      value={formCurrent}
                      onChange={(e) => setFormCurrent(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl py-2 px-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Category & Target Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Security">Emergency / Safety</option>
                      <option value="Tech">Gadgets & Tech</option>
                      <option value="Travel">Travel & Vacations</option>
                      <option value="Vehicle">Vehicle & Transport</option>
                      <option value="Home">Home & Living</option>
                      <option value="Education">Education & Career</option>
                      <option value="Investment">Investment & Wealth</option>
                      <option value="General">General Milestone</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Target Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl py-2 px-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Icon Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Goal Icon / Emoji
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {PRESET_ICONS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setFormIcon(p.icon)}
                        className={`p-2 rounded-xl border text-xl flex items-center justify-center transition cursor-pointer ${
                          formIcon === p.icon
                            ? "bg-emerald-500/20 border-emerald-400 shadow-md ring-1 ring-emerald-400"
                            : "bg-white/[0.03] border-white/10 hover:bg-white/10"
                        }`}
                        title={p.label}
                      >
                        {p.icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Theme Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Accent Color Theme
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setFormColor(c.value)}
                        className={`py-1.5 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition cursor-pointer ${
                          formColor === c.value
                            ? "bg-white/20 border-white text-white shadow-md ring-1 ring-white/50"
                            : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Motivation / Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Save ₹5,000 every week to reach target by year end"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm transition cursor-pointer shadow-lg"
                  >
                    {editingGoal ? "Save Changes" : "Create Goal"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Contribute / Adjust Funds */}
      <AnimatePresence>
        {contributeGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/15 p-5 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setContributeGoal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl p-2 rounded-xl bg-white/[0.05] border border-white/10">
                  {contributeGoal.icon || "🎯"}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {contributeGoal.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Current: {currencySymbol}{contributeGoal.currentAmount.toLocaleString()} / {currencySymbol}{contributeGoal.targetAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Mode Toggle (Deposit vs Withdraw) */}
              <div className="grid grid-cols-2 gap-2 mb-4 p-1 rounded-xl bg-slate-950 border border-white/10 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDepositMode("add")}
                  className={`py-1.5 rounded-lg transition cursor-pointer ${
                    depositMode === "add"
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  + Add Savings
                </button>
                <button
                  type="button"
                  onClick={() => setDepositMode("withdraw")}
                  className={`py-1.5 rounded-lg transition cursor-pointer ${
                    depositMode === "withdraw"
                      ? "bg-rose-500 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  - Withdraw / Adjust
                </button>
              </div>

              <form onSubmit={handleContributeSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {depositMode === "add" ? "Deposit Amount" : "Withdraw Amount"} ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="e.g. 2500"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl py-2 px-3 text-base font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>

                {/* Quick chip buttons */}
                <div className="flex gap-2">
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(amt.toString())}
                      className="flex-1 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 text-[11px] font-mono text-slate-300 hover:text-emerald-300 transition cursor-pointer"
                    >
                      +{amt}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition cursor-pointer shadow-md ${
                      depositMode === "add"
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:from-emerald-400 hover:to-teal-300"
                        : "bg-rose-500 hover:bg-rose-400 text-white"
                    }`}
                  >
                    Confirm {depositMode === "add" ? "Deposit" : "Withdrawal"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setContributeGoal(null)}
                    className="py-2.5 px-4 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
