import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Initialize Gemini API client safely with custom User-Agent for telemetry
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return ai;
}

// Chatbot roles & system instruction generator
function buildSystemInstruction(
  role: string,
  customInstruction?: string,
  ctx?: {
    budget?: number;
    currency?: string;
    expenses?: any[];
    profileName?: string;
  }
): string {
  const currency = ctx?.currency || "₹";
  const budget = ctx?.budget ? `${currency}${ctx.budget.toLocaleString()}` : "Not configured";
  const expenses = ctx?.expenses || [];
  
  // Calculate spending totals and breakdown
  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (Number(e.amount) || 0);
  });
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, amt]) => `- ${cat}: ${currency}${amt.toLocaleString()} (${totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) : 0}%)`)
    .join("\n") || "No expense breakdown available.";

  const recentTransactions = expenses.slice(-15).reverse().map((e) => {
    return `- ${e.date || "N/A"} | ${e.category || "General"} | ${currency}${Number(e.amount || 0).toLocaleString()} | ${e.description || "No note"} | [${e.paymentMode || "Cash"}]`;
  }).join("\n") || "No recent transactions logged.";

  let rolePersona = "";
  switch (role) {
    case "auditor":
      rolePersona = `You are a Strict Frugal Auditor & Financial Inspector for ${ctx?.profileName || "the user"}.
Your tone is direct, sharp, pragmatic, and fiercely anti-waste. You scrutinize every single unnecessary expense, call out impulse buys, high dining/takeout costs, and recurring subscription traps. You calculate how small leaks compound over a year and challenge the user to cut at least 15-25% of wasteful spending immediately.`;
      break;

    case "strategist":
      rolePersona = `You are a Wealth & Investment Strategist for ${ctx?.profileName || "the user"}.
Your focus is long-term net worth growth, emergency fund fortress building (aiming for 3 to 6 months of baseline living costs), debt avalanche/snowball optimization, and systematic investing principles (Dollar-Cost Averaging, index funds). You turn today's savings into tomorrow's compounding freedom.`;
      break;

    case "speedy":
      rolePersona = `You are a Speedy Expense Categorizer & Rapid Financial Assistant.
Your goal is ultra-fast, high-density, concise clarity. Avoid lengthy pleasantries. Deliver straight bullet points, exact math, quick category counts, and direct action items immediately.`;
      break;

    case "complex_simulator":
      rolePersona = `You are an Advanced Financial Modeler & Deep Scenario Simulator.
You specialize in deep mathematical reasoning, stress-testing budgets against unexpected expenses or inflation shocks, calculating exact amortization tradeoffs, and running multi-month financial simulations with clear tabular projections.`;
      break;

    case "custom":
      rolePersona = customInstruction && customInstruction.trim().length > 0
        ? `Custom User Role Instructions:\n${customInstruction}`
        : `You are an expert AI Personal Finance Advisor tailored specifically to the user's personal financial goals.`;
      break;

    case "advisor":
    default:
      rolePersona = `You are an expert AI Personal Finance Advisor & Budget Coach for TMK Expense Tracker.
You are encouraging, knowledgeable, structured, and insightful. You explain personal finance principles (like the 50/30/20 budget framework), celebrate disciplined spending, and guide the user with actionable next steps.`;
      break;
  }

  return `${rolePersona}

FINANCIAL DATA CONTEXT:
- User Name: ${ctx?.profileName || "App User"}
- Currency: ${currency}
- Monthly Budget Limit: ${budget}
- Total Logged Expenses To Date: ${currency}${totalSpent.toLocaleString()}
- Total Transactions Recorded: ${expenses.length}

TOP SPENDING CATEGORIES:
${topCategories}

RECENT TRANSACTIONS LOGGED:
${recentTransactions}

GUIDELINES FOR YOUR RESPONSES:
1. Always use the specified currency symbol (${currency}) when referencing any money amounts.
2. Structure your answers cleanly using Markdown (bold key numbers, use concise bullet points, and headers).
3. If the user asks about their specific expenses, refer directly to their real financial context provided above.
4. If they have no expenses logged yet, give helpful guidance on best budgeting practices and invite them to add expenses or set a budget.
5. Maintain your designated role persona consistently while remaining helpful and professional.`;
}

