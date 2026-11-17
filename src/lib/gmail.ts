import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";
import { Expense } from "../types";

// OAuth Scopes configured for Gmail integration
export const GMAIL_SCOPES = [
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.readonly",
];

// In-memory token cache (strictly in-memory, never in localStorage/sessionStorage)
let cachedGmailToken: string | null = null;

export const setGmailAccessToken = (token: string | null) => {
  cachedGmailToken = token;
};

export const getGmailAccessToken = (): string | null => {
  return cachedGmailToken;
};

// Initiate Google OAuth popup requesting Gmail permissions
export const connectGmailAccount = async (): Promise<{ token: string; email: string }> => {
  const provider = new GoogleAuthProvider();
  GMAIL_SCOPES.forEach((scope) => provider.addScope(scope));
  provider.setCustomParameters({
    prompt: "consent",
    access_type: "offline",
  });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);

  if (!credential?.accessToken) {
    throw new Error("Unable to obtain Google OAuth access token for Gmail.");
  }

  cachedGmailToken = credential.accessToken;
  const userEmail = result.user.email || "";

  return {
    token: credential.accessToken,
    email: userEmail,
  };
};

// Base64URL encoding compliant with RFC 4648
function base64UrlEncode(str: string): string {
  // UTF-8 safe base64
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface SendGmailOptions {
  accessToken?: string;
  to: string;
  subject: string;
  htmlBody: string;
}

// Send email via Gmail REST API directly from client, with server-side proxy fallback
export const sendGmailEmail = async ({
  accessToken,
  to,
  subject,
  htmlBody,
}: SendGmailOptions): Promise<{ id: string; threadId: string }> => {
  const token = accessToken || cachedGmailToken;
  if (!token) {
    throw new Error("No active Gmail access token. Please connect your Gmail account.");
  }

  if (!to || !to.includes("@")) {
    throw new Error("Please provide a valid recipient email address.");
  }

  // Construct RFC 2822 MIME message
  const rawEmail = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlBody,
  ].join("\r\n");

  const encodedMessage = base64UrlEncode(rawEmail);

  // 1. Try direct Google API
  try {
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (res.ok) {
      return await res.json();
    }

    // If unauthorized or permission denied, handle token expiry
    if (res.status === 401) {
      cachedGmailToken = null;
      throw new Error("Gmail session expired. Please re-authorize Google access.");
    }

    const errData = await res.json().catch(() => ({}));
    console.warn("Direct Gmail API call returned error, trying backend proxy:", errData);
  } catch (err: any) {
    console.warn("Direct fetch exception, falling back to server proxy:", err?.message);
  }

  // 2. Server proxy fallback
  const proxyRes = await fetch("/api/send-gmail-message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to,
      subject,
      htmlBody,
    }),
  });

  const proxyData = await proxyRes.json();
  if (!proxyRes.ok || !proxyData.success) {
    throw new Error(proxyData.error || "Failed to send email via Gmail.");
  }

  return proxyData.result;
};

