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
import { motion } from "motion/react";
import { Mail, Lock, User, Wallet, DollarSign, AlertCircle, ArrowRight, Chrome } from "lucide-react";

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
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        onSuccess();
      } else if (mode === "register") {
        if (!name.trim()) {
          throw new Error("Name is required");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update auth profile name
        await updateProfile(user, { displayName: name });

        // Save custom user profile metadata to Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name,
          email,
          monthlyBudget: Number(monthlyBudget) || 15000,
          currency,
          customCategories: [],
          createdAt: new Date().toISOString()
        });

        onSuccess();
      } else if (mode === "forgot") {
        await sendPasswordResetEmail(auth, email);
        setInfoMessage("Password reset email sent! Please check your inbox.");
        setMode("login");
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "An error occurred. Please try again.";
      if (err.code === "auth/invalid-credential") {
        msg = "Invalid email or password. Please try again.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "This email is already registered.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password should be at least 6 characters.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account"
      });
      
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check if user document already exists in Firestore users collection
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        // Create custom user profile document for new Google sign-up
        await setDoc(userDocRef, {
          uid: user.uid,
          name: user.displayName || "Google User",
          email: user.email || "",
          monthlyBudget: 15000,
          currency: "₹",
          customCategories: [],
          createdAt: new Date().toISOString()
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "An error occurred with Google Sign-In.";
      if (err.code === "auth/popup-blocked") {
        msg = "The sign-in popup was blocked by your browser. Please allow popups and try again.";
      } else if (err.code === "auth/operation-not-allowed") {
        msg = "Google Sign-In is not enabled on this applet's Firebase project yet.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.08),transparent_50%)]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 shadow-2xl relative z-10"
        id="auth-card"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 mb-4">
            <Wallet className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            TMK Expense Tracker
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {mode === "login" && "Sign in to manage your budget & expenses"}
            {mode === "register" && "Create an account to start smart tracking"}
            {mode === "forgot" && "Reset your secure account password"}
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {infoMessage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Your Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <User className="w-4.5 h-4.5" />
                </span>
                <input
                  id="auth-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Mail className="w-4.5 h-4.5" />
              </span>
              <input
                id="auth-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-400">Password</label>
                {mode === "login" && (
                  <button
                    id="forgot-pwd-btn"
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline transition"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>
          )}

          {mode === "register" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Monthly Budget</label>
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
                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-2.5 pl-8 pr-4 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Currency</label>
                <select
                  id="auth-currency-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-all"
                >
                  <option value="₹">INR (₹)</option>
                  <option value="$">USD ($)</option>
                  <option value="€">EUR (€)</option>
                  <option value="£">GBP (£)</option>
                  <option value="¥">JPY (¥)</option>
                  <option value="₩">KRW (₩)</option>
                </select>
              </div>
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            {loading ? "Processing..." : (
              <>
                {mode === "login" && "Sign In"}
                {mode === "register" && "Create Account"}
                {mode === "forgot" && "Send Reset Link"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        {mode !== "forgot" && (
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/50"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-slate-800/90 px-3 text-slate-400 font-semibold">Or continue with</span>
            </div>
          </div>
        )}

        {/* Google Sign-In Button */}
        {mode !== "forgot" && (
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-slate-900/80 hover:bg-slate-900 border border-slate-700/60 hover:border-slate-500 text-slate-200 font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50 shadow-md"
          >
            <Chrome className="w-4.5 h-4.5 text-emerald-400" />
            <span>Google Account</span>
          </button>
        )}

        {/* Mode Toggles */}
        <div className="mt-6 pt-6 border-t border-slate-700/40 text-center text-sm">
          {mode === "login" ? (
            <p className="text-slate-400">
              Don't have an account?{" "}
              <button
                id="switch-register-btn"
                onClick={() => setMode("register")}
                className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline focus:outline-none transition"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p className="text-slate-400">
              Already have an account?{" "}
              <button
                id="switch-login-btn"
                onClick={() => setMode("login")}
                className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline focus:outline-none transition"
              >
                Log In
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
