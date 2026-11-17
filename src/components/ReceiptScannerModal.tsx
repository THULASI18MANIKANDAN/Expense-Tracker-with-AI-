import React, { useState, useRef } from "react";
import { 
  ScanLine, 
  Upload, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles, 
  Receipt, 
  Store, 
  Calendar, 
  CreditCard, 
  Tag, 
  FileText, 
  RotateCw, 
  ArrowRight,
  ShieldCheck,
  ListFilter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ParsedReceiptData {
  merchantName: string;
  totalAmount: number;
  date: string;
  category: string;
  paymentMode: string;
  description: string;
  items: Array<{ name: string; qty?: number; price?: number }>;
  taxAmount?: number;
  receiptNumber?: string | null;
  confidence: number;
  notes?: string;
}

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogExpense: (expenseData: {
    amount: number;
    description: string;
    category: string;
    date: string;
    paymentMode: string;
    notes: string;
  }) => Promise<void>;
  onOpenFullModalWithData?: (prefilled: any) => void;
  currencySymbol: string;
  customCategories?: string[];
  darkMode?: boolean;
}

const CATEGORIES = [
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

const PAYMENT_MODES = ["UPI", "Credit Card", "Debit Card", "Cash", "Net Banking"];

export default function ReceiptScannerModal({
  isOpen,
  onClose,
  onLogExpense,
  onOpenFullModalWithData,
  currencySymbol = "₹",
  customCategories = [],
  darkMode = true
}: ReceiptScannerModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedReceiptData | null>(null);

  // Form states for manual tweaking
  const [editMerchant, setEditMerchant] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState("Food");
  const [editPaymentMode, setEditPaymentMode] = useState("UPI");
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process file upload / snapshot
  const handleFileProcess = (file: File) => {
    setError(null);
    setParsedData(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSelectedImage(dataUrl);
      setMimeType(file.type || "image/jpeg");
      // Trigger scan automatically
      triggerOCR(dataUrl, file.type || "image/jpeg");
    };
    reader.onerror = () => {
      setError("Unable to read selected image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  // Drag and drop handler
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileProcess(file);
    } else {
      setError("Please drop a valid receipt or bill image.");
    }
  };

  // Perform AI OCR scan via server endpoint
  const triggerOCR = async (imageBase64: string, type: string) => {
    setIsScanning(true);
    setError(null);
    try {
      const response = await fetch("/api/ocr-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageBase64,
          mimeType: type,
          customCategories
        })
      });

      const resData = await response.json();
      if (resData.success && resData.data) {
        const d: ParsedReceiptData = resData.data;
        setParsedData(d);
        setEditMerchant(d.merchantName);
        setEditAmount(d.totalAmount > 0 ? d.totalAmount.toString() : "");
        setEditDate(d.date || new Date().toISOString().slice(0, 10));
        setEditCategory(d.category || "Food");
        setEditPaymentMode(d.paymentMode || "UPI");
        setEditDescription(d.description || d.merchantName);
        setEditNotes(d.notes || (d.receiptNumber ? `Invoice #${d.receiptNumber}` : ""));
      } else {
        setError(resData.error || "Could not extract receipt data. Please check image clarity.");
      }
    } catch (err: any) {
      console.error("Scan request failed:", err);
      setError("Network error communicating with AI OCR engine.");
    } finally {
      setIsScanning(false);
    }
  };

  // Demo bill generator for instant testing
  const handleLoadSampleBill = (type: "grocery" | "restaurant" | "fuel") => {
    // Generate clean canvas SVG-based sample receipt
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw realistic receipt look
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 600, 800);

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 26px monospace";
    ctx.textAlign = "center";

    const dateStr = new Date().toISOString().slice(0, 10);

    if (type === "grocery") {
      ctx.fillText("D-MART HYPERMARKET", 300, 70);
      ctx.font = "14px monospace";
      ctx.fillText("GSTIN: 29AABCU9603R1ZM", 300, 100);
      ctx.fillText(`Date: ${dateStr}   Bill: #DM-94821`, 300, 130);
      ctx.fillText("Payment Mode: UPI (GPay)", 300, 155);
      ctx.fillRect(50, 180, 500, 2);

      ctx.textAlign = "left";
      ctx.font = "16px monospace";
      ctx.fillText("Basmati Rice 5kg", 70, 220); ctx.textAlign = "right"; ctx.fillText("420.00", 530, 220);
      ctx.textAlign = "left";
      ctx.fillText("Fortune Sunflower Oil 2L", 70, 260); ctx.textAlign = "right"; ctx.fillText("340.00", 530, 260);
      ctx.textAlign = "left";
      ctx.fillText("Tata Salt 1kg", 70, 300); ctx.textAlign = "right"; ctx.fillText("28.00", 530, 300);
      ctx.textAlign = "left";
      ctx.fillText("Amul Butter 500g", 70, 340); ctx.textAlign = "right"; ctx.fillText("275.00", 530, 340);
      ctx.textAlign = "left";
      ctx.fillText("Mixed Dry Fruits 250g", 70, 380); ctx.textAlign = "right"; ctx.fillText("387.00", 530, 380);

      ctx.fillRect(50, 420, 500, 2);
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "left";
      ctx.fillText("TOTAL AMOUNT:", 70, 460);
      ctx.textAlign = "right";
      ctx.fillText("Rs 1,450.00", 530, 460);
      ctx.textAlign = "center";
      ctx.font = "italic 14px monospace";
      ctx.fillText("*** Thank You! Visit Again ***", 300, 530);
    } else if (type === "restaurant") {
      ctx.fillText("SARAVANA BHAVAN", 300, 70);
      ctx.font = "14px monospace";
      ctx.fillText("Authentic South Indian Cuisine", 300, 100);
      ctx.fillText(`Date: ${dateStr}   Table: T-14`, 300, 130);
      ctx.fillText("Payment Mode: Credit Card", 300, 155);
      ctx.fillRect(50, 180, 500, 2);

      ctx.textAlign = "left";
      ctx.font = "16px monospace";
      ctx.fillText("2x Special Masala Dosa", 70, 230); ctx.textAlign = "right"; ctx.fillText("280.00", 530, 230);
      ctx.textAlign = "left";
      ctx.fillText("1x Ghee Podi Idli (2pcs)", 70, 280); ctx.textAlign = "right"; ctx.fillText("140.00", 530, 280);
      ctx.textAlign = "left";
      ctx.fillText("2x Madras Filter Coffee", 70, 330); ctx.textAlign = "right"; ctx.fillText("120.00", 530, 330);
      ctx.textAlign = "left";
      ctx.fillText("1x Rava Kesari", 70, 380); ctx.textAlign = "right"; ctx.fillText("90.00", 530, 380);
      ctx.textAlign = "left";
      ctx.fillText("CGST 2.5% + SGST 2.5%", 70, 430); ctx.textAlign = "right"; ctx.fillText("31.50", 530, 430);

      ctx.fillRect(50, 460, 500, 2);
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "left";
      ctx.fillText("NET PAYABLE:", 70, 500);
      ctx.textAlign = "right";
      ctx.fillText("Rs 661.50", 530, 500);
      ctx.textAlign = "center";
      ctx.font = "italic 14px monospace";
      ctx.fillText("Have a Wonderful Day!", 300, 570);
    } else {
      ctx.fillText("SHELL PETROL STATION", 300, 70);
      ctx.font = "14px monospace";
      ctx.fillText("V-Power Unleaded Fuel", 300, 100);
      ctx.fillText(`Date: ${dateStr}   Pump: 04`, 300, 130);
      ctx.fillText("Payment Mode: UPI", 300, 155);
      ctx.fillRect(50, 180, 500, 2);

      ctx.textAlign = "left";
      ctx.font = "16px monospace";
      ctx.fillText("Fuel Density: 742 kg/m3", 70, 230);
      ctx.fillText("Volume: 19.82 Liters", 70, 280); ctx.textAlign = "right"; ctx.fillText("@ 105.95/L", 530, 280);

      ctx.fillRect(50, 340, 500, 2);
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "left";
      ctx.fillText("TOTAL PAID:", 70, 390);
      ctx.textAlign = "right";
      ctx.fillText("Rs 2,100.00", 530, 390);
      ctx.textAlign = "center";
      ctx.font = "italic 14px monospace";
      ctx.fillText("Drive Safely - Thank you for fueling with Shell", 300, 470);
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setSelectedImage(dataUrl);
    setMimeType("image/jpeg");
    triggerOCR(dataUrl, "image/jpeg");
  };

  // Submit and log directly to Firestore
  const handleConfirmLog = async () => {
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      setError("Please specify a valid monetary amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onLogExpense({
        amount: amt,
        description: editDescription.trim() || editMerchant.trim() || "Receipt Expense",
        category: editCategory,
        date: editDate || new Date().toISOString().slice(0, 10),
        paymentMode: editPaymentMode,
        notes: editNotes.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to record expense. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
          className="w-full max-w-2xl bg-[#090d16] border border-white/10 rounded-3xl shadow-2xl relative z-10 overflow-hidden text-slate-100 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-slate-900/80 border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-sm shadow-cyan-500/10">
                <ScanLine className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    AI Bill & Receipt Scanner (OCR)
                  </h3>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25">
                    Gemini 3.8 Flash
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Snap a photo or upload any bill/invoice to extract and log expenses instantly
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Upload & Capture Control Area */}
            {!selectedImage ? (
              <div className="space-y-4">
                {/* Drag and Drop Box */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-white/15 hover:border-cyan-500/50 rounded-2xl p-8 text-center bg-white/[0.02] hover:bg-white/[0.04] transition cursor-pointer group flex flex-col items-center justify-center relative"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />

                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition shadow-lg shadow-cyan-500/10">
                    <ScanLine className="w-7 h-7" />
                  </div>

                  <h4 className="text-sm font-bold text-white mb-1">
                    Upload Receipt or Drag & Drop Here
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mb-4">
                    Supports JPG, PNG, WEBP, invoices, supermarket slips, fuel bills, and restaurant checks
                  </p>

                  <div className="flex flex-wrap gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Choose File</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-cyan-400" />
                      <span>Snap Photo</span>
                    </button>
                  </div>
                </div>

                {/* Instant Sample Receipts for Zero-Friction Testing */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Test Instantly with Sample Bills:
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">1-click demo</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadSampleBill("restaurant")}
                      className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-left transition cursor-pointer group"
                    >
                      <span className="text-xs font-bold text-white block group-hover:text-cyan-300">
                        Saravana Bhavan
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 mt-0.5 block">
                        ₹661.50 · Dining
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadSampleBill("grocery")}
                      className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-left transition cursor-pointer group"
                    >
                      <span className="text-xs font-bold text-white block group-hover:text-cyan-300">
                        D-Mart Groceries
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 mt-0.5 block">
                        ₹1,450.00 · Shopping
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadSampleBill("fuel")}
                      className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-left transition cursor-pointer group"
                    >
                      <span className="text-xs font-bold text-white block group-hover:text-cyan-300">
                        Shell Petrol Station
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 mt-0.5 block">
                        ₹2,100.00 · Fuel
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Image & Scanner Split Grid */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Left Column: Image Preview with Laser Radar */}
                  <div className="md:col-span-5 relative rounded-2xl overflow-hidden bg-slate-950 border border-white/10 flex flex-col items-center justify-center p-3 max-h-[340px]">
                    <img
                      src={selectedImage}
                      alt="Scanned Bill"
                      className="max-h-[300px] w-auto object-contain rounded-xl shadow-lg"
                    />

                    {/* Laser Scanner Radar Animation */}
                    {isScanning && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between overflow-hidden">
                        <motion.div
                          animate={{ y: [0, 300, 0] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee]"
                        />
                        <div className="absolute inset-0 bg-cyan-500/10 animate-pulse" />
                      </div>
                    )}

                    {/* Retake Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setParsedData(null);
                      }}
                      className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-white/20 text-xs text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 shadow-md"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Retake</span>
                    </button>
                  </div>

                  {/* Right Column: OCR Extraction Review Form */}
                  <div className="md:col-span-7 space-y-3">
                    {isScanning ? (
                      <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-3 animate-spin">
                          <RotateCw className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">
                          Analyzing Receipt with Gemini OCR...
                        </h4>
                        <p className="text-xs text-slate-400 max-w-xs font-mono">
                          Extracting merchant, items, taxes, payment mode, and total amount...
                        </p>
                      </div>
                    ) : parsedData ? (
                      <div className="space-y-3">
                        {/* Confidence Match Badge */}
                        <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                          <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold font-mono">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>OCR Verified ({parsedData.confidence}% match)</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            Review & verify fields
                          </span>
                        </div>

                        {/* Amount & Merchant Inputs */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-mono font-semibold uppercase text-slate-400 mb-1">
                              Total Amount ({currencySymbol}) *
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-full bg-slate-950 border border-white/15 rounded-xl py-2 px-3 text-base font-mono font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-mono font-semibold uppercase text-slate-400 mb-1">
                              Date *
                            </label>
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="w-full bg-slate-950 border border-white/15 rounded-xl py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>

                        {/* Description / Merchant */}
                        <div>
                          <label className="block text-[10px] font-mono font-semibold uppercase text-slate-400 mb-1">
                            Merchant / Description *
                          </label>
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full bg-slate-950 border border-white/15 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                            placeholder="e.g. Dinner at Saravana Bhavan"
                          />
                        </div>

                        {/* Category & Payment Mode */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-mono font-semibold uppercase text-slate-400 mb-1">
                              Category
                            </label>
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="w-full bg-slate-950 border border-white/15 rounded-xl py-2 px-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                            >
                              {Array.from(new Set([...CATEGORIES, ...customCategories])).map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-mono font-semibold uppercase text-slate-400 mb-1">
                              Payment Mode
                            </label>
                            <select
                              value={editPaymentMode}
                              onChange={(e) => setEditPaymentMode(e.target.value)}
                              className="w-full bg-slate-950 border border-white/15 rounded-xl py-2 px-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                            >
                              {PAYMENT_MODES.map((mode) => (
                                <option key={mode} value={mode}>{mode}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Itemized Line Items (if detected) */}
                        {parsedData.items && parsedData.items.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] max-h-24 overflow-y-auto">
                            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                              Extracted Line Items ({parsedData.items.length}):
                            </span>
                            <div className="space-y-1">
                              {parsedData.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-[11px] font-mono">
                                  <span className="text-slate-300 truncate max-w-[180px]">
                                    {item.qty ? `${item.qty}x ` : ""}{item.name}
                                  </span>
                                  {item.price && (
                                    <span className="text-slate-400 tabular-nums">
                                      {currencySymbol}{item.price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        <div>
                          <label className="block text-[10px] font-mono font-semibold uppercase text-slate-400 mb-1">
                            Notes / Reference (Optional)
                          </label>
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="e.g. Invoice #94821"
                            className="w-full bg-slate-950 border border-white/15 rounded-xl py-1.5 px-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3.5 bg-slate-900/80 border-t border-white/[0.08] flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>

            {parsedData && (
              <div className="flex gap-2">
                {onOpenFullModalWithData && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenFullModalWithData({
                        amount: parseFloat(editAmount) || 0,
                        description: editDescription,
                        category: editCategory,
                        date: editDate,
                        paymentMode: editPaymentMode,
                        notes: editNotes
                      });
                      onClose();
                    }}
                    className="py-2 px-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/20 transition cursor-pointer"
                  >
                    Open in Editor
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleConfirmLog}
                  disabled={isSubmitting}
                  className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>{isSubmitting ? "Logging..." : "Log Expense to Ledger"}</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