// Deterministic fallback report builder in case AI service is experiencing rate-limits
export function buildFallbackReportHtml(params: {
  reportType: "weekly" | "monthly";
  periodLabel: string;
  userName: string;
  budget: number;
  currency: string;
  expenses: Expense[];
  thalaivarQuote?: string;
  aiInsights?: string[];
}): { subject: string; html: string } {
  const {
    reportType,
    periodLabel,
    userName,
    budget,
    currency,
    expenses,
    thalaivarQuote,
    aiInsights = [],
  } = params;

  const totalSpent = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const percentUsed = budget > 0 ? ((totalSpent / budget) * 100).toFixed(1) : "0";
  const remaining = budget - totalSpent;
  const isOverBudget = remaining < 0;

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (Number(e.amount) || 0);
  });
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const defaultQuote = isOverBudget
    ? "En vazhi thani vazhi... aana budget thaandi porathu romba thappana vazhi! (My way is unique, but going beyond budget is a dangerous path! Control your spending!)"
    : totalSpent > budget * 0.75
    ? "Kanna, kasu vishayathula aattatha kurai! (Little one, curb the speed in spending before the month ends!)"
    : "Basha oru thadava sonna nooru thadava sonna madhiri! Super savings maintain pandra, idhe steady-ah vechukko! (Great savings discipline maintained, keep it steady!)";

  const quote = thalaivarQuote || defaultQuote;

  const titlePrefix = reportType === "weekly" ? "Weekly Spending AI Intelligence" : "Monthly Financial Closure Report";
  const subject = `⚡ TMK Ledger: ${titlePrefix} [${periodLabel}] - ${currency}${totalSpent.toLocaleString()} Spent`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #07090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #07090e; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #0c1017; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 50%, #0284c7 100%); padding: 32px 28px; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.25); color: #a7f3d0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 999px; margin-bottom: 8px;">
                      ${reportType === "weekly" ? "📅 Weekly Digest" : "🏆 Monthly Review"}
                    </span>
                    <h1 style="margin: 6px 0 2px; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      TMK Ledger Spending Report
                    </h1>
                    <p style="margin: 0; font-size: 13px; color: #e2e8f0;">
                      Prepared for <strong>${userName || "Valued User"}</strong> · ${periodLabel}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Key Metrics Grid -->
          <tr>
            <td style="padding: 24px 28px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48%" style="background-color: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 16px; vertical-align: top;">
                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600;">Total Spending</div>
                    <div style="font-size: 24px; font-weight: 800; color: #34d399; margin: 4px 0;">${currency}${totalSpent.toLocaleString()}</div>
                    <div style="font-size: 11px; color: #64748b;">${expenses.length} logged transactions</div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background-color: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 16px; vertical-align: top;">
                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600;">Monthly Budget</div>
                    <div style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 4px 0;">${currency}${budget.toLocaleString()}</div>
                    <div style="font-size: 11px; color: ${isOverBudget ? '#f87171' : '#34d399'}; font-weight: 600;">
                      ${isOverBudget ? `Exceeded by ${currency}${Math.abs(remaining).toLocaleString()}` : `${currency}${remaining.toLocaleString()} left (${percentUsed}% used)`}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Superstar Rajinikanth Thalaivar Quote Card -->
          <tr>
            <td style="padding: 12px 28px;">
              <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(239, 68, 68, 0.08) 100%); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 14px; padding: 16px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="36" style="vertical-align: top; font-size: 24px;">🕶️</td>
                    <td style="vertical-align: top; padding-left: 8px;">
                      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #fbbf24; font-weight: 800;">
                        Superstar Thalaivar Punch Advice
                      </div>
                      <div style="font-size: 13px; font-style: italic; color: #fef3c7; margin-top: 4px; line-height: 1.45;">
                        "${quote}"
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Category Breakdown -->
          <tr>
            <td style="padding: 12px 28px;">
              <h3 style="margin: 0 0 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700;">
                Category Breakdown
              </h3>
              <table width="100%" cellpadding="8" cellspacing="0" style="background-color: #111827; border: 1px solid #1f2937; border-radius: 14px; font-size: 12px;">
                ${
                  sortedCategories.length > 0
                    ? sortedCategories
                        .slice(0, 6)
                        .map(
                          ([cat, amt]) => `
                  <tr style="border-bottom: 1px solid #1f2937;">
                    <td style="color: #f1f5f9; font-weight: 600;">${cat}</td>
                    <td align="right" style="color: #34d399; font-weight: 700; font-family: monospace;">${currency}${amt.toLocaleString()}</td>
                    <td align="right" width="60" style="color: #94a3b8; font-size: 11px;">
                      ${totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(0) : 0}%
                    </td>
                  </tr>`
                        )
                        .join("")
                    : `<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 20px;">No expenses recorded in this period.</td></tr>`
                }
              </table>
            </td>
          </tr>

          <!-- AI Actionable Recommendations -->
          ${
            aiInsights.length > 0
              ? `
          <tr>
            <td style="padding: 12px 28px;">
              <h3 style="margin: 0 0 10px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700;">
                Gemini AI Financial Insights
              </h3>
              <div style="background-color: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 14px 18px;">
                <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 12.5px; line-height: 1.6;">
                  ${aiInsights.map((tip) => `<li style="margin-bottom: 6px;">${tip}</li>`).join("")}
                </ul>
              </div>
            </td>
          </tr>`
              : ""
          }

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 28px 32px; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #64748b;">
                Generated automatically by TMK Expense Ledger & Gemini AI
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                You are receiving this automated report because Weekly/Monthly Gmail reports are enabled in your account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