// Model resolver supporting gemini-3.8-flash (general), gemini-3.1-flash-lite (fast), gemini-4-argon (complex)
function resolveModel(requestedModel?: string, taskComplexity?: string): string {
  if (requestedModel) {
    let clean = requestedModel.trim();
    if (clean.startsWith("models/")) {
      clean = clean.replace("models/", "");
    }
    if (["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-4-argon"].includes(clean)) {
      return clean;
    }
  }
  if (taskComplexity === "complex") return "gemini-4-argon";
  if (taskComplexity === "fast") return "gemini-3.1-flash-lite";
  return "gemini-3.8-flash";
}

// Multi-turn Gemini Chat Endpoint
app.post(["/api/chat", "/api/ai-chat", "/api/ai-insight"], async (req, res) => {
  try {
    const { 
      message, 
      query, 
      messages, 
      history, 
      role = "advisor", 
      customInstruction, 
      model, 
      taskComplexity,
      expenses = [], 
      budget, 
      currency = "₹", 
      profileName,
      recentInsightsOnly 
    } = req.body;

    const client = getGeminiClient();
    const selectedModel = resolveModel(model, taskComplexity);

    // Build role-specific system instruction with real financial context
    const systemInstruction = buildSystemInstruction(role, customInstruction, {
      budget,
      currency,
      expenses,
      profileName
    });

    // Determine current user prompt
    let userPrompt = (message || query || "").trim();
    if (recentInsightsOnly) {
      userPrompt = "Generate a short, elegant 3-bullet financial summary or alert based on my spending and budget. Keep it under 100 words. Be direct, proactive, and friendly.";
    } else if (!userPrompt && (!messages || messages.length === 0) && (!history || history.length === 0)) {
      userPrompt = "Provide an overall assessment of my current spending and suggest high-impact saving actions.";
    }

    // Build the contents array for multi-turn chat using conversation history
    const contents: any[] = [];
    const rawHistory = Array.isArray(messages) ? messages : (Array.isArray(history) ? history : []);

    rawHistory.forEach((msg: any) => {
      // Support various format shapes: { role, text }, { sender, text }, { parts: [{ text }] }
      const text = msg.text || (Array.isArray(msg.parts) ? msg.parts.map((p: any) => p.text).join(" ") : "");
      if (!text || text.trim().length === 0) return;

      // Skip introductory welcome messages to prevent prompt contamination
      if (msg.id === "welcome" || text.includes("TMK AI Financial Assistant") || text.includes("I am your TMK")) {
        return;
      }

      const roleType = (msg.role === "user" || msg.sender === "user") ? "user" : "model";
      contents.push({
        role: roleType,
        parts: [{ text }]
      });
    });

    // If latest userPrompt is provided and not already the last message in history, append it
    if (userPrompt) {
      const lastMsg = contents[contents.length - 1];
      if (!lastMsg || lastMsg.role !== "user" || lastMsg.parts?.[0]?.text !== userPrompt) {
        contents.push({
          role: "user",
          parts: [{ text: userPrompt }]
        });
      }
    }

    // Ensure at least one user content part exists
    if (contents.length === 0) {
      contents.push({
        role: "user",
        parts: [{ text: "Hello! Give me a quick summary of my current finances." }]
      });
    }

    // Call Gemini API with selected model and system instruction
    const response = await client.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction,
      }
    });

    const answer = response.text || "No response generated by Gemini.";
    res.json({ 
      success: true, 
      answer, 
      model: selectedModel, 
      role 
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const rawMsg = error.message || String(error);
    let userFriendly = rawMsg;
    if (rawMsg.includes("PERMISSION_DENIED") || rawMsg.includes("API_KEY_INVALID") || rawMsg.includes("403")) {
      userFriendly = "API key issue detected. Please check your Gemini API key in Settings > Secrets.";
    } else if (rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("429")) {
      userFriendly = "Gemini API quota exceeded. If using advanced models, ensure a billing-enabled key is configured.";
    }
    res.status(500).json({ 
      success: false, 
      error: userFriendly,
      raw: rawMsg 
    });
  }
});

