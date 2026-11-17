import React from "react";
import { Mail, Sparkles, CheckCircle2, Clock, Send, Calendar, ArrowRight, ShieldCheck } from "lucide-react";
import { UserProfile, Expense } from "../types";

interface GmailReportsCardProps {
  profile: UserProfile | null;
  expenses: Expense[];
  currencySymbol: string;
  monthlyBudget: number;
  onOpenGmailModal: () => void;
  onTriggerQuickSend: (type: "weekly" | "monthly") => void;
  darkMode?: boolean;
}

export default function GmailReportsCard({
  profile,
  expenses,
  currencySymbol,
  monthlyBudget,
  onOpenGmailModal,
  onTriggerQuickSend,
  darkMode = true,
}: GmailReportsCardProps) {
  const settings = profile?.gmailSettings;
  const isConnected = !!settings?.connected;
  const weeklyEnabled = settings?.weeklyReportsEnabled ?? true;
  const monthlyEnabled = settings?.monthlyReportsEnabled ?? true;
  const recipient = settings?.recipientEmail || profile?.email || "thulasitmk181@gmail.com";

  // Calculate stats for current week & month
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlyExpenses = expenses.filter((e) => (e.date || "").startsWith(currentMonthPrefix));
  const monthlyTotal = monthlyExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const weeklyExpenses = expenses.filter((e) => (e.date || "") >= sevenDaysAgo);
  const weeklyTotal = weeklyExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return (
    <div className={`${darkMode ? "bento-card-dark" : "bento-card-light"} p-5 sm:p-6 relative overflow-hidden group`}>
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-rose-500/10 transition-colors duration-500" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-red-500/10 text-rose-400 border border-rose-500/30">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">Gmail AI Spending Reporter</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
                1P Workspace
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated weekly summaries & end-of-month AI financial closure reports
            </p>
          </div>
        </div>

        <button
          onClick={onOpenGmailModal}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
          <span>Configure & Send</span>
        </button>
      </div>

      {/* Status & Cadence Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4 relative z-10">
        {/* Recipient status */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold flex items-center justify-between">
            <span>Target Recipient</span>
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="text-xs font-mono font-bold text-white truncate mt-1.5" title={recipient}>
            {recipient}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {isConnected ? "OAuth Active" : "Authorized with Google"}
          </div>
        </div>

        {/* Weekly Report cadence */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold flex items-center justify-between">
            <span>Weekly AI Digest</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${weeklyEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
              {weeklyEnabled ? "Active" : "Paused"}
            </span>
          </div>
          <div className="text-xs font-bold text-white mt-1.5 flex items-center justify-between">
            <span>7-Day Spend:</span>
            <span className="font-mono text-emerald-400">{currencySymbol}{weeklyTotal.toLocaleString()}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Sent every 7 days with velocity & Thalaivar punch
          </div>
        </div>

        {/* Monthly Report cadence */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold flex items-center justify-between">
            <span>Monthly Closure</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${monthlyEnabled ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
              {monthlyEnabled ? "Active" : "Paused"}
            </span>
          </div>
          <div className="text-xs font-bold text-white mt-1.5 flex items-center justify-between">
            <span>Month-to-Date:</span>
            <span className="font-mono text-cyan-400">{currencySymbol}{monthlyTotal.toLocaleString()}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Sent after 1 month with budget closure & advice
          </div>
        </div>
      </div>

      {/* Quick Trigger Banner */}
      <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 relative z-10">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {settings?.lastMonthlyReportSentAt
              ? `Last monthly report: ${new Date(settings.lastMonthlyReportSentAt).toLocaleDateString()}`
              : "Ready to dispatch AI reports directly from your Gmail account"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onTriggerQuickSend("weekly")}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
            <span>Send Weekly</span>
          </button>
          <button
            onClick={() => onTriggerQuickSend("monthly")}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
            <span>Send Monthly</span>
          </button>
        </div>
      </div>
    </div>
  );
}
