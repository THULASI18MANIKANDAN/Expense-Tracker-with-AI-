import React, { useState, useRef, useEffect } from "react";
import { Expense } from "../types";
import { 
  Sparkles, 
  Send, 
  X, 
  Bot, 
  User, 
  Loader2, 
  ArrowRight, 
  PiggyBank, 
  ChevronDown, 
  ChevronUp, 
  Lightbulb, 
  CheckCircle2, 
  RotateCcw, 
  Copy, 
  Check, 
  Zap, 
  Brain, 
  ShieldAlert, 
  Briefcase, 
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface AIChatAssistantProps {
  expenses: Expense[];
  budget: number;
  currency: string;
  isOpen: boolean;
  onClose: () => void;
  googleChatToken?: string | null;
  selectedSpace?: string;
  selectedSpaceDisplay?: string;
  webhookUrl?: string;
  onSendGoogleChatMessage?: (text: string) => Promise<boolean>;
  profileName?: string;
}

export type ChatRole = "advisor" | "auditor" | "strategist" | "speedy" | "complex_simulator" | "custom";
export type ModelType = "gemini-3.8-flash" | "gemini-3.1-flash-lite" | "gemini-4-argon";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
  modelUsed?: string;
  roleUsed?: string;
}

interface RoleDefinition {
  id: ChatRole;
  title: string;
  shortName: string;
  description: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  suggestedModel: ModelType;
  starterGreeting: string;
  quickPrompts: string[];
}

const ROLES: RoleDefinition[] = [
  {
    id: "advisor",
    title: "Personal Finance Advisor",
    shortName: "Advisor",
    description: "Balanced budgeting, holistic spending guidance, and 50/30/20 coaching.",
    badge: "General Tasks",
    icon: Briefcase,
    suggestedModel: "gemini-3.8-flash",
    starterGreeting: "Hello! I am your **Personal Finance Advisor** powered by Gemini 3.8 Flash. I can review your transactions, help you build a budget, and highlight areas to optimize.",
    quickPrompts: [
      "Where did I spend the most this month?",
      "How do my expenses align with the 50/30/20 budget rule?",
      "Give me 3 realistic habits to save more money this month.",
      "Summarize my recent spending in a friendly financial digest."
    ]
  },
  {
    id: "auditor",
    title: "Strict Frugal Auditor",
    shortName: "Auditor",
    description: "Tough love, anti-waste inspection, subscription audit, and leak reduction.",
    badge: "Discretionary Cuts",
    icon: ShieldAlert,
    suggestedModel: "gemini-3.8-flash",
    starterGreeting: "I am your **Strict Frugal Auditor**. I'm here to scrutinize your spending, point out unnecessary leaks, and help you eliminate waste.",
    quickPrompts: [
      "Audit my logged expenses and flag any impulsive or non-essential spending.",
      "Calculate how much my discretionary splurges will cost me over an entire year.",
      "Which specific category should I cut back on immediately?",
      "Challenge me with a 14-day zero-waste spending sprint."
    ]
  },
  {
    id: "strategist",
    title: "Wealth & Investment Strategist",
    shortName: "Strategist",
    description: "Long-term compounding, emergency fund sizing, and wealth milestones.",
    badge: "Future Growth",
    icon: TrendingUp,
    suggestedModel: "gemini-3.8-flash",
    starterGreeting: "Greetings! I'm your **Wealth & Investment Strategist**. Let's turn everyday savings into long-term wealth, emergency fund protection, and compounding returns.",
    quickPrompts: [
      "Based on my monthly spend, how large should my 6-month emergency fund be?",
      "If I invest 20% of what I save each month, simulate my 5-year growth.",
      "How can I transition from tracking expenses to building passive wealth?",
      "What savings rate should I aim for based on my budget?"
    ]
  },
  {
    id: "speedy",
    title: "Speedy Math & Assistant",
    shortName: "Fast Q&A",
    description: "Ultra-low latency, crisp bullet points, exact category sums, and rapid math.",
    badge: "Fast Mode",
    icon: Zap,
    suggestedModel: "gemini-3.1-flash-lite",
    starterGreeting: "Hi! **Speedy Assistant** ready. Powered by Gemini 3.1 Flash-Lite for instant answers, quick sums, and concise action steps.",
    quickPrompts: [
      "Quick summary: total spent, remaining budget, top category.",
      "Calculate my average daily spending this month.",
      "List all food & dining expenses quickly.",
      "What is my highest single transaction?"
    ]
  },
  {
    id: "complex_simulator",
    title: "Deep Scenario & Risk Modeler",
    shortName: "Deep Modeler",
    description: "Mathematical projections, inflation stress-tests, and multi-variable debt payoff.",
    badge: "Complex Tasks",
    icon: Brain,
    suggestedModel: "gemini-4-argon",
    starterGreeting: "Welcome. I am your **Deep Scenario & Financial Modeler** powered by Gemini 4 Argon. I handle complex multi-month simulations, debt amortization, and financial stress-testing.",
    quickPrompts: [
      "Simulate my budget under a 15% inflation increase across essential categories.",
      "Run a mathematical comparison between aggressive debt payoff vs emergency saving.",
      "Perform a multi-scenario 6-month cash flow stress test based on my history.",
      "Break down my variance and standard deviation of spending across categories."
    ]
  },
  {
    id: "custom",
    title: "Custom AI Persona",
    shortName: "Custom",
    description: "Define your own custom role instructions and parameters for Gemini.",
    badge: "User Defined",
    icon: SlidersHorizontal,
    suggestedModel: "gemini-3.8-flash",
    starterGreeting: "Custom Persona active. Customize my role and system instructions below, or start chatting directly!",
    quickPrompts: [
      "Evaluate my expenses according to my custom instructions.",
      "Give me a customized weekly breakdown.",
      "Act as my personal financial accountability buddy.",
      "Help me reach my next savings goal."
    ]
  }
];

