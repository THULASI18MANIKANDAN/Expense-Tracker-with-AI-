import React, { useState, useEffect, useRef } from "react";
import { Expense } from "../types";
import { X, Calendar, Tag, CreditCard, AlignLeft, Edit3, Plus, ArrowRight, Trash2, ScanLine, Camera, Sparkles, RotateCw, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit: Expense | null;
  onSave: (expense: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  customCategories: string[];
  onAddCustomCategory: (newCategory: string) => void;
  currency?: string;
  defaultDate?: string;
}

const DEFAULT_CATEGORIES = [
  "Food",
  "PG",
  "Travel",
  "Auto",
  "Cab",
  "Tea",
  "Shopping",
  "Medicine",
  "Fuel",
  "Entertainment",
  "Bills",
  "Miscellaneous"
];

const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Food: { bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-300", dot: "bg-amber-400" },
  PG: { bg: "bg-indigo-500/15", border: "border-indigo-500/40", text: "text-indigo-300", dot: "bg-indigo-400" },
  Travel: { bg: "bg-cyan-500/15", border: "border-cyan-500/40", text: "text-cyan-300", dot: "bg-cyan-400" },
  Auto: { bg: "bg-sky-500/15", border: "border-sky-500/40", text: "text-sky-300", dot: "bg-sky-400" },
  Cab: { bg: "bg-teal-500/15", border: "border-teal-500/40", text: "text-teal-300", dot: "bg-teal-400" },
  Tea: { bg: "bg-orange-500/15", border: "border-orange-500/40", text: "text-orange-300", dot: "bg-orange-400" },
  Shopping: { bg: "bg-rose-500/15", border: "border-rose-500/40", text: "text-rose-300", dot: "bg-rose-400" },
  Medicine: { bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-300", dot: "bg-emerald-400" },
  Fuel: { bg: "bg-yellow-500/15", border: "border-yellow-500/40", text: "text-yellow-300", dot: "bg-yellow-400" },
  Entertainment: { bg: "bg-fuchsia-500/15", border: "border-fuchsia-500/40", text: "text-fuchsia-300", dot: "bg-fuchsia-400" },
  Bills: { bg: "bg-purple-500/15", border: "border-purple-500/40", text: "text-purple-300", dot: "bg-purple-400" },
  Miscellaneous: { bg: "bg-slate-500/15", border: "border-slate-500/40", text: "text-slate-300", dot: "bg-slate-400" }
};

const PAYMENT_MODES = [
  "Cash",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Net Banking"
];

export default function ExpenseModal({
  isOpen,
  onClose,
  expenseToEdit,
  onSave,
  onDelete,
  customCategories,
  onAddCustomCategory,
  currency = "₹",
  defaultDate
}: ExpenseModalProps) {
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("Food");
  const [customCatInput, setCustomCatInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScanReceiptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrScanning(true);
    setError("");
    setOcrSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      try {
        const response = await fetch("/api/ocr-bill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: dataUrl,
            mimeType: file.type || "image/jpeg",
            customCategories
          })
        });
        const resData = await response.json();
        if (resData.success && resData.data) {
          const d = resData.data;
          if (d.totalAmount > 0) setAmount(d.totalAmount.toString());
          if (d.description) setDescription(d.description);
          if (d.date) setDate(d.date);
          if (d.category) setCategory(d.category);
          if (d.paymentMode) setPaymentMode(d.paymentMode);
          if (d.notes || d.receiptNumber) {
            setNotes(d.notes || `Invoice #${d.receiptNumber}`);
          }
          setOcrSuccessMsg(`Scanned "${d.merchantName}" (${currency}${d.totalAmount}) successfully!`);
          setTimeout(() => setOcrSuccessMsg(null), 5000);
        } else {
          setError(resData.error || "Could not read receipt data.");
        }
      } catch (err: any) {
        setError("Network error while scanning receipt.");
      } finally {
        setIsOcrScanning(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      setError("Failed to read image file.");
      setIsOcrScanning(false);
    };
    reader.readAsDataURL(file);
  };

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  useEffect(() => {
    if (expenseToEdit) {
      setDate(expenseToEdit.date || new Date().toISOString().split("T")[0]);
      setCategory(expenseToEdit.category || "Food");
      setAmount(expenseToEdit.amount?.toString() || "");
      setDescription(expenseToEdit.description || "");
      setPaymentMode(expenseToEdit.paymentMode || "Cash");
      setNotes(expenseToEdit.notes || "");
      setShowCustomInput(false);
    } else {
      setDate(defaultDate || new Date().toISOString().split("T")[0]);
      setCategory("Food");
      setAmount("");
      setDescription("");
      setPaymentMode("Cash");
      setNotes("");
      setShowCustomInput(false);
    }
    setError("");
  }, [expenseToEdit, isOpen, defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please specify a valid monetary amount greater than 0");
      return;
    }

    if (!category || category.trim() === "") {
      setError("Please designate a transaction category");
      return;
    }

    setIsSubmitting(true);
    try {
      const data: any = {
        date,
        category: showCustomInput ? customCatInput.trim() : category,
        amount: parsedAmount,
        description: description.trim(),
        paymentMode,
        notes: notes.trim(),
      };

      if (showCustomInput) {
        if (!customCatInput.trim()) {
          setError("Custom category title cannot be left blank");
          setIsSubmitting(false);
          return;
        }
        onAddCustomCategory(customCatInput.trim());
        data.category = customCatInput.trim();
      }

      await onSave(data);
      onClose();
    } catch (err: any) {
      setError(err.message || "Unable to save transaction. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
          className="w-full max-w-lg bg-[#0e1422] border border-white/10 rounded-3xl shadow-2xl relative z-10 overflow-hidden text-slate-100"
          id="expense-modal"
        >
          {/* Header */}
          <div className="px-6 py-4.5 bg-slate-900/70 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight">
                  {expenseToEdit ? "Edit Record" : "Record Expense"}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {expenseToEdit ? "Modify transaction metadata and values" : "Log a new item or scan a physical receipt"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleScanReceiptFile}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                disabled={isOcrScanning}
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Scan receipt to auto-fill fields"
              >
                {isOcrScanning ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <ScanLine className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden xs:inline">Scan Bill (OCR)</span>
                  </>
                )}
              </button>

              <button
                id="close-modal-btn"
                onClick={onClose}
                className="p-2 hover:bg-white/[0.06] rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
            {ocrSuccessMsg && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{ocrSuccessMsg}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Amount Field - Highlighted Hero Input */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/[0.08] focus-within:border-emerald-500/50 transition">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Transaction Amount
                </label>
                <button
                  type="button"
                  disabled={isOcrScanning}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition"
                >
                  <ScanLine className="w-3 h-3" />
                  <span>Snap Bill / OCR</span>
                </button>
              </div>
              <div className="relative flex items-center">
                <span className="text-2xl font-mono font-bold text-emerald-400 mr-2 select-none">
                  {currency}
                </span>
                <input
                  id="expense-amount-input"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                  className="w-full bg-transparent border-none p-0 text-3xl font-bold font-mono tabular-nums text-white placeholder:text-slate-700 focus:outline-none"
                />
              </div>
            </div>

            {/* Date & Category in 2-column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Date
                </label>
                <input
                  id="expense-date-input"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-500" /> Category
                  </span>
                  {!showCustomInput && (
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(true)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono"
                    >
                      + Custom
                    </button>
                  )}
                </label>
                {!showCustomInput ? (
                  <select
                    id="expense-category-select"
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setShowCustomInput(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer font-sans"
                  >
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__custom__" className="text-emerald-400 font-semibold">
                      + Add Custom Category...
                    </option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      id="expense-custom-category-input"
                      type="text"
                      placeholder="Category name"
                      value={customCatInput}
                      onChange={(e) => setCustomCatInput(e.target.value)}
                      className="w-full bg-slate-950/70 border border-emerald-500/50 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none transition"
                    />
                    <button
                      id="cancel-custom-category-btn"
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-white/5 border border-white/10 rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick-tap Category Color Chips */}
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Quick Category Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {["Food", "Travel", "Tea", "Shopping", "Bills", "Medicine", "Fuel", "PG"].map((preset) => {
                  const s = CATEGORY_STYLES[preset] || { bg: "bg-slate-500/15", border: "border-slate-500/30", text: "text-slate-300", dot: "bg-slate-400" };
                  const isSelected = category === preset && !showCustomInput;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setCategory(preset);
                        setShowCustomInput(false);
                      }}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? `${s.bg} ${s.border} ${s.text} shadow-sm ring-1 ring-current font-bold`
                          : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description & Payment Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5 text-slate-500" /> Description
                </label>
                <input
                  id="expense-description-input"
                  type="text"
                  placeholder="e.g. Grocery restock, Uber trip"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Payment Channel
                </label>
                <select
                  id="expense-payment-select"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Notes & Context (Optional)
              </label>
              <textarea
                id="expense-notes-input"
                rows={2}
                placeholder="Add tags, bill numbers or reimbursement notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600 resize-none font-sans"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-between gap-2.5 border-t border-white/[0.08]">
              {expenseToEdit?.id && onDelete ? (
                <button
                  id="delete-expense-modal-btn"
                  type="button"
                  disabled={isDeleting || isSubmitting}
                  onClick={async () => {
                    if (expenseToEdit.id && onDelete) {
                      setIsDeleting(true);
                      await onDelete(expenseToEdit.id);
                      setIsDeleting(false);
                      onClose();
                    }
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? "Deleting..." : "Delete Record"}</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2.5">
                <button
                  id="cancel-expense-btn"
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/[0.06] text-xs font-semibold text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="expense-submit-btn"
                  type="submit"
                  disabled={isSubmitting || isDeleting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Recording...</span>
                  ) : (
                    <>
                      <span>{expenseToEdit ? "Update Transaction" : "Save Transaction"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