// In-memory cache for spending projections
const projectionCache = new Map<string, { timestamp: number; data: any }>();

// Dedicated Spending Projection Endpoint powered by Gemini Flash + Algorithmic Fallback
app.post("/api/spending-projection", async (req, res) => {
  try {
    const {
      currentMonth = new Date().toISOString().slice(0, 7),
      daysElapsed = 15,
      daysRemaining = 15,
      totalDaysInMonth = 30,
      currentMonthSpent = 0,
      monthlyBudget = 0,
      currency = "₹",
      dailyAverageCurrent = 0,
      categoryBreakdown = [],
      historicalMonths = [],
      recentTransactions = [],
      scenarioAdjustment = 0 // % adjustment (-15 for frugal, 0 for baseline, +20 for aggressive)
    } = req.body;

    // Baseline algorithmic fallback computation
    const safeDaysElapsed = Math.max(1, Number(daysElapsed) || 1);
    const safeDaysRemaining = Math.max(0, Number(daysRemaining) || 0);
    const safeTotalDays = Math.max(28, Number(totalDaysInMonth) || 30);
    const safeCurrentSpent = Math.max(0, Number(currentMonthSpent) || 0);
    const safeBudget = Math.max(0, Number(monthlyBudget) || 0);

    // Calculate historical monthly average
    const validHistories = Array.isArray(historicalMonths) ? historicalMonths.filter((h: any) => (Number(h.totalSpent) || 0) > 0) : [];
    const histAvgTotal = validHistories.length > 0 
      ? validHistories.reduce((acc: number, h: any) => acc + Number(h.totalSpent), 0) / validHistories.length
      : safeBudget > 0 ? safeBudget : safeCurrentSpent * 1.5;
    const histDailyPace = histAvgTotal / safeTotalDays;

    // Blended forward daily burn: 70% current velocity, 30% historical pace, modified by scenario multiplier
    const scenarioMultiplier = 1 + (Number(scenarioAdjustment) || 0) / 100;
    const currentVelocity = safeDaysElapsed > 0 ? (safeCurrentSpent / safeDaysElapsed) : histDailyPace;
    const blendedBurn = ((currentVelocity * 0.7) + (histDailyPace * 0.3)) * scenarioMultiplier;
    
    const fallbackProjectedMonthEnd = Math.round(safeCurrentSpent + (blendedBurn * safeDaysRemaining));
    const fallbackVariance = safeBudget > 0 ? fallbackProjectedMonthEnd - safeBudget : 0;
    const fallbackRunwayStatus = safeBudget > 0 
      ? (fallbackProjectedMonthEnd > safeBudget * 1.05 ? "critical" : (fallbackProjectedMonthEnd > safeBudget * 0.95 ? "warning" : "on_track"))
      : "on_track";
    const fallbackSafeDaily = safeBudget > 0 && safeDaysRemaining > 0 
      ? Math.max(0, Math.round((safeBudget - safeCurrentSpent) / safeDaysRemaining))
      : Math.round(blendedBurn);

    // Build algorithmic fallback response object
    const algorithmicProjection = {
      projectedMonthEndSpend: fallbackProjectedMonthEnd,
      projectedVariance: fallbackVariance,
      runwayStatus: fallbackRunwayStatus,
      statusHeadline: fallbackVariance > 0 
        ? `Trajectory projects spending ${currency}${Math.abs(fallbackVariance).toLocaleString()} over monthly budget at current pace.`
        : `Safe trajectory: On track to finish ${currency}${Math.abs(fallbackVariance).toLocaleString()} under budget ceiling.`,
      confidenceScore: validHistories.length > 0 ? 88 : 75,
      recommendedSafeDailySpend: fallbackSafeDaily,
      predictedNextMonthTotal: Math.round(fallbackProjectedMonthEnd * 1.02),
      categoryRisks: (categoryBreakdown || []).slice(0, 5).map((cat: any) => {
        const spent = Number(cat.spent) || 0;
        const projected = Math.round(spent + ((spent / safeDaysElapsed) * safeDaysRemaining * scenarioMultiplier));
        const riskLevel = safeBudget > 0 && projected > (safeBudget * 0.35) ? "high" : (projected > (safeBudget * 0.2) ? "medium" : "low");
        return {
          category: cat.category,
          currentSpent: spent,
          projectedMonthEnd: projected,
          riskLevel,
          reasoning: `Pacing at ${currency}${Math.round(spent / safeDaysElapsed)}/day; estimated ${currency}${projected.toLocaleString()} by month-end.`
        };
      }),
      projectedTrajectoryPoints: [
        { label: `Day 1`, day: 1, projectedCumulative: Math.round(safeCurrentSpent * (1 / safeDaysElapsed)), idealBudgetLine: Math.round((safeBudget / safeTotalDays) * 1) },
        { label: `Day ${Math.round(safeDaysElapsed / 2)}`, day: Math.round(safeDaysElapsed / 2), projectedCumulative: Math.round(safeCurrentSpent * 0.5), idealBudgetLine: Math.round((safeBudget / safeTotalDays) * (safeDaysElapsed / 2)) },
        { label: `Day ${safeDaysElapsed} (Now)`, day: safeDaysElapsed, projectedCumulative: Math.round(safeCurrentSpent), idealBudgetLine: Math.round((safeBudget / safeTotalDays) * safeDaysElapsed) },
        { label: `Day ${Math.min(safeTotalDays, safeDaysElapsed + Math.round(safeDaysRemaining * 0.5))}`, day: Math.min(safeTotalDays, safeDaysElapsed + Math.round(safeDaysRemaining * 0.5)), projectedCumulative: Math.round(safeCurrentSpent + (blendedBurn * (safeDaysRemaining * 0.5))), idealBudgetLine: Math.round((safeBudget / safeTotalDays) * (safeDaysElapsed + (safeDaysRemaining * 0.5))) },
        { label: `Day ${safeTotalDays} (End)`, day: safeTotalDays, projectedCumulative: fallbackProjectedMonthEnd, idealBudgetLine: safeBudget }
      ],
      keyDrivers: [
        `Daily burn rate is currently averaging ${currency}${Math.round(currentVelocity)}/day through day ${safeDaysElapsed}.`,
        validHistories.length > 0 ? `Historical baseline across past months averaged ${currency}${Math.round(histAvgTotal)}/month.` : `Limited past month history; projection anchored primarily to current month trajectory.`,
        categoryBreakdown?.[0] ? `${categoryBreakdown[0].category} represents the largest capital commitment (${categoryBreakdown[0].percentage || 0}%).` : "Spending spread across various daily life categories."
      ],
      actionableRecommendations: [
        fallbackSafeDaily > 0 
          ? `Cap daily discretionary outlays to ${currency}${fallbackSafeDaily} for the remaining ${safeDaysRemaining} days to protect budget reserves.`
          : `Cease non-essential outlays immediately as current spend has already reached target boundaries.`,
        `Audit recurring subscriptions and peak dining transactions to reclaim 10-15% of projected outflow.`,
        `Review high-velocity categories in the final 7 days of the month to eliminate impulsive leakages.`
      ]
    };

    // In-memory cache key
    const cacheKey = `${currentMonth}_${safeCurrentSpent}_${safeBudget}_${scenarioAdjustment}_${safeDaysElapsed}`;
    const cached = projectionCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 120000)) { // 2 min cache
      return res.json({
        ...cached.data,
        cached: true
      });
    }

    // Try Gemini model with fallback strategy (gemini-3.8-flash -> gemini-3.1-flash-lite -> algorithmic)
    const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
    let aiSuccessData: any = null;
    let selectedModel = "algorithmic-fallback";

    for (const modelCandidate of modelsToTry) {
      try {
        const client = getGeminiClient();
        const prompt = `You are an elite Quantitative Personal Finance Forecaster and Predictive Data Analyst for a high-performance expense tracker.
Analyze the following financial metrics, spending velocity, category distributions, and historical records to generate high-precision future spending trend projections:

CURRENT METRICS:
- Target Month: ${currentMonth}
- Currency: ${currency}
- Monthly Budget Ceiling: ${currency}${safeBudget.toLocaleString()}
- Total Spent So Far: ${currency}${safeCurrentSpent.toLocaleString()}
- Days Elapsed in Month: ${safeDaysElapsed} of ${safeTotalDays} days (${Math.round((safeDaysElapsed / safeTotalDays) * 100)}% of month completed)
- Days Remaining: ${safeDaysRemaining} days
- Current Daily Spending Pace: ${currency}${Math.round(currentVelocity)}/day
- Scenario Adjustment: ${scenarioAdjustment}% (${scenarioAdjustment < 0 ? "Frugal/Constrained" : scenarioAdjustment > 0 ? "Accelerated/High-Burn" : "Baseline Trajectory"})

CATEGORY BREAKDOWN TO DATE:
${(categoryBreakdown || []).map((c: any) => `- ${c.category}: ${currency}${Number(c.spent).toLocaleString()} (${c.percentage || 0}%)`).join("\n") || "No category breakdown"}

HISTORICAL MONTHS PERFORMANCE:
${validHistories.map((h: any) => `- Month ${h.month}: Total Spent ${currency}${Number(h.totalSpent).toLocaleString()} across ${h.count || 0} transactions`).join("\n") || "No previous month data logged yet"}

RECENT SAMPLE TRANSACTIONS:
${(recentTransactions || []).slice(0, 10).map((t: any) => `- ${t.date} | ${t.category} | ${currency}${t.amount} | ${t.description || ""}`).join("\n") || "None"}

INSTRUCTIONS:
Calculate realistic, rigorous projected spending totals. 
Account for days remaining, weekend/end-of-month velocity surges, category weights, and historical precedents.
Return ONLY valid JSON matching this exact structure without markdown backticks:
{
  "projectedMonthEndSpend": number (predicted total expense by end of month),
  "projectedVariance": number (projectedMonthEndSpend minus monthlyBudget; negative is savings/under budget, positive is overrun),
  "runwayStatus": "on_track" | "warning" | "critical" | "surplus",
  "statusHeadline": "string (punchy, 1-sentence forecast summary)",
  "confidenceScore": number (integer between 70 and 96),
  "recommendedSafeDailySpend": number (max recommended daily spend for remaining days to avoid exceeding budget),
  "predictedNextMonthTotal": number (forecast for the upcoming next month based on seasonal velocity),
  "categoryRisks": [
    {
      "category": "string",
      "currentSpent": number,
      "projectedMonthEnd": number,
      "riskLevel": "low" | "medium" | "high",
      "reasoning": "string (concise 1-sentence explanation)"
    }
  ],
  "projectedTrajectoryPoints": [
    { "label": "string", "day": number, "projectedCumulative": number, "idealBudgetLine": number }
  ],
  "keyDrivers": [
    "string (insight 1)",
    "string (insight 2)",
    "string (insight 3)"
  ],
  "actionableRecommendations": [
    "string (actionable recommendation 1)",
    "string (actionable recommendation 2)",
    "string (actionable recommendation 3)"
  ]
}`;

        const aiResponse = await client.models.generateContent({
          model: modelCandidate,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json"
          }
        });

        const responseText = aiResponse.text?.trim() || "";
        if (responseText) {
          const cleanedJson = responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
          const parsed = JSON.parse(cleanedJson);
          aiSuccessData = {
            ...algorithmicProjection,
            ...parsed,
            projectedMonthEndSpend: Number(parsed.projectedMonthEndSpend) || fallbackProjectedMonthEnd,
            projectedVariance: Number(parsed.projectedVariance) || fallbackVariance,
            recommendedSafeDailySpend: Number(parsed.recommendedSafeDailySpend) || fallbackSafeDaily,
            confidenceScore: Math.min(99, Math.max(50, Number(parsed.confidenceScore) || 88)),
            runwayStatus: ["on_track", "warning", "critical", "surplus"].includes(parsed.runwayStatus) ? parsed.runwayStatus : fallbackRunwayStatus
          };
          selectedModel = modelCandidate;
          break; // Successfully obtained projection
        }
      } catch (err: any) {
        // If 429 or 503, continue to next candidate silently without dumping noisy stack traces
        continue;
      }
    }

    const resultPayload = {
      success: true,
      projection: aiSuccessData || algorithmicProjection,
      source: selectedModel,
      timestamp: new Date().toISOString()
    };

    // Store in cache
    projectionCache.set(cacheKey, { timestamp: Date.now(), data: resultPayload });

    // Prune cache if large
    if (projectionCache.size > 50) {
      const oldestKey = projectionCache.keys().next().value;
      if (oldestKey) projectionCache.delete(oldestKey);
    }

    return res.json(resultPayload);

  } catch (err: any) {
    console.error("Spending projection endpoint fatal error:", err);
    res.status(500).json({
      success: false,
      error: "Unable to calculate spending projections at this time."
    });
  }
});