const MODELS = [
  { 
    id: "gemini-3.8-flash" as ModelType, 
    name: "Gemini 3.8 Flash", 
    tag: "General (Default)", 
    desc: "Standard general tasks, balanced speed & intelligence" 
  },
  { 
    id: "gemini-3.1-flash-lite" as ModelType, 
    name: "Gemini 3.1 Flash-Lite", 
    tag: "Fast Tasks", 
    desc: "Lightning fast responses for instant queries" 
  },
  { 
    id: "gemini-4-argon" as ModelType, 
    name: "Gemini 4 Argon", 
    tag: "Complex Tasks", 
    desc: "Advanced reasoning for deep scenarios & simulations" 
  }
];

export default function AIChatAssistant({
  expenses,
  budget,
  currency,
  isOpen,
  onClose,
  googleChatToken,
  selectedSpace,
  webhookUrl,
  onSendGoogleChatMessage,
  profileName
}: AIChatAssistantProps) {
  const [selectedRole, setSelectedRole] = useState<ChatRole>("advisor");
  const [selectedModel, setSelectedModel] = useState<ModelType>("gemini-3.8-flash");
  const [customSystemInstruction, setCustomSystemInstruction] = useState(
    "You are a friendly, disciplined personal finance coach who specializes in helping families cut costs and save for vacations."
  );
  const [showRoleConfig, setShowRoleConfig] = useState(false);

  const activeRoleDef = ROLES.find((r) => r.id === selectedRole) || ROLES[0];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: activeRoleDef.starterGreeting,
      timestamp: new Date(),
      modelUsed: "gemini-3.8-flash",
      roleUsed: "advisor"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAssistantExpanded, setIsAssistantExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  // Financial summary stats
  const totalSpending = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const categoryStats = React.useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + Number(e.amount || 0);
    });
    return Object.entries(totals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, totalSpending]);

  const topCategory = categoryStats[0];

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Handle switching roles
  const handleSelectRole = (roleId: ChatRole) => {
    setSelectedRole(roleId);
    const targetDef = ROLES.find((r) => r.id === roleId);
    if (targetDef) {
      setSelectedModel(targetDef.suggestedModel);
      // Append a system note or switch greeting if thread is empty or just started
      if (messages.length <= 1) {
        setMessages([
          {
            id: `welcome-${roleId}-${Date.now()}`,
            sender: "ai",
            text: targetDef.starterGreeting,
            timestamp: new Date(),
            modelUsed: targetDef.suggestedModel,
            roleUsed: roleId
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `role-switch-${Date.now()}`,
            sender: "ai",
            text: `🔄 Switched role to **${targetDef.title}** (${targetDef.suggestedModel}). How can I assist you now?`,
            timestamp: new Date(),
            modelUsed: targetDef.suggestedModel,
            roleUsed: roleId
          }
        ]);
      }
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-reset-${Date.now()}`,
        sender: "ai",
        text: activeRoleDef.starterGreeting,
        timestamp: new Date(),
        modelUsed: selectedModel,
        roleUsed: selectedRole
      }
    ]);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend.trim(),
      timestamp: new Date()
    };

    const newMessagesList = [...messages, userMessage];
    setMessages(newMessagesList);
    setInput("");
    setIsLoading(true);

    try {
      // Send conversation history with system instruction, role, model, and live financial context
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend.trim(),
          messages: newMessagesList.map((m) => ({
            role: m.sender === "user" ? "user" : "model",
            sender: m.sender,
            text: m.text
          })),
          role: selectedRole,
          customInstruction: selectedRole === "custom" ? customSystemInstruction : undefined,
          model: selectedModel,
          expenses,
          budget,
          currency,
          profileName
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate AI response.");
      }

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: data.answer,
        timestamp: new Date(),
        modelUsed: data.model || selectedModel,
        roleUsed: data.role || selectedRole
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-error-${Date.now()}`,
          sender: "ai",
          text: `⚠️ **Unable to complete response:** ${err.message || "An unexpected error occurred. Please verify your settings and retry."}`,
          timestamp: new Date(),
          modelUsed: selectedModel,
          roleUsed: selectedRole
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format markdown strings cleanly
  const renderFormattedText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      const isHeader = trimmed.startsWith("###");
      const isBoldHeader = trimmed.startsWith("##");
      const isMainHeader = trimmed.startsWith("# ");
      const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
      const isNumbered = /^\d+\.\s/.test(trimmed);

      let content = line;
      if (isMainHeader) content = trimmed.substring(2).trim();
      else if (isBoldHeader) content = trimmed.substring(2).trim();
      else if (isHeader) content = trimmed.substring(3).trim();
      else if (isBullet) content = trimmed.substring(2).trim();
      else if (isNumbered) content = trimmed.replace(/^\d+\.\s/, "").trim();

      // Bold replacement (**text** -> <strong>text</strong>)
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="text-emerald-300 font-semibold">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }

      const elements = parts.length > 0 ? parts : [content];

      if (isMainHeader || isBoldHeader) {
        return (
          <h3 key={idx} className="text-sm font-bold text-white mt-3 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {elements}
          </h3>
        );
      }
      if (isHeader) {
        return (
          <h4 key={idx} className="text-xs font-semibold text-emerald-200 mt-2.5 mb-1">
            {elements}
          </h4>
        );
      }
      if (isBullet || isNumbered) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-300 py-0.5 text-xs leading-relaxed">
            {elements}
          </li>
        );
      }
      if (!trimmed) {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="text-slate-300 py-0.5 leading-relaxed text-xs">
          {elements}
        </p>
      );
    });
  };

  const getActionableTips = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes("food") || lower.includes("dining") || lower.includes("restaurant") || lower.includes("grocer")) {
      return [
        "Plan weekly meal preps to cut spontaneous grocery and delivery runs.",
        "Set a strict weekend restaurant spending cap of at most twice a week.",
        "Audit recurring delivery app subscriptions and checkout platform service fees."
      ];
    }
    if (lower.includes("shop") || lower.includes("cloth") || lower.includes("apparel") || lower.includes("lifestyle")) {
      return [
        "Enforce a 48-hour cooling-off rule before purchasing non-essentials.",
        "Unsubscribe from flash-sale retail alerts and marketing newsletters.",
        "Search for coupons or price histories before checkout."
      ];
    }
    if (lower.includes("util") || lower.includes("bill") || lower.includes("sub") || lower.includes("phone")) {
      return [
        "Audit streaming subscriptions and cancel any services idle for >30 days.",
        "Call telecom/internet providers to negotiate retention discounts.",
        "Optimize home climate controls to reduce monthly utility spikes."
      ];
    }
    return [
      "Track micro-expenses daily to eliminate unnoticed pocket leaks.",
      "Re-allocate 10% of discretionary spend directly to an emergency savings account.",
      "Check weekly category spending against your monthly target."
    ];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
          />

          {/* Chatbot Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="relative z-10 w-full max-w-lg bg-slate-900 border-l border-slate-700/70 shadow-2xl flex flex-col h-full text-slate-100"
          >
            {/* Top Bar / Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
                  <Bot className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">Gemini Financial Chatbot</h3>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                      Multi-Turn
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span>Role: <strong className="text-emerald-300 font-medium">{activeRoleDef.title}</strong></span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[10px] text-slate-400 font-mono">{selectedModel}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Reset / Clear Chat Button */}
                <button
                  id="reset-chat-history-btn"
                  onClick={handleClearHistory}
                  title="Clear conversation and start fresh"
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Role & Model Settings Toggle */}
                <button
                  id="toggle-role-settings-btn"
                  onClick={() => setShowRoleConfig(!showRoleConfig)}
                  title="Configure Chatbot Role & Gemini Model"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    showRoleConfig 
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                      : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>

                {/* Close Button */}
                <button
                  id="close-ai-chat-btn"
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Role & Model Configuration Bar (collapsible) */}
            <AnimatePresence>
              {showRoleConfig && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-slate-800 bg-slate-950/70"
                >
                  <div className="p-4 space-y-3.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Select Chatbot Persona & Role
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {ROLES.map((role) => {
                          const IconComp = role.icon;
                          const isSelected = selectedRole === role.id;
                          return (
                            <button
                              id={`select-role-${role.id}`}
                              key={role.id}
                              type="button"
                              onClick={() => handleSelectRole(role.id)}
                              className={`p-2 rounded-xl text-left transition border cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? "bg-emerald-500/15 border-emerald-500/50 text-white shadow-xs"
                                  : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <IconComp className={`w-3.5 h-3.5 ${isSelected ? "text-emerald-400" : "text-slate-400"}`} />
                                <span className="font-bold text-[11px] truncate">{role.shortName}</span>
                              </div>
                              <span className="text-[9px] text-slate-400 leading-tight line-clamp-1">{role.badge}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedRole === "custom" && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Custom System Role Instruction
                        </label>
                        <textarea
                          id="custom-role-instruction-input"
                          value={customSystemInstruction}
                          onChange={(e) => setCustomSystemInstruction(e.target.value)}
                          rows={2}
                          placeholder="e.g., You are a strict debt-snowball advisor focusing exclusively on student loans..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Gemini Model Selection
                        </label>
                        <span className="text-[9px] text-slate-400">
                          Default: <strong className="text-emerald-400 font-mono">gemini-3.8-flash</strong>
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {MODELS.map((m) => {
                          const isSelected = selectedModel === m.id;
                          return (
                            <button
                              id={`select-model-${m.id}`}
                              key={m.id}
                              type="button"
                              onClick={() => setSelectedModel(m.id)}
                              className={`p-2 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-200"
                                  : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                              }`}
                            >
                              <span className="font-mono font-bold text-[10px] truncate">{m.name}</span>
                              <span className="text-[9px] text-slate-400 mt-0.5">{m.tag}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-400">
                      <span>Live context: {expenses.length} expenses • Budget: {currency}{budget.toLocaleString()}</span>
                      <button
                        onClick={() => setShowRoleConfig(false)}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live Financial Context Bar (always visible summary) */}
            <div className="px-5 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 text-slate-400">
                <span className="flex items-center gap-1 text-[11px]">
                  <PiggyBank className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Spent: <strong className="text-slate-200">{currency}{totalSpending.toLocaleString()}</strong></span>
                </span>
                <span className="text-slate-700">•</span>
                <span className="text-[11px]">
                  Limit: <strong className="text-slate-200">{currency}{budget.toLocaleString()}</strong>
                </span>
              </div>

              {topCategory && (
                <button
                  onClick={() => setIsAssistantExpanded(!isAssistantExpanded)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>Top: {topCategory.category} ({topCategory.percentage.toFixed(0)}%)</span>
                  {isAssistantExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

            {/* Smart Spending Quick Breakdown (Collapsible) */}
            <AnimatePresence>
              {isAssistantExpanded && topCategory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-slate-800 bg-slate-950/40 px-5 py-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Largest Spending Category:</span>
                    <span className="font-bold text-emerald-400">{topCategory.category} - {currency}{topCategory.amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, topCategory.percentage)}%` }}
                    />
                  </div>
                  <div className="space-y-1">
                    {getActionableTips(topCategory.category).slice(0, 2).map((tip, idx) => (
                      <div key={idx} className="flex gap-2 text-[11px] text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    id="ask-top-category-strategy-btn"
                    onClick={() => {
                      setIsAssistantExpanded(false);
                      handleSendMessage(`Analyze my spending in "${topCategory.category}" (${currency}${topCategory.amount.toLocaleString()} - ${topCategory.percentage.toFixed(0)}% of total). Give me a 3-step actionable reduction plan.`);
                    }}
                    className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Ask Gemini For Personalized Plan</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SCROLLABLE MESSAGE THREAD */}
            <div 
              ref={chatScrollContainerRef}
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-950/30 scroll-smooth"
            >
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isUser = msg.sender === "user";
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 max-w-[88%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${
                        isUser 
                          ? "bg-slate-800 border-slate-700 text-slate-300"
                          : "bg-emerald-950/80 border-emerald-700/50 text-emerald-400"
                      }`}>
                        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4.5 h-4.5" />}
                      </div>

                      {/* Bubble Content */}
                      <div className={`p-3.5 rounded-2xl relative group transition ${
                        isUser
                          ? "bg-emerald-600 text-slate-950 rounded-tr-xs font-normal"
                          : "bg-slate-850/90 border border-slate-800 text-slate-200 rounded-tl-xs shadow-md"
                      }`}>
                        {/* Role / Model Tag on AI messages */}
                        {!isUser && (msg.roleUsed || msg.modelUsed) && (
                          <div className="flex items-center gap-1.5 mb-1.5 text-[9px] text-slate-400 font-mono">
                            <span className="text-emerald-400 font-semibold">{msg.roleUsed ? msg.roleUsed.toUpperCase() : "GEMINI"}</span>
                            <span>•</span>
                            <span>{msg.modelUsed || selectedModel}</span>
                          </div>
                        )}

                        {/* Formatted Text */}
                        <div className={`${isUser ? "text-slate-950 font-medium text-xs leading-relaxed" : ""}`}>
                          {isUser ? msg.text : renderFormattedText(msg.text)}
                        </div>

                        {/* Message Footer / Actions */}
                        <div className={`flex items-center justify-between mt-2 pt-1.5 border-t text-[9px] gap-3 ${
                          isUser ? "border-emerald-700/30 text-emerald-950/80" : "border-slate-800/60 text-slate-500"
                        }`}>
                          <div className="flex items-center gap-2">
                            {/* Copy button */}
                            <button
                              onClick={() => handleCopyMessage(msg.id, msg.text)}
                              title="Copy text"
                              className="hover:text-emerald-400 transition cursor-pointer flex items-center gap-1"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            {/* Google Chat share button */}
                            {!isUser && (webhookUrl || (googleChatToken && selectedSpace)) && onSendGoogleChatMessage && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSendGoogleChatMessage(`💡 *Gemini Finance Insights*\n\n${msg.text}`);
                                }}
                                title="Share this insight to Google Chat"
                                className="hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer transition"
                              >
                                <span>Share</span>
                              </button>
                            )}
                          </div>

                          <span className="tabular-nums">
                            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 max-w-[85%] mr-auto"
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-emerald-950/80 border border-emerald-700/50 text-emerald-400">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-850/90 border border-slate-800 text-slate-300 flex items-center gap-2.5 shadow-md">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      <div className="text-xs">
                        <span className="text-slate-300 font-medium">Generating insight with </span>
                        <span className="text-emerald-400 font-mono font-semibold">{selectedModel}</span>
                        <span className="text-slate-500 animate-pulse">...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Prompts */}
            <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Suggested Prompts ({activeRoleDef.shortName})
                </span>
                <span className="text-[9px] text-slate-500">Click to send</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {activeRoleDef.quickPrompts.map((promptText, idx) => (
                  <button
                    id={`quick-role-prompt-${idx}`}
                    key={idx}
                    onClick={() => handleSendMessage(promptText)}
                    disabled={isLoading}
                    className="text-[11px] whitespace-nowrap bg-slate-800/90 hover:bg-slate-750 border border-slate-700/70 hover:border-emerald-500/40 text-slate-300 py-1.5 px-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-[0.98] disabled:opacity-50"
                  >
                    <span>{promptText}</span>
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Message Input Box */}
            <div className="p-4 border-t border-slate-800 bg-slate-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(input);
                }}
                className="relative flex items-center"
              >
                <input
                  id="ai-chat-text-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask ${activeRoleDef.title} about your spending, budget, or tips...`}
                  disabled={isLoading}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 rounded-xl py-3 pl-4 pr-12 text-xs focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/70 transition shadow-inner"
                />
                <button
                  id="send-ai-message-btn"
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 text-slate-950 rounded-lg transition shadow-md cursor-pointer disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
                <span>Multi-turn Gemini chat • Retains discussion history</span>
                <span className="font-mono text-emerald-500/70">{selectedModel}</span>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
