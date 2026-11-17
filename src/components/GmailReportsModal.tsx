import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mail, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  Clock, 
  Sparkles, 
  RefreshCw, 
  X, 
  ExternalLink,
  ShieldCheck,
  Eye,
  Sliders,
  Check,
  Flame,
  ArrowRight
} from "lucide-react";
import { Expense, UserProfile } from "../types";
import { 
  connectGmailAccount, 
  getGmailAccessToken, 
  setGmailAccessToken, 
  sendGmailEmail,
  buildFallbackReportHtml 
} from "../lib/gmail";

interface GmailReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
  profile?: UserProfile | null;
  expenses: Expense[];
  monthlyBudget: number;
  currencySymbol: string;
  onUpdateGmailSettings: (settings: {
    connected: boolean;
    recipientEmail: string;
    weeklyReportsEnabled: boolean;
    monthlyReportsEnabled: boolean;
    lastWeeklyReportSentAt?: string;
    lastMonthlyReportSentAt?: string;
  }) => Promise<void>;
  showNotification: (msg: string, type: "success" | "warning" | "info") => void;
  initialReportType?: "weekly" | "monthly" | null;
  onClearInitialReportType?: () => void;
  darkMode?: boolean;
}

export default function GmailReportsModal({
  isOpen,
  onClose,
  userEmail = "thulasitmk181@gmail.com",
  userName = "User",
  profile,
  expenses,
  monthlyBudget,
  currencySymbol,
  onUpdateGmailSettings,
  showNotification,
  initialReportType = null,
  onClearInitialReportType,
  darkMode = true,
}: GmailReportsModalProps) {
  const [activeTab, setActiveTab] = useState<"automation" | "preview" | "history">("automation");
  const [recipientEmail, setRecipientEmail] = useState(profile?.gmailSettings?.recipientEmail || userEmail);
  const [weeklyEnabled, setWeeklyEnabled] = useState(profile?.gmailSettings?.weeklyReportsEnabled ?? true);
  const [monthlyEnabled, setMonthlyEnabled] = useState(profile?.gmailSettings?.monthlyReportsEnabled ?? true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Staged report for preview or confirmation
  const [stagedReport, setStagedReport] = useState<{
    type: "weekly" | "monthly";
    subject: string;
    html: string;
    periodLabel: string;
    thalaivarDialogue: string;
    executiveSummary: string;
    actionableTips: string[];
    totalSpent: number;
  } | null>(null);

  // Explicit confirmation modal per workspace-integration security mandate
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Check token status on open
  useEffect(() => {
    const token = getGmailAccessToken();
    if (token) {
      setIsConnected(true);
    } else if (profile?.gmailSettings?.connected) {
      // User connected previously in this account
      setIsConnected(true);
    }
  }, [isOpen, profile]);

  useEffect(() => {
    if (profile?.gmailSettings) {
      if (profile.gmailSettings.recipientEmail) setRecipientEmail(profile.gmailSettings.recipientEmail);
      if (profile.gmailSettings.weeklyReportsEnabled !== undefined) setWeeklyEnabled(profile.gmailSettings.weeklyReportsEnabled);
      if (profile.gmailSettings.monthlyReportsEnabled !== undefined) setMonthlyEnabled(profile.gmailSettings.monthlyReportsEnabled);
    } else if (userEmail && !recipientEmail) {
      setRecipientEmail(userEmail);
    }
  }, [profile, userEmail]);

  useEffect(() => {
    if (isOpen && initialReportType) {
      handlePrepareReport(initialReportType);
      onClearInitialReportType?.();
    }
  }, [isOpen, initialReportType]);

  if (!isOpen) return null;

  // Filter expenses for weekly vs monthly
  const getExpensesForPeriod = (type: "weekly" | "monthly") => {
    const now = new Date();
    if (type === "weekly") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const isoSeven = sevenDaysAgo.toISOString().slice(0, 10);
      return expenses.filter((e) => (e.date || "") >= isoSeven);
    } else {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const currentMonthPrefix = `${year}-${month}`;
      return expenses.filter((e) => (e.date || "").startsWith(currentMonthPrefix));
    }
  };

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    try {
      const { token, email } = await connectGmailAccount();
      setIsConnected(true);
      if (email && !recipientEmail) {
        setRecipientEmail(email);
      }
      await onUpdateGmailSettings({
        connected: true,
        recipientEmail: recipientEmail || email,
        weeklyReportsEnabled: weeklyEnabled,
        monthlyReportsEnabled: monthlyEnabled,
      });
      showNotification("Gmail connected successfully! Automated reports are ready.", "success");
    } catch (err: any) {
      console.error(err);
      showNotification(err?.message || "Could not connect Gmail account.", "warning");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      const payload: {
        connected: boolean;
        recipientEmail: string;
        weeklyReportsEnabled: boolean;
        monthlyReportsEnabled: boolean;
        lastWeeklyReportSentAt?: string;
        lastMonthlyReportSentAt?: string;
      } = {
        connected: isConnected,
        recipientEmail: (recipientEmail || userEmail || "").trim(),
        weeklyReportsEnabled: weeklyEnabled,
        monthlyReportsEnabled: monthlyEnabled,
      };
      if (profile?.gmailSettings?.lastWeeklyReportSentAt) {
        payload.lastWeeklyReportSentAt = profile.gmailSettings.lastWeeklyReportSentAt;
      }
      if (profile?.gmailSettings?.lastMonthlyReportSentAt) {
        payload.lastMonthlyReportSentAt = profile.gmailSettings.lastMonthlyReportSentAt;
      }

      await onUpdateGmailSettings(payload);
      showNotification("Gmail report schedules saved successfully!", "success");
    } catch (err: any) {
      showNotification(err?.message || "Failed to save settings.", "warning");
    }
  };

  const handlePrepareReport = async (type: "weekly" | "monthly") => {
    setIsGenerating(true);
    const targetExpenses = getExpensesForPeriod(type);
    const now = new Date();
    const periodLabel = type === "weekly"
      ? `Past 7 Days (${new Date(now.getTime() - 7 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`
      : `${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;

    try {
      // Call Gemini backend
      const res = await fetch("/api/generate-ai-spending-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: type,
          periodLabel,
          userName: userName || profile?.name || "Member",
          budget: monthlyBudget,
          currency: currencySymbol,
          expenses: targetExpenses,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate AI report");
      }

      const aiData = data.data;
      const totalSpent = targetExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      // Generate HTML email body
      const { html, subject } = buildFallbackReportHtml({
        reportType: type,
        periodLabel,
        userName: userName || profile?.name || "Member",
        budget: monthlyBudget,
        currency: currencySymbol,
        expenses: targetExpenses,
        thalaivarQuote: aiData.thalaivarDialogue,
        aiInsights: aiData.actionableTips,
      });

      setStagedReport({
        type,
        subject: aiData.subject || subject,
        html,
        periodLabel,
        thalaivarDialogue: aiData.thalaivarDialogue,
        executiveSummary: aiData.executiveSummary,
        actionableTips: aiData.actionableTips || [],
        totalSpent,
      });

      // Open explicit confirmation modal
      setIsConfirmModalOpen(true);
    } catch (err: any) {
      console.warn("AI generation error, using fallback template:", err);
      const totalSpent = targetExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const fallback = buildFallbackReportHtml({
        reportType: type,
        periodLabel,
        userName: userName || "User",
        budget: monthlyBudget,
        currency: currencySymbol,
        expenses: targetExpenses,
      });

      setStagedReport({
        type,
        subject: fallback.subject,
        html: fallback.html,
        periodLabel,
        thalaivarDialogue: "Kanna, kasu vishayathula aattatha kurai! Budget-ah safe-ah vechukko! (Keep your spending in check!)",
        executiveSummary: `Generated overview for ${periodLabel}. You recorded ${targetExpenses.length} entries totaling ${currencySymbol}${totalSpent.toLocaleString()}.`,
        actionableTips: [
          "Track small discretionary expenses daily to avoid leakage.",
          "Keep remaining balance within your target limit.",
          "Check category percentages before planning next week's spend."
        ],
        totalSpent,
      });
      setIsConfirmModalOpen(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExecuteSend = async () => {
    if (!stagedReport) return;
    setIsSending(true);

    try {
      let token = getGmailAccessToken();
      if (!token) {
        // Prompt OAuth connection
        const connectRes = await connectGmailAccount();
        token = connectRes.token;
        setIsConnected(true);
      }

      await sendGmailEmail({
        accessToken: token,
        to: recipientEmail.trim(),
        subject: stagedReport.subject,
        htmlBody: stagedReport.html,
      });

      const nowIso = new Date().toISOString();
      const updatedPayload: {
        connected: boolean;
        recipientEmail: string;
        weeklyReportsEnabled: boolean;
        monthlyReportsEnabled: boolean;
        lastWeeklyReportSentAt?: string;
        lastMonthlyReportSentAt?: string;
      } = {
        connected: true,
        recipientEmail: recipientEmail.trim(),
        weeklyReportsEnabled: weeklyEnabled,
        monthlyReportsEnabled: monthlyEnabled,
      };
      if (stagedReport.type === "weekly") {
        updatedPayload.lastWeeklyReportSentAt = nowIso;
      } else if (profile?.gmailSettings?.lastWeeklyReportSentAt) {
        updatedPayload.lastWeeklyReportSentAt = profile.gmailSettings.lastWeeklyReportSentAt;
      }
      if (stagedReport.type === "monthly") {
        updatedPayload.lastMonthlyReportSentAt = nowIso;
      } else if (profile?.gmailSettings?.lastMonthlyReportSentAt) {
        updatedPayload.lastMonthlyReportSentAt = profile.gmailSettings.lastMonthlyReportSentAt;
      }

      await onUpdateGmailSettings(updatedPayload);

      showNotification(
        `Gmail dispatched! ${stagedReport.type === "weekly" ? "Weekly" : "Monthly"} AI Report sent to ${recipientEmail}`,
        "success"
      );
      setIsConfirmModalOpen(false);
    } catch (err: any) {
      console.error("Failed to send Gmail email:", err);
      showNotification(err?.message || "Failed to send email through Gmail. Please ensure Gmail permissions are approved.", "warning");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
      />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-3xl bg-[#0c1017] border border-white/10 rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Top Header */}
        <div className="px-6 py-4.5 bg-slate-900/70 border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-500/20 to-red-500/10 text-rose-400 border border-rose-500/30">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Gmail AI Spending Reporter</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated weekly digests & monthly closure reports delivered to your inbox
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-white/[0.08] flex items-center gap-2 bg-slate-950/40 shrink-0">
          <button
            onClick={() => setActiveTab("automation")}
            className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === "automation"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Schedule & Automation</span>
          </button>

          <button
            onClick={() => {
              if (!stagedReport) {
                // Auto prepare monthly for preview if none staged
                handlePrepareReport("monthly");
              }
              setActiveTab("preview");
            }}
            className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === "preview"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Email Live Preview</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "automation" && (
            <>
              {/* Account Connection Status */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isConnected ? "bg-emerald-400 shadow-lg shadow-emerald-500/50" : "bg-amber-400"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      {isConnected ? "Gmail Account Linked" : "Gmail Not Linked"}
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {isConnected
                        ? `Ready to dispatch via OAuth as ${recipientEmail || userEmail}`
                        : "Connect with Google to authorize automated spending emails"}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConnectGmail}
                  disabled={isConnecting}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white border border-white/15 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? "animate-spin" : ""}`} />
                  <span>{isConnecting ? "Connecting..." : isConnected ? "Re-authorize Gmail" : "Connect Gmail"}</span>
                </button>
              </div>

              {/* Recipient Target */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Target Recipient Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="e.g. thulasitmk181@gmail.com"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Weekly and monthly reports will be delivered directly from your authorized Gmail account to this address.
                </p>
              </div>

              {/* Cadence Checkboxes (Weekly & Monthly) */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Automation Cadence
                </div>

                {/* Weekly Report Toggle */}
                <div
                  onClick={() => setWeeklyEnabled(!weeklyEnabled)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-start gap-3.5 ${
                    weeklyEnabled
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                      : "bg-white/[0.02] border-white/10 text-slate-400"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                      weeklyEnabled
                        ? "bg-emerald-500 border-emerald-400 text-slate-950 font-bold"
                        : "border-white/20 bg-slate-900"
                    }`}
                  >
                    {weeklyEnabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Send AI Spending Report Every Week</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        Weekly Cycle
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Every 7 days, generate a mini-review detailing total 7-day spending, high-burn categories, velocity, and a Superstar Rajinikanth punch dialogue.
                    </p>
                    {profile?.gmailSettings?.lastWeeklyReportSentAt && (
                      <div className="text-[10px] text-slate-500 mt-2 font-mono flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Last sent: {new Date(profile.gmailSettings.lastWeeklyReportSentAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Monthly Report Toggle */}
                <div
                  onClick={() => setMonthlyEnabled(!monthlyEnabled)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-start gap-3.5 ${
                    monthlyEnabled
                      ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                      : "bg-white/[0.02] border-white/10 text-slate-400"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                      monthlyEnabled
                        ? "bg-cyan-500 border-cyan-400 text-slate-950 font-bold"
                        : "border-white/20 bg-slate-900"
                    }`}
                  >
                    {monthlyEnabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Send Comprehensive AI Report After One Month</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        Monthly Closure
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      At the end of each month, deliver an in-depth financial closure audit covering budget variance, category breakdown, future projections, and Rajinikanth life advice.
                    </p>
                    {profile?.gmailSettings?.lastMonthlyReportSentAt && (
                      <div className="text-[10px] text-slate-500 mt-2 font-mono flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Last sent: {new Date(profile.gmailSettings.lastMonthlyReportSentAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Instant Manual Dispatch Buttons */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 border border-emerald-500/20 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Instant Manual Dispatch (Test & Send)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Generate an AI report with your live expense database right now and send it directly to your inbox with one click:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isGenerating || isSending}
                    onClick={() => handlePrepareReport("weekly")}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-emerald-500/40 text-left transition cursor-pointer disabled:opacity-50 group shadow-md"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                      <span>Send Weekly AI Report</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Last 7 days data ({getExpensesForPeriod("weekly").length} items)
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={isGenerating || isSending}
                    onClick={() => handlePrepareReport("monthly")}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-cyan-500/40 text-left transition cursor-pointer disabled:opacity-50 group shadow-md"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
                      <span>Send Monthly AI Report</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Current month review ({getExpensesForPeriod("monthly").length} items)
                    </p>
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Email Layout Preview</h4>
                  <p className="text-[11px] text-slate-400">
                    Live HTML preview as rendered in Gmail desktop and mobile clients
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrepareReport("weekly")}
                    disabled={isGenerating}
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-slate-300 border border-white/10 cursor-pointer"
                  >
                    Preview Weekly
                  </button>
                  <button
                    onClick={() => handlePrepareReport("monthly")}
                    disabled={isGenerating}
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-slate-300 border border-white/10 cursor-pointer"
                  >
                    Preview Monthly
                  </button>
                </div>
              </div>

              {stagedReport ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950 p-2 overflow-hidden shadow-inner">
                  <div className="px-3 py-2 border-b border-white/[0.08] text-[11px] font-mono text-slate-400 flex items-center justify-between">
                    <span className="truncate">Subject: {stagedReport.subject}</span>
                    <span className="shrink-0 text-emerald-400 font-bold ml-2">HTML Ready</span>
                  </div>
                  <iframe
                    title="Email Preview"
                    srcDoc={stagedReport.html}
                    className="w-full h-[450px] border-0 rounded-b-xl bg-[#07090e]"
                  />
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 text-xs">
                  Click either "Preview Weekly" or "Preview Monthly" to generate a live template.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-900/60 border-t border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            {isConnected ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Gmail OAuth Connected
              </span>
            ) : (
              <span>Connect Gmail to activate automated sending</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSavePreferences}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              Save Schedule Settings
            </button>
          </div>
        </div>
      </motion.div>

      {/* EXPLICIT USER CONFIRMATION DIALOG (Mandatory Workspace Integration Requirement) */}
      <AnimatePresence>
        {isConfirmModalOpen && stagedReport && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSending && setIsConfirmModalOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              className="relative w-full max-w-lg bg-[#0e1422] border border-emerald-500/40 rounded-3xl p-6 shadow-2xl shadow-emerald-950/50 z-10"
            >
              <div className="flex items-center gap-3 text-emerald-400 mb-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <Send className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Send AI {stagedReport.type === "weekly" ? "Weekly" : "Monthly"} Report via Gmail?
                  </h3>
                  <p className="text-xs text-slate-400">
                    An email will be dispatched from your Gmail account to the recipient below.
                  </p>
                </div>
              </div>

              {/* Summary preview card */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 mb-5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-slate-400">Recipient:</span>
                  <span className="font-mono font-bold text-emerald-300">{recipientEmail}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-slate-400">Cadence / Period:</span>
                  <span className="font-semibold text-white">{stagedReport.periodLabel}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-slate-400">Total Spent Tracked:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {currencySymbol}{stagedReport.totalSpent.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Thalaivar Punch Advice:</span>
                  <p className="text-[11px] italic text-amber-300/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                    "{stagedReport.thalaivarDialogue}"
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSending}
                  onClick={handleExecuteSend}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isSending ? "animate-pulse" : ""}`} />
                  <span>{isSending ? "Sending via Gmail..." : "Confirm & Send via Gmail"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
