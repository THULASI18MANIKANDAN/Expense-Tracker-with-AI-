import React, { useState, useEffect } from "react";
import { Expense } from "../types";
import { X, Calendar, Tag, CreditCard, AlignLeft, Edit3, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit: Expense | null;
  onSave: (expense: any) => Promise<void>;
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
  const [error, setError] = useState("");

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
      // Default reset
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
      setError("Please enter a valid amount greater than 0");
      return;
    }

    if (!category || category.trim() === "") {
      setError("Please select a category");
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
          setError("Custom category name cannot be empty");
          setIsSubmitting(false);
          return;
        }
        // Save the custom category to user's customCategories list
        onAddCustomCategory(customCatInput.trim());
        data.category = customCatInput.trim();
      }

      await onSave(data);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="w-full max-w-lg bg-slate-850 border border-slate-700 rounded-2xl shadow-2xl relative z-10 overflow-hidden text-slate-100"
          id="expense-modal"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-slate-800 border-b border-slate-700/60 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-emerald-400" />
              {expenseToEdit ? "Edit Transaction" : "Add Expense"}
            </h2>
            <button
              id="close-modal-btn"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
                {error}
              </div>
            )}

            {/* Amount Field (Large typography for premium feel) */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Amount</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-emerald-400 font-semibold text-xl">
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
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl py-3 pl-10 pr-4 text-xl font-bold text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Grid Layout for Date & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Date
                </label>
                <input
                  id="expense-date-input"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-500" /> Category
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
                    className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__custom__" className="text-emerald-400 font-semibold">
                      + Add Custom Category
                    </option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      id="expense-custom-category-input"
                      type="text"
                      placeholder="Category Name"
                      value={customCatInput}
                      onChange={(e) => setCustomCatInput(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all"
                    />
                    <button
                      id="cancel-custom-category-btn"
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <AlignLeft className="w-3.5 h-3.5 text-slate-500" /> Description
              </label>
              <input
                id="expense-description-input"
                type="text"
                required
                placeholder="What was this for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Payment Mode
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAYMENT_MODES.map((mode) => (
                  <button
                    id={`payment-mode-btn-${mode.replace(/\s+/g, '-').toLowerCase()}`}
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 px-3 border rounded-xl text-xs font-medium transition-all text-center cursor-pointer ${
                      paymentMode === mode
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                        : "bg-slate-900/30 border-slate-700/70 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Notes (Optional)</label>
              <textarea
                id="expense-notes-input"
                rows={2}
                placeholder="Additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl py-2 px-3.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-700/40">
              <button
                id="cancel-expense-btn"
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 transition"
              >
                Cancel
              </button>
              <button
                id="submit-expense-btn"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/10 hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? "Saving..." : expenseToEdit ? "Save Changes" : "Add Transaction"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
