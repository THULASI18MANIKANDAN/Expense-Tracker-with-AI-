import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, User, Wallet, AlertCircle, ArrowRight, Chrome, ShieldCheck, Sparkles, TrendingUp, CheckCircle2 } from "lucide-react";

interface AuthScreenProps {
  onSuccess: () => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("15000");
  const [currency, setCurrency] = useState("₹");
  const [error, setError] = useState("");
  const [showGoogleFallbackCta, setShowGoogleFallbackCta] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowGoogleFallbackCta(false);
    setInfoMessage("");
    setLoading(true);

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        onSuccess();
      } else if (mode === "register") {
        if (!name.trim()) {
          throw new Error("Name is required");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: name.trim() });

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: name.trim(),
          email: email.trim(),
          monthlyBudget: Number(monthlyBudget) || 15000,
          currency,
          customCategories: [],
          gmailSettings: {
            connected: false,
            recipientEmail: email.trim(),
            weeklyReportsEnabled: true,
            monthlyReportsEnabled: true,
          },
          createdAt: new Date().toISOString()
        });

        onSuccess();
      } else if (mode === "forgot") {
        await sendPasswordResetEmail(auth, email.trim());
        setInfoMessage("Password reset instructions sent. Please check your inbox.");
        setMode("login");
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "An error occurred. Please try again.";
      if (err.code === "auth/operation-not-allowed") {
        msg =
          "Email/Password sign-in is not enabled yet in Firebase Console (Authentication → Sign-in method → Email/Password). Use 'Continue with Google' below to sign in or create your account instantly.";
        setShowGoogleFallbackCta(true);
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        msg = "Invalid email or password credentials. Please verify and retry.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "This email is already registered. Please log in instead.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password should be at least 6 characters long.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Please enter a valid email address.";
      } else if (err.code === "auth/too-many-requests") {
        msg = "Too many attempts. Please wait a moment and try again.";
      } else if (err.code === "auth/network-request-failed") {
        msg = "Network error. Please check your internet connection and retry.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setShowGoogleFallbackCta(false);
    setInfoMessage("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      // Add Gmail Workspace scopes
      provider.addScope("https://mail.google.com/");
      provider.addScope("https://www.googleapis.com/auth/gmail.send");
      provider.addScope("https://www.googleapis.com/auth/gmail.compose");
      provider.addScope("https://www.googleapis.com/auth/gmail.modify");
      provider.addScope("https://www.googleapis.com/auth/gmail.readonly");

      provider.setCustomParameters({
        prompt: "select_account"
      });
      
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      const credential = GoogleAuthProvider.credentialFromResult(userCredential);
      if (credential?.accessToken) {
        // Cache token in-memory
        const { setGmailAccessToken } = await import("../lib/gmail");
        setGmailAccessToken(credential.accessToken);
      }

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          name: user.displayName || "Google User",
          email: user.email || "",
          monthlyBudget: 15000,
          currency: "₹",
          customCategories: [],
          gmailSettings: {
            connected: true,
            recipientEmail: user.email || "",
            weeklyReportsEnabled: true,
            monthlyReportsEnabled: true,
          },
          createdAt: new Date().toISOString()
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "Google Authentication encountered an error.";
      if (err.code === "auth/popup-blocked") {
        msg = "The sign-in popup was blocked by your browser. Please allow popups for this site and try again.";
      } else if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        msg = "Google sign-in window was closed before completing authentication.";
      } else if (err.code === "auth/unauthorized-domain") {
        msg = "This domain is not authorized in Firebase Auth settings. Check Firebase Console → Authentication → Settings → Authorized domains.";
      } else if (err.code === "auth/operation-not-allowed") {
        msg = "Google Sign-In is not enabled on this applet's Firebase project yet.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#07090e] text-slate-100 p-4 sm:p-6 overflow-hidden">
      {/* Dynamic ambient lights */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: "32px 32px" }} 
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-slate-900/70 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-7 sm:p-9 shadow-2xl relative z-10"
        id="auth-card"
      >
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-400/10 border border-emerald-500/30 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
            <Wallet className="w-7 h-7" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
              TMK Ledger
            </h1>
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
              AI PRO
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {mode === "login" && "Access your personal financial ledger & intelligent burn rate analytics"}
            {mode === "register" && "Start tracking smart budgets with Gemini multi-turn insights"}
            {mode === "forgot" && "Enter your registered email to receive recovery instructions"}
          </p>
        </div>

        {/* Feedback alerts */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs space-y-2.5"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-relaxed">{error}</span>
              </div>
              {showGoogleFallbackCta && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-2 px-3 rounded-lg bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                >
                  <Chrome className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Continue with Google Instead</span>
                </button>
              )}
            </motion.div>
          )}

          {infoMessage && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span className="leading-relaxed">{infoMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary Recommended Google Sign In */}
        {mode !== "forgot" && (
          <div className="mb-5">
            <button
              id="google-signin-primary-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-4 rounded-xl text-sm transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-500/10"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Continue with Google</span>
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-1.5 font-mono">
              Instant sign-in · Syncs Cloud Ledger & Gmail AI Reports
            </p>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.08]" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-mono">
                <span className="bg-slate-900 px-3 text-slate-500">Or with Email</span>
              </div>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleAuth} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="auth-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="auth-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                {mode === "login" && (
                  <button
                    id="forgot-pwd-btn"
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-emerald-400/90 hover:text-emerald-300 transition cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                />
              </div>
            </div>
          )}

          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Monthly Target
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 font-mono text-sm">
                    {currency}
                  </span>
                  <input
                    id="auth-budget-input"
                    type="number"
                    min="0"
                    required
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    placeholder="15000"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2 pl-8 pr-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition font-mono tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Currency
                </label>
                <select
                  id="auth-currency-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition font-mono"
                >
                  <option value="₹">₹ INR (Rupees)</option>
                  <option value="$">$ USD (Dollars)</option>
                  <option value="€">€ EUR (Euros)</option>
                  <option value="£">£ GBP (Pounds)</option>
                  <option value="¥">¥ JPY (Yen)</option>
                  <option value="₩">₩ KRW (Won)</option>
                </select>
              </div>
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full mt-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Authenticating...
              </span>
            ) : (
              <>
                <span>
                  {mode === "login" && "Enter Dashboard"}
                  {mode === "register" && "Initialize Portfolio"}
                  {mode === "forgot" && "Send Password Reset Link"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Mode Switcher */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] text-center text-xs">
          {mode === "login" ? (
            <p className="text-slate-400">
              New to TMK Ledger?{" "}
              <button
                id="switch-register-btn"
                type="button"
                onClick={() => setMode("register")}
                className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer underline-offset-4 hover:underline transition"
              >
                Create Account
              </button>
            </p>
          ) : (
            <p className="text-slate-400">
              Already have an account?{" "}
              <button
                id="switch-login-btn"
                type="button"
                onClick={() => setMode("login")}
                className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer underline-offset-4 hover:underline transition"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
