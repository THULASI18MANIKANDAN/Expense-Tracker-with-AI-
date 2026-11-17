import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCw, 
  ShieldAlert, 
  Compass, 
  ArrowUpRight, 
  ArrowDownRight, 
  Zap, 
  Flame, 
  Target, 
  BarChart3,
  Calendar,
  Layers,
  Lightbulb,
  Check
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from "recharts";
import { SpendingProjection, CategoryRisk, Expense } from "../types";
import { getCategoryStyle } from "../App";

interface SpendingProjectionProps {
  currentMonth: string; // YYYY-MM
  monthlyBudget: number;
  currentMonthExpenses: Expense[];
  allExpenses: Expense[];
  currencySymbol: string;
  darkMode?: boolean;
}

export default function SpendingProjectionCard({
  currentMonth,
  monthlyBudget,
  currentMonthExpenses,
  allExpenses,
  currencySymbol,
  darkMode = true
}: SpendingProjectionProps) {
  const [projection, setProjection] = useState<SpendingProjection | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string>("gemini-3.8-flash");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [scenarioAdjustment, setScenarioAdjustment] = useState<number>(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Derive calendar metrics
  const now = new Date();
  const [yearStr, monthStr] = (currentMonth || now.toISOString().slice(0, 7)).split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  
  const isCurrentMonthCalendar = now.getFullYear() === year && (now.getMonth() + 1) === month;
  const daysElapsed = isCurrentMonthCalendar ? Math.min(totalDaysInMonth, Math.max(1, now.getDate())) : totalDaysInMonth;
  const daysRemaining = isCurrentMonthCalendar ? Math.max(0, totalDaysInMonth - daysElapsed) : 0;

  // Calculate current month spent and category distribution
  const currentMonthSpent = currentMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const dailyAverageCurrent = daysElapsed > 0 ? (currentMonthSpent / daysElapsed) : 0;

  const categoryTotals: Record<string, number> = {};
  currentMonthExpenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (Number(e.amount) || 0);
  });
  const categoryBreakdown = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([category, spent]) => ({
      category,
      spent,
      percentage: currentMonthSpent > 0 ? Math.round((spent / currentMonthSpent) * 100) : 0
    }));

  // Group historical months
  const monthsMap: Record<string, { totalSpent: number; count: number }> = {};
  allExpenses.forEach((e) => {
    const m = (e.date || "").slice(0, 7);
    if (m && m !== currentMonth) {
      if (!monthsMap[m]) monthsMap[m] = { totalSpent: 0, count: 0 };
      monthsMap[m].totalSpent += Number(e.amount) || 0;
      monthsMap[m].count += 1;
    }
  });
  const historicalMonths = Object.entries(monthsMap).map(([m, data]) => ({
    month: m,
    totalSpent: Math.round(data.totalSpent),
    count: data.count
  }));

  const lastFetchParamsRef = useRef<string>("");
  const fetchTimeoutRef = useRef<any>(null);

  // Fetch projection from server-side Gemini API with debouncing and caching
  const fetchProjection = async (adjustment = scenarioAdjustment, force = false) => {
    const paramsKey = `${currentMonth}_${currentMonthSpent}_${monthlyBudget}_${adjustment}`;
    if (!force && lastFetchParamsRef.current === paramsKey && projection) {
      return;
    }
    
    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch("/api/spending-projection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentMonth,
          daysElapsed,
          daysRemaining,
          totalDaysInMonth,
          currentMonthSpent,
          monthlyBudget,
          currency: currencySymbol,
          dailyAverageCurrent,
          categoryBreakdown,
          historicalMonths,
          recentTransactions: currentMonthExpenses.slice(-15),
          scenarioAdjustment: adjustment
        })
      });

      const data = await response.json();
      if (data.success && data.projection) {
        setProjection(data.projection);
        setSource(data.source || "gemini-3.8-flash");
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        lastFetchParamsRef.current = paramsKey;
      } else {
        setFetchError("Could not retrieve AI projection.");
      }
    } catch (err: any) {
      console.warn("Notice: projection service fallback active", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(() => {
      fetchProjection(scenarioAdjustment);
    }, 300);
    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [currentMonth, currentMonthSpent, monthlyBudget]);

  const handleScenarioChange = (adj: number) => {
    setScenarioAdjustment(adj);
    fetchProjection(adj, true);
  };

  // Status badge helpers
  const getStatusBadge = (status: string, variance: number) => {
    if (status === "critical" || variance > 0) {
      return {
        label: "BUDGET OVERRUN RISK",
        bg: "bg-rose-500/15 border-rose-500/30 text-rose-300",
        icon: ShieldAlert,
        glow: "shadow-rose-500/20"
      };
    }
    if (status === "warning") {
      return {
        label: "APPROACHING CEILING",
        bg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
        icon: AlertTriangle,
        glow: "shadow-amber-500/20"
      };
    }
    if (status === "surplus") {
      return {
        label: "SUBSTANTIAL SURPLUS",
        bg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
        icon: TrendingDown,
        glow: "shadow-cyan-500/20"
      };
    }
    return {
      label: "ON TRACK (SAFE RUNWAY)",
      bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
      icon: CheckCircle2,
      glow: "shadow-emerald-500/20"
    };
  };

  const statusInfo = getStatusBadge(projection?.runwayStatus || "on_track", projection?.projectedVariance || 0);
  const StatusIcon = statusInfo.icon;

  return (
    <div className={`rounded-3xl border ${darkMode ? "bg-[#0b1329]/80 border-white/[0.08]" : "bg-white border-slate-200 light-surface"} p-5 sm:p-7 backdrop-blur-xl transition-all shadow-2xl relative overflow-hidden`}>
      {/* Background subtle glowing radial gradient */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/[0.05] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-500/[0.04] rounded-full blur-[100px] pointer-events-none" />

      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08] relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-[1px] shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className={`w-full h-full ${darkMode ? "bg-[#080d1a]" : "bg-white"} rounded-[11px] flex items-center justify-center text-emerald-400`}>
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white tracking-tight">
                  Gemini Predictive Spending Forecast
                </h3>
                <span className="hidden xs:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-semibold">
                  <Zap className="w-2.5 h-2.5 text-violet-400" />
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                AI projection based on current {daysElapsed}-day trajectory & historical velocity
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Last Updated */}
        <div className="flex items-center gap-2.5 shrink-0">
          {lastUpdated && (
            <span className="text-[11px] font-mono text-slate-400 hidden md:inline">
              Updated {lastUpdated}
            </span>
          )}
          <button
            onClick={() => fetchProjection(scenarioAdjustment)}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Recalculate forecast with latest spending data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            <span>{loading ? "Forecasting..." : "Refresh Forecast"}</span>
          </button>
        </div>
      </div>

      {/* ERROR MESSAGE IF ANY */}
      {fetchError && !projection && (
        <div className="my-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{fetchError} Click "Refresh Forecast" to try again.</span>
        </div>
      )}

      {/* MAIN PROJECTION DASHBOARD */}
      {projection && (
        <div className="mt-6 space-y-6 relative z-10">
          
          {/* BANNER 1: STATUS & CORE PREDICTION STATS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Left Big Focus: Projected Month-End Total */}
            <div className="md:col-span-5 p-5 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Projected Month-End Spend
                  </span>
                  <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusInfo.bg}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.label}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
                    {currencySymbol}{projection.projectedMonthEndSpend.toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-2 font-medium leading-relaxed">
                  {projection.statusHeadline}
                </p>
              </div>

              {/* Progress Comparison to Budget Ceiling */}
              <div className="mt-5 pt-4 border-t border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Monthly Budget Ceiling:</span>
                  <span className="text-slate-200 font-bold">{currencySymbol}{monthlyBudget.toLocaleString()}</span>
                </div>
                
                {monthlyBudget > 0 && (
                  <>
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden p-[1px]">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${
                          projection.projectedMonthEndSpend > monthlyBudget 
                            ? "bg-gradient-to-r from-amber-500 to-rose-500" 
                            : "bg-gradient-to-r from-emerald-500 to-teal-400"
                        }`}
                        style={{ 
                          width: `${Math.min(100, (projection.projectedMonthEndSpend / monthlyBudget) * 100)}%` 
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">
                        {Math.round((projection.projectedMonthEndSpend / monthlyBudget) * 100)}% of ceiling
                      </span>
                      <span className={`font-bold flex items-center gap-0.5 ${
                        projection.projectedVariance > 0 ? "text-rose-400" : "text-emerald-400"
                      }`}>
                        {projection.projectedVariance > 0 ? (
                          <>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            +{currencySymbol}{Math.abs(projection.projectedVariance).toLocaleString()} overrun
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            {currencySymbol}{Math.abs(projection.projectedVariance).toLocaleString()} remaining buffer
                          </>
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right: Key Pacing Indicators */}
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
              
              {/* Stat 1: Current Burn Rate */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">Current Velocity</span>
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="my-2">
                  <div className="text-lg font-bold font-mono text-white">
                    {currencySymbol}{Math.round(dailyAverageCurrent).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">daily burn rate</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 border-t border-white/[0.06] pt-1.5">
                  Over past {daysElapsed} days
                </div>
              </div>

              {/* Stat 2: Safe Daily Target */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">Safe Daily Limit</span>
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="my-2">
                  <div className="text-lg font-bold font-mono text-emerald-400">
                    {currencySymbol}{projection.recommendedSafeDailySpend.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">recommended cap</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 border-t border-white/[0.06] pt-1.5">
                  For remaining {daysRemaining} days
                </div>
              </div>

              {/* Stat 3: Next Month Projection */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">Next Month Outlook</span>
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="my-2">
                  <div className="text-lg font-bold font-mono text-cyan-400">
                    {currencySymbol}{projection.predictedNextMonthTotal.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">forward forecast</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 border-t border-white/[0.06] pt-1.5">
                  {projection.confidenceScore}% confidence
                </div>
              </div>

              {/* Stat 4 & 5: Interactive Scenario Simulator buttons */}
              <div className="col-span-2 sm:col-span-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-300">
                    Scenario Simulator:
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleScenarioChange(-15)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium border transition cursor-pointer ${
                      scenarioAdjustment === -15 
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold" 
                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    Frugal (-15%)
                  </button>
                  <button
                    onClick={() => handleScenarioChange(0)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium border transition cursor-pointer ${
                      scenarioAdjustment === 0 
                        ? "bg-violet-500/20 border-violet-400 text-violet-300 font-bold" 
                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    Baseline (0%)
                  </button>
                  <button
                    onClick={() => handleScenarioChange(20)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium border transition cursor-pointer ${
                      scenarioAdjustment === 20 
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold" 
                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    High Burn (+20%)
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 2: PROJECTED TRAJECTORY TIMELINE CHART */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-white/[0.08]">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Cumulative Spending Trajectory vs Budget Line
                </h4>
                <p className="text-xs text-slate-400">
                  Visual milestone path showing actual trajectory leading to the Gemini-projected month-end
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-slate-300">Projected Spend</span>
                </div>
                {monthlyBudget > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 bg-rose-400" />
                    <span className="text-slate-300">Budget Limit</span>
                  </div>
                )}
              </div>
            </div>

            <div className="h-64 w-full">
              {projection.projectedTrajectoryPoints && projection.projectedTrajectoryPoints.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={projection.projectedTrajectoryPoints} 
                    margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#ffffff" : "#94a3b8"} opacity={darkMode ? 0.06 : 0.28} />
                    <XAxis 
                      dataKey="label" 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false} 
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false} 
                      tickFormatter={(v) => `${currencySymbol}${v}`} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: darkMode ? "#080d1a" : "#ffffff", 
                        border: darkMode ? "1px solid rgba(255,255,255,0.15)" : "1px solid #cbd5e1",
                        color: darkMode ? "#f8fafc" : "#0f172a",
                        borderRadius: "14px",
                        fontFamily: "JetBrains Mono",
                        fontSize: "12px"
                      }}
                      formatter={(val: any, name: string) => [
                        `${currencySymbol}${Number(val).toLocaleString()}`, 
                        name === "projectedCumulative" ? "Projected Cumulative" : "Budget Target"
                      ]}
                    />
                    {monthlyBudget > 0 && (
                      <ReferenceLine 
                        y={monthlyBudget} 
                        stroke="#f43f5e" 
                        strokeDasharray="4 4" 
                        strokeWidth={1.5}
                        label={{ value: "Budget Ceiling", fill: "#f43f5e", fontSize: 10, position: "top" }}
                      />
                    )}
                    <Line 
                      type="monotone" 
                      dataKey="projectedCumulative" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#080d1a" }} 
                      activeDot={{ r: 6, fill: "#34d399" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                  Calculating trajectory curve...
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: CATEGORY PACE & RISK RADAR */}
          {projection.categoryRisks && projection.categoryRisks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-400" />
                  Category Trajectory & Risk Radar
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  Current spent vs Projected month-end
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {projection.categoryRisks.map((catRisk, idx) => {
                  const style = getCategoryStyle(catRisk.category);
                  const isHigh = catRisk.riskLevel === "high";
                  const isMed = catRisk.riskLevel === "medium";

                  return (
                    <div 
                      key={idx} 
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isHigh 
                          ? "bg-rose-500/[0.06] border-rose-500/25" 
                          : isMed 
                          ? "bg-amber-500/[0.05] border-amber-500/20" 
                          : "bg-white/[0.02] border-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: style.hex }} />
                          <span className="font-bold text-xs text-white truncate max-w-[120px]">
                            {catRisk.category}
                          </span>
                        </div>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full uppercase border ${
                          isHigh 
                            ? "bg-rose-500/20 border-rose-500/30 text-rose-300" 
                            : isMed 
                            ? "bg-amber-500/20 border-amber-500/30 text-amber-300" 
                            : "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                        }`}>
                          {catRisk.riskLevel} risk
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between text-xs font-mono my-1.5">
                        <span className="text-slate-400">Current: {currencySymbol}{catRisk.currentSpent.toLocaleString()}</span>
                        <span className="text-white font-bold">
                          Proj: {currencySymbol}{catRisk.projectedMonthEnd.toLocaleString()}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 italic line-clamp-2 mt-1">
                        {catRisk.reasoning}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 4: GEMINI PREDICTIVE INTELLIGENCE & ACTIONABLE PLAYBOOK */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Key Drivers */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider mb-3 font-mono">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>Key Trajectory Drivers</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                {(projection.keyDrivers || []).map((driver, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Strategic Recommendations */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/[0.07] to-cyan-500/[0.02] border border-emerald-500/20">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider mb-3 font-mono">
                <Lightbulb className="w-4 h-4 text-emerald-400" />
                <span>Gemini Actionable Recommendations</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-200 leading-relaxed">
                {(projection.actionableRecommendations || []).map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* Loading Skeleton if initial loading */}
      {loading && !projection && (
        <div className="mt-8 space-y-4 animate-pulse">
          <div className="h-32 bg-white/[0.04] rounded-2xl" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-20 bg-white/[0.03] rounded-2xl" />
            <div className="h-20 bg-white/[0.03] rounded-2xl" />
            <div className="h-20 bg-white/[0.03] rounded-2xl" />
          </div>
          <div className="h-48 bg-white/[0.02] rounded-2xl" />
        </div>
      )}

    </div>
  );
}