// Dedicated Document OCR & Receipt Scanner Endpoint powered by Gemini Multimodal API
app.post(["/api/ocr-bill", "/api/scan-receipt"], async (req, res) => {
  try {
    const { image, mimeType = "image/jpeg", customCategories = [] } = req.body;
    if (!image || typeof image !== "string") {
      return res.status(400).json({
        success: false,
        error: "No bill or receipt image provided. Please upload or snap a photo of your receipt."
      });
    }

    // Strip data URI header if present
    const cleanBase64 = image.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "").trim();
    if (!cleanBase64) {
      return res.status(400).json({
        success: false,
        error: "Invalid image encoding."
      });
    }

    const availableCategories = Array.from(new Set([
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
      "Miscellaneous",
      ...(Array.isArray(customCategories) ? customCategories : [])
    ]));

    const prompt = `You are an elite Optical Character Recognition (OCR) and Financial Document Extraction Engine for an expense tracker.
Inspect this bill, tax invoice, supermarket slip, utility bill, restaurant check, or electronic receipt image thoroughly.

EXTRACT THE FOLLOWING DATA PRECISELY:
1. "merchantName": The official store, restaurant, vendor, company, or utility provider name (e.g., "Saravana Bhavan", "Shell Petrol Bunk", "D-Mart Supermarket", "BESCOM Electricity").
2. "totalAmount": The final net/gross total payable amount as a positive number (remove all currency symbols, commas, or spaces). Example: 850.50.
3. "date": The transaction date in "YYYY-MM-DD" format. Convert DD/MM/YYYY or text dates to ISO format. If missing or obscured, use today's date "${new Date().toISOString().slice(0, 10)}".
4. "category": Pick the most accurate category from: ${JSON.stringify(availableCategories)}.
5. "paymentMode": Identify the payment instrument: "UPI", "Credit Card", "Debit Card", "Cash", or "Net Banking". If GPay/PhonePe/Paytm/QR is mentioned, choose "UPI". Default to "Cash" if unspecified.
6. "description": A concise, natural 3-6 word summary (e.g. "Dinner at Saravana Bhavan", "Weekly groceries at D-Mart", "Fuel refill at Shell").
7. "items": Line-item breakdown if visible: [{ "name": string, "qty": number, "price": number }]. If not itemized, return an empty array [].
8. "taxAmount": Total tax/GST/VAT as a number, or 0.
9. "receiptNumber": Invoice, Bill, or Token reference string if visible, or null.
10. "confidence": Extraction confidence percentage integer (70-98).
11. "notes": Any additional detected notes (e.g., discount saved, cashier name, address, or payment ref).

Output strictly valid JSON with no markdown backticks and no conversational filler:
{
  "merchantName": "string",
  "totalAmount": number,
  "date": "YYYY-MM-DD",
  "category": "string",
  "paymentMode": "string",
  "description": "string",
  "items": [{ "name": "string", "qty": number, "price": number }],
  "taxAmount": number,
  "receiptNumber": "string" | null,
  "confidence": number,
  "notes": "string"
}`;

    const client = getGeminiClient();
    const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
    let parsedData: any = null;
    let selectedModel = "gemini-3.8-flash";

    for (const modelCandidate of modelsToTry) {
      try {
        const imagePart = {
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: cleanBase64
          }
        };

        const response = await client.models.generateContent({
          model: modelCandidate,
          contents: { parts: [imagePart, { text: prompt }] },
          config: {
            responseMimeType: "application/json"
          }
        });

        const textOutput = response.text?.trim() || "";
        if (textOutput) {
          const cleaned = textOutput.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
          parsedData = JSON.parse(cleaned);
          selectedModel = modelCandidate;
          break;
        }
      } catch (err: any) {
        console.warn(`OCR attempt with ${modelCandidate} failed:`, err?.message || err);
        continue;
      }
    }

    if (!parsedData) {
      return res.status(502).json({
        success: false,
        error: "Unable to extract clear text from this image. Please ensure the receipt is well-lit and legible."
      });
    }

    return res.json({
      success: true,
      data: {
        merchantName: String(parsedData.merchantName || "Receipt Expense").trim(),
        totalAmount: Math.max(0, parseFloat(parsedData.totalAmount) || 0),
        date: parsedData.date || new Date().toISOString().slice(0, 10),
        category: availableCategories.includes(parsedData.category) ? parsedData.category : "Miscellaneous",
        paymentMode: ["UPI", "Credit Card", "Debit Card", "Cash", "Net Banking"].includes(parsedData.paymentMode) ? parsedData.paymentMode : "Cash",
        description: String(parsedData.description || parsedData.merchantName || "Scanned Receipt").trim(),
        items: Array.isArray(parsedData.items) ? parsedData.items : [],
        taxAmount: Number(parsedData.taxAmount) || 0,
        receiptNumber: parsedData.receiptNumber || null,
        confidence: Math.min(99, Math.max(50, Number(parsedData.confidence) || 85)),
        notes: String(parsedData.notes || "").trim()
      },
      modelUsed: selectedModel,
      scannedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Receipt OCR Fatal Error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to process receipt image."
    });
  }
});

