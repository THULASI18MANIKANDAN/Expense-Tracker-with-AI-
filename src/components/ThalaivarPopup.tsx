import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Volume2, VolumeX, RefreshCw, Flame, Zap } from "lucide-react";
import {
  getThalaivarSpendingTier,
  getRandomThalaivarDialogue,
  ThalaivarDialogue,
  SpendingRateTier
} from "../lib/thalaivarDialogues";

interface ThalaivarPopupProps {
  isOpen: boolean;
  onClose: () => void;
  expense: {
    amount: number;
    category: string;
    description?: string;
  } | null;
  currency?: string;
  monthlyBudget?: number;
}

export default function ThalaivarPopup({
  isOpen,
  onClose,
  expense,
  currency = "₹",
  monthlyBudget = 15000
}: ThalaivarPopupProps) {
  const [currentTier, setCurrentTier] = useState<SpendingRateTier | null>(null);
  const [dialogue, setDialogue] = useState<ThalaivarDialogue | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [particles, setParticles] = useState<Array<{ id: number; emoji: string; x: number; y: number; size: number; delay: number }>>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play Rajini Style Signature Punch Chime using Web Audio API
  const playThalaivarChime = (tierId: string) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Rajini brass fanfare / punch sound effect:
      if (tierId === "danger" || tierId === "heavy") {
        // Dramatic alarm/bass punch + rising fanfare
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(140, now);
        osc1.frequency.exponentialRampToValueAtTime(70, now + 0.35);

        gain1.gain.setValueAtTime(0.25, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.4);

        // Fanfare chord
        [330, 415, 495, 660].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + 0.15 + idx * 0.06);

          gain.gain.setValueAtTime(0.2, now + 0.15 + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55 + idx * 0.06);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + 0.15 + idx * 0.06);
          osc.stop(now + 0.6 + idx * 0.06);
        });
      } else {
        // High energetic upbeat chime (Baasha / Sivaji punch)
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.07);

          gain.gain.setValueAtTime(0.25, now + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.4);
        });
      }
    } catch (e) {
      // Audio not permitted or failed, fail silently
    }
  };

  // Generate particles and dialogue whenever popup opens
  useEffect(() => {
    if (isOpen && expense) {
      const tier = getThalaivarSpendingTier(expense.amount, monthlyBudget);
      setCurrentTier(tier);
      const pickedDialogue = getRandomThalaivarDialogue(tier);
      setDialogue(pickedDialogue);

      // Generate floating emojis
      const emojisToScatter = tier.emojis;
      const count = 16;
      const newParticles = Array.from({ length: count }).map((_, i) => ({
        id: i,
        emoji: emojisToScatter[i % emojisToScatter.length],
        x: (Math.random() - 0.5) * 360,
        y: -180 - Math.random() * 200,
        size: Math.floor(Math.random() * 18) + 20,
        delay: Math.random() * 0.35
      }));
      setParticles(newParticles);

      // Play audio chime
      playThalaivarChime(tier.id);
    }
  }, [isOpen, expense, monthlyBudget]);

  // Shuffle dialogue
  const handleShuffleDialogue = () => {
    if (!currentTier) return;
    const newDialogue = getRandomThalaivarDialogue(currentTier);
    setDialogue(newDialogue);
    playThalaivarChime(currentTier.id);
  };

  if (!isOpen || !expense || !currentTier || !dialogue) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        {/* Backdrop with dark gradient and glass blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
        />

        {/* Floating Emoji Bursts */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0, y: 0, x: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.4, 1.4, 1.2, 0.8],
                y: [0, p.y],
                x: [0, p.x],
                rotate: [0, (Math.random() - 0.5) * 60]
              }}
              transition={{
                duration: 1.8,
                delay: p.delay,
                ease: "easeOut"
              }}
              style={{ fontSize: `${p.size}px` }}
              className="absolute select-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
            >
              {p.emoji}
            </motion.div>
          ))}
        </div>

        {/* Main Popup Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 20 }}
          transition={{ type: "spring", damping: 24, stiffness: 320 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden z-10"
          style={{
            borderColor: currentTier.id === "danger"
              ? "rgba(244, 63, 94, 0.6)"
              : currentTier.id === "heavy"
              ? "rgba(245, 158, 11, 0.6)"
              : currentTier.id === "mass"
              ? "rgba(6, 182, 212, 0.6)"
              : "rgba(16, 185, 129, 0.6)",
            boxShadow: `0 20px 60px -15px ${currentTier.glowColor}, 0 0 40px -10px ${currentTier.glowColor}`
          }}
        >
          {/* Top golden / neon decorative accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 shadow-sm" />

          {/* Action bar (close, audio, refresh) */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🕶️</span>
              <span className="text-xs font-black tracking-widest uppercase bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
                SUPERSTAR RAJINI EXPENSE PUNCH
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Mute audio punch" : "Enable audio punch"}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition"
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Superstar Animated Badge */}
          <div className="flex flex-col items-center text-center my-3">
            <motion.div
              animate={{
                rotate: [0, -3, 3, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 p-0.5 shadow-lg shadow-amber-500/30 flex items-center justify-center mb-3"
            >
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex flex-col items-center justify-center">
                <span className="text-3xl filter drop-shadow-[0_2px_8px_rgba(251,191,36,0.8)]">
                  {dialogue.emoji || "🕶️"}
                </span>
                <span className="text-[9px] font-black text-amber-400 tracking-wider mt-0.5">
                  THALAIVAR
                </span>
              </div>
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-1 -right-1 text-amber-300"
              >
                <Sparkles size={16} />
              </motion.div>
            </motion.div>

            {/* Spending Rate Tier Pill */}
            <div className="flex items-center gap-2 mb-2 flex-wrap justify-center">
              <span className={`px-3 py-1 text-xs font-bold rounded-full border ${currentTier.badgeColor} flex items-center gap-1.5 shadow-sm`}>
                <Zap size={12} className="fill-current" />
                {currentTier.name}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {currentTier.tagline}
              </span>
            </div>

            {/* Expense summary tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 mb-4">
              <span>Logged:</span>
              <span className="font-bold text-white">
                {currency}{Number(expense.amount).toLocaleString()}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-300 font-medium">{expense.category}</span>
              {expense.description && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400 truncate max-w-[120px]">{expense.description}</span>
                </>
              )}
            </div>
          </div>

          {/* Dialogue Box */}
          <div className="relative bg-slate-950/90 rounded-2xl p-5 border border-amber-500/30 shadow-inner mb-6">
            {/* Subtle quotation watermark */}
            <div className="absolute top-2 left-3 text-amber-500/15 text-5xl font-serif font-black select-none pointer-events-none leading-none">
              “
            </div>

            {/* Tanglish Dialogue (Tamil written in English letters) */}
            <motion.p
              key={dialogue.tamilInEnglish}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg sm:text-xl font-black text-amber-300 text-center leading-snug tracking-wide font-sans drop-shadow-sm mb-2"
            >
              "{dialogue.tamilInEnglish}"
            </motion.p>

            {/* English Meaning Subtitle */}
            <motion.p
              key={dialogue.meaningInEnglish}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-xs sm:text-sm text-slate-300 text-center italic font-medium"
            >
              👉 {dialogue.meaningInEnglish}
            </motion.p>

            {/* Movie Reference & Vibe */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold text-yellow-400">
                <Flame size={13} className="text-orange-400" />
                {dialogue.movieReference}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                {dialogue.vibe}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleShuffleDialogue}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold transition active:scale-95"
            >
              <RefreshCw size={14} className="text-amber-400" />
              Innoru Punch Kudu Thalaiva! 🕶️
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition active:scale-95"
            >
              Magizhchi! (Done) 🤘
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
