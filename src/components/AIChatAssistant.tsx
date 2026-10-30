import React, { useState, useRef, useEffect } from "react";
import { Expense } from "../types";
import { Sparkles, Send, X, Bot, User, CornerDownLeft, Loader2, ArrowRight, PiggyBank, ChevronDown, ChevronUp, Lightbulb, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AIChatAssistantProps {
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
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { label: "Where did I spend the most?", query: "Where did I spend the most this month?" },
  { label: "Suggest savings tips", query: "Based on my current spending habits, suggest concrete ways I can save money." },
  { label: "Predict next month's spending", query: "Analyze my expenses and predict my total spending for next month." },
  { label: "Monthly spending summary", query: "Generate a friendly, structured financial summary of my logged expenses." }
];

export default function AIChatAssistant({
  expenses,
  budget,
  currency,
  isOpen,
  onClose,
  googleChatToken,
  selectedSpace,
  selectedSpaceDisplay,
  webhookUrl,
  onSendGoogleChatMessage
}: AIChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I am your **TMK AI Financial Assistant**. I can analyze your expenses, predict future spending, suggest where to cut costs, and answer any budgeting questions you have! \n\nClick one of the quick questions below or ask me anything!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAssistantExpanded, setIsAssistantExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Analyze expenses to identify top spending categories
  const totalSpending = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const categoryStats = React.useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
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

  const getActionableTips = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes("food") || lower.includes("dining") || lower.includes("restaurant") || lower.includes("grocer")) {
      return [
        "Plan meals weekly and shop with a strict list to reduce high-margin spontaneous grocery purchases.",
        "Limit dining out or weekend takeout to a fixed 'indulgence budget' of no more than twice a week.",
        "Audit food delivery app memberships and hidden service fees that quietly inflate meal prices."
      ];
    }
    if (lower.includes("shop") || lower.includes("cloth") || lower.includes("apparel") || lower.includes("lifestyle")) {
      return [
        "Institute a mandatory 48-hour cooling-off rule before completing any non-essential online checkout.",
        "Unsubscribe from promotional retailer newsletters to eliminate temptation triggers.",
        "Use browser price-comparison extensions to search for coupons or price histories before buying."
      ];
    }
    if (lower.includes("util") || lower.includes("bill") || lower.includes("phone") || lower.includes("sub") || lower.includes("internet")) {
      return [
        "Call service providers to negotiate current rates or request retention discounts on internet and phone plans.",
        "Audit active recurring SaaS & streaming subscriptions and immediately cancel any unused for over 30 days.",
        "Invest in smart power strips or adjust home thermostat schedules to lower seasonal energy bills."
      ];
    }
    if (lower.includes("travel") || lower.includes("transit") || lower.includes("car") || lower.includes("fuel") || lower.includes("transport")) {
      return [
        "Combine multiple individual errands into a single, efficient route to minimize fuel consumption.",
        "Compare weekly ridesharing costs against public transit passes or carpool options.",
        "Use fuel-tracker applications to locate the most competitive fuel prices in your immediate neighborhood."
      ];
    }
    if (lower.includes("ent") || lower.includes("game") || lower.includes("movie") || lower.includes("fun") || lower.includes("leisure")) {
      return [
        "Explore free local public events, park activities, or museum community days.",
        "Consolidate gaming or media subscription plans into shared family accounts where supported.",
        "Opt for hosted potlucks or casual home social gather-ups instead of expensive night outings."
      ];
    }
    // Default fallback
    return [
      "Track every transaction immediately to maintain strict visual accountability over daily micro-spending.",
      "Compare actual category spending against your allocated monthly budget targets weekly.",
      "Consider setting up an automated transfer of 10% of your income into savings right on payday."
    ];
  };

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsgId = Date.now().toString();
    const userMessage: Message = {
      id: userMsgId,
      sender: "user",
      text: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend,
          history: messages.map(m => ({
            sender: m.sender,
            text: m.text
          })),
          expenses,
          budget,
          currency
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch response");
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: data.answer,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: `⚠️ **Error:** ${err.message || "I couldn't complete the request right now. Please check your internet or configuration and try again."}`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format markdown strings cleanly
  const renderFormattedText = (text: string) => {
    // Basic formatting for Markdown bold, headers, lists
    return text.split("\n").map((line, idx) => {
      let trimmed = line.trim();
      let isHeader = trimmed.startsWith("###");
      let isBoldHeader = trimmed.startsWith("##");
      let isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");

      let content = line;
      if (isHeader) content = trimmed.substring(3).trim();
      else if (isBoldHeader) content = trimmed.substring(2).trim();
      else if (isBullet) content = trimmed.substring(2).trim();

      // Bold replacement (**text** -> <strong>text</strong>)
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="text-emerald-300 font-semibold">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }

      const elements = parts.length > 0 ? parts : [content];

      if (isBoldHeader) {
        return <h3 key={idx} className="text-base font-bold text-white mt-3 mb-1">{elements}</h3>;
      }
      if (isHeader) {
        return <h4 key={idx} className="text-sm font-semibold text-white mt-2 mb-1">{elements}</h4>;
      }
      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-300 py-0.5">
            {elements}
          </li>
        );
      }
      return <p key={idx} className="text-slate-300 py-0.5 leading-relaxed text-sm min-h-[1rem]">{elements}</p>;
    });
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
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="relative z-10 w-full max-w-md bg-slate-900 border-l border-slate-700/60 shadow-2xl flex flex-col h-full text-slate-100"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">AI Financial Insights</h3>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    Powered by Gemini 2.5 Flash
                  </p>
                </div>
              </div>
              <button
                id="close-ai-chat-btn"
                onClick={onClose}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Smart Spending Assistant Widget */}
            <div className="border-b border-slate-800 bg-slate-900/40">
              <div 
                id="smart-spending-toggle"
                onClick={() => setIsAssistantExpanded(!isAssistantExpanded)}
                className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition select-none"
              >
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">Smart Spending Assistant</span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">
                    Active Analysis
                  </span>
                </div>
                <button className="text-slate-400 hover:text-slate-200 transition">
                  {isAssistantExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              <AnimatePresence>
                {isAssistantExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 space-y-3 pt-1">
                      {expenses.length === 0 ? (
                        <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-center">
                          <p className="text-xs text-slate-400 italic">No expenses recorded yet.</p>
                          <p className="text-[10px] text-slate-500 mt-1">Log your transactions in the dashboard to unlock custom analysis and saving recommendations.</p>
                        </div>
                      ) : (
                        <>
                          {/* Highest spending category breakdown */}
                          {topCategory && (
                            <div className="p-3 bg-slate-950/55 border border-slate-800/80 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Top Spend Category</span>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                                  {topCategory.percentage.toFixed(0)}% of total
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span className="text-xs font-bold text-slate-100">{topCategory.category}</span>
                                </div>
                                <span className="text-xs font-extrabold text-slate-200">
                                  {currency} {topCategory.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              {/* Custom progress bar */}
                              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.min(100, topCategory.percentage)}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Actionable Saving Guidelines */}
                          {topCategory && (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1 text-slate-400">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Actionable Saving Tips</span>
                              </div>
                              <div className="space-y-1.5">
                                {getActionableTips(topCategory.category).map((tip, idx) => (
                                  <div key={idx} className="flex gap-2 p-2 bg-slate-950/25 border border-slate-850 rounded-lg text-xs text-slate-300">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{tip}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Interactive Custom saving strategy query trigger */}
                          {topCategory && (
                            <button
                              id="ask-savings-strategy-btn"
                              onClick={() => {
                                handleSendMessage(
                                  `Analyze my spending in the "${topCategory.category}" category where I spent ${currency} ${topCategory.amount.toFixed(2)} (${topCategory.percentage.toFixed(0)}% of my total spend). Provide a personalized, realistic 3-step actionable saving strategy to cut down on this expense specifically without compromising my quality of life.`
                                );
                              }}
                              className="w-full py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl text-[11px] font-extrabold tracking-wide uppercase shadow-md transition transform active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Ask AI For Personalized Plan</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Conversation Stream */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/20">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                      msg.sender === "ai" 
                        ? "bg-emerald-950 border-emerald-800/40 text-emerald-400" 
                        : "bg-slate-800 border-slate-700 text-slate-300"
                    }`}>
                      {msg.sender === "ai" ? <Bot className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
                    </div>

                    {/* Bubble */}
                    <div className={`p-3.5 rounded-2xl relative group ${
                      msg.sender === "ai"
                        ? "bg-slate-850 border border-slate-800 text-slate-200"
                        : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-100"
                    }`}>
                      {renderFormattedText(msg.text)}
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/40 text-[9px] text-slate-500 gap-4">
                        {(webhookUrl || (googleChatToken && selectedSpace)) && msg.sender === "ai" ? (
                          <button
                            type="button; button-share-ai-tip"
                            onClick={async () => {
                              if (onSendGoogleChatMessage) {
                                const success = await onSendGoogleChatMessage(
                                  `💡 *Smart Saving Insights Shared From TMK* 💡\n\n${msg.text}`
                                );
                                if (success) {
                                  // Action logged and notified in App.tsx
                                }
                              }
                            }}
                            className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 px-1.5 py-0.5 rounded cursor-pointer transition select-none"
                          >
                            <svg className="w-2.5 h-2.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                            </svg>
                            Share to Google Chat
                          </button>
                        ) : <span />}
                        <span>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 max-w-[85%] mr-auto"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-950 border border-emerald-800/40 text-emerald-400">
                      <Bot className="w-4.5 h-4.5" />
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 text-slate-300 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span className="text-xs text-slate-400">Analyzing expenses...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Prompts */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">Quick Commands</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {QUICK_PROMPTS.map((p, idx) => (
                  <button
                    id={`quick-ai-prompt-btn-${idx}`}
                    key={idx}
                    onClick={() => handleSendMessage(p.query)}
                    disabled={isLoading}
                    className="text-[11px] bg-slate-800 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-750 text-slate-300 py-1.5 px-2.5 rounded-xl transition text-left cursor-pointer flex items-center gap-1 active:scale-[0.98]"
                  >
                    {p.label}
                    <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input Box */}
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
                  placeholder="Ask about your budget, savings..."
                  disabled={isLoading}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 rounded-xl py-3 pl-4 pr-12 text-xs focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/70 transition"
                />
                <button
                  id="send-ai-message-btn"
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 text-slate-950 rounded-lg transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
              <div className="text-[10px] text-center text-slate-500 mt-2">
                AI can make mistakes. Consider verifying important financial data.
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