// Proxy to send email via Gmail REST API
app.post("/api/send-gmail-message", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.body.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Missing Gmail OAuth bearer token in Authorization header."
      });
    }

    const { to, subject, htmlBody } = req.body;
    if (!to || !to.includes("@")) {
      return res.status(400).json({
        success: false,
        error: "Recipient email is required and must be valid."
      });
    }

    if (!subject || !htmlBody) {
      return res.status(400).json({
        success: false,
        error: "Email subject and htmlBody are required."
      });
    }

    // Construct RFC 2822 email
    const rawEmail = [
      `To: ${to}`,
      `Subject: =?utf-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      htmlBody
    ].join("\r\n");

    const base64UrlMessage = Buffer.from(rawEmail, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw: base64UrlMessage })
    });

    const gmailData = await gmailRes.json();

    if (!gmailRes.ok) {
      console.error("Gmail API send error:", gmailData);
      return res.status(gmailRes.status).json({
        success: false,
        error: gmailData?.error?.message || "Failed to send email through Gmail API."
      });
    }

    return res.json({
      success: true,
      result: gmailData
    });
  } catch (err: any) {
    console.error("Send Gmail Error:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Internal server error while sending email via Gmail."
    });
  }
});

// Generate AI Spending Report for Weekly and Monthly Cadence
app.post("/api/generate-ai-spending-report", async (req, res) => {
  try {
    const {
      reportType = "weekly",
      periodLabel = "Recent Period",
      userName = "User",
      budget = 15000,
      currency = "₹",
      expenses = []
    } = req.body;

    const totalSpent = (expenses as any[]).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((e: any) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (Number(e.amount) || 0);
    });

    const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const topCatStr = sortedCats.slice(0, 5).map(([c, a]) => `${c}: ${currency}${a}`).join(", ") || "None";
    const percentUsed = budget > 0 ? ((totalSpent / budget) * 100).toFixed(1) : "0";
    const isOver = totalSpent > budget;

    const client = getGeminiClient();
    let selectedModel = "gemini-3.8-flash";
    let aiContent = "";

    const prompt = `You are the AI Financial Intelligence Engine for TMK Ledger, an elite expense tracker app with Superstar Rajinikanth personality flair.
Generate a comprehensive, highly engaging ${reportType.toUpperCase()} SPENDING REPORT.

User Profile:
- Name: ${userName}
- Cadence: ${reportType} (${periodLabel})
- Budget: ${currency}${budget}
- Total Spent in Period: ${currency}${totalSpent} (${percentUsed}% of budget)
- Budget Status: ${isOver ? "OVER BUDGET" : totalSpent > budget * 0.8 ? "HIGH BURN / WARNING" : "SAFE / HEALTHY"}
- Category Breakdown: ${topCatStr}
- Total Transactions: ${expenses.length}

REQUIREMENTS:
1. "thalaivarDialogue": Write a hilarious, inspiring Superstar Rajinikanth punch dialogue written in TAMIL USING ENGLISH LETTERS (Tanglish).
   - If over budget: roast them affectionately with a famous punch style (e.g. "En vazhi thani vazhi... aana budget thaandi porathu romba thappana vazhi! Kasu karaiyuthu paaru!").
   - If moderate burn: warn them with style (e.g. "Kanna, panam sambathikirathu perisu illa, atha safe-ah vechukurathu thaan gethu!").
   - If great savings: praise them (e.g. "Singam single-ah vanthalum budget-ah correct-ah maintain pannum! Super discipline!").
   Provide an English translation in brackets.
2. "executiveSummary": 2-3 punchy, insightful sentences analyzing their spending momentum and runway.
3. "budgetHealth": "healthy" | "warning" | "critical"
4. "actionableTips": Exactly 3 smart, practical tips tailored to their top spending categories.
5. "subject": An exciting email subject line including emoji, report type, period, and amount spent.

Output strictly valid JSON (no markdown backticks):
{
  "subject": "string",
  "thalaivarDialogue": "string",
  "executiveSummary": "string",
  "budgetHealth": "healthy" | "warning" | "critical",
  "actionableTips": ["string", "string", "string"]
}`;

    try {
      const response = await client.models.generateContent({
        model: selectedModel,
        contents: prompt,
      });
      aiContent = response.text || "";
    } catch (modelErr: any) {
      console.warn("Gemini 3.8 Flash high demand for report, falling back to Gemini 3.1 Flash Lite:", modelErr?.message);
      selectedModel = "gemini-3.1-flash-lite";
      const fallbackResponse = await client.models.generateContent({
        model: selectedModel,
        contents: prompt,
      });
      aiContent = fallbackResponse.text || "";
    }

    let parsedResult: any = null;
    try {
      const cleaned = aiContent.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleaned);
    } catch {
      parsedResult = {
        subject: `⚡ TMK Ledger: ${reportType === "weekly" ? "Weekly" : "Monthly"} AI Spending Report [${periodLabel}] - ${currency}${totalSpent.toLocaleString()} Spent`,
        thalaivarDialogue: isOver
          ? "Kanna, panam varum pothu aada koodathu, selavu pannum pothu ooda koodathu! (Money comes and goes, but reckless spending will leave you running!)"
          : "Basha sonna mudinjathu! Budget discipline maintain pannu! (Stay firm on your budget goals!)",
        executiveSummary: `You have spent ${currency}${totalSpent.toLocaleString()} across ${expenses.length} transactions, representing ${percentUsed}% of your configured ceiling.`,
        budgetHealth: isOver ? "critical" : totalSpent > budget * 0.8 ? "warning" : "healthy",
        actionableTips: [
          `Review your top spending category (${sortedCats[0]?.[0] || "primary expense"}) to cap non-essential costs.`,
          `Keep your remaining allocation within ${currency}${Math.max(0, budget - totalSpent).toLocaleString()} for safety.`,
          `Log all daily expenses immediately with receipt OCR to prevent leakage.`
        ]
      };
    }

    return res.json({
      success: true,
      reportType,
      periodLabel,
      modelUsed: selectedModel,
      data: parsedResult
    });
  } catch (err: any) {
    console.error("AI Report Generation Error:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to generate AI spending report."
    });
  }
});

// Vite Dev vs Production Handling
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Running in DEVELOPMENT mode with Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in PRODUCTION mode. Serving static assets from dist/...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

setupVite();
