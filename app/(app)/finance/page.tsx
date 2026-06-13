"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Sparkles } from "lucide-react";
import Card, { CardTitle } from "@/components/ui/Card";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecurringFee {
  id: string;
  name: string;
  amount: number;
  category: string;
  active: boolean;
}

interface SkippedPurchase {
  id: string;
  item_name: string;
  amount: number;
  reward_message: string | null;
  skipped_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_REWARDS = [
  "☆ savings stat +1 !! you are literally glowing ☆",
  "✦ discipline is so glamorous on you ✦",
  "★ future rich girl behavior ACTIVATED ★",
  "♡ your bank account just did a lil happy dance ♡",
  "✧ thats a whole coffee saved for future you ✧",
  "~ manifesting your bag while dodging splurges ~",
  "* ACHIEVEMENT UNLOCKED: smart money era *",
  "¤ your financial glow-up is real and valid ¤",
  "✿ skipped it! your savings pot is getting cuter ✿",
  "⊹ one step closer to your dream purchase ⊹",
  "☽ rip to that impulse buy. she never stood a chance ☽",
  "❋ wallet said: she is so unbothered ❋",
  "✦ every skip is a step to your dream life ✦",
  "★ slay the budget not the bank account ★",
  "♡ that skip just paid for your future self ♡",
  "⊹ cha-ching! your future self says thank you ⊹",
];

const FEE_CATEGORIES = [
  { value: "rent", label: "Rent / Mortgage" },
  { value: "subscription", label: "Subscription" },
  { value: "utility", label: "Utility" },
  { value: "insurance", label: "Insurance" },
  { value: "transport", label: "Transport" },
  { value: "loan", label: "Loan" },
  { value: "other", label: "Other" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function getDaysInMonth(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function getMonthLabel(): string {
  return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getDayOfMonth(): number {
  return new Date().getDate();
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function pickReward(): string {
  return PRESET_REWARDS[Math.floor(Math.random() * PRESET_REWARDS.length)];
}

// ─── Y2K Receipt ─────────────────────────────────────────────────────────────

// Zigzag SVG edges — triangles in page-cream color punch into the receipt
const ZZ_COLOR = "%23F5EEF5";
const ZZ_TOP = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='12'%3E%3Cpolygon points='0,0 20,0 10,12' fill='${ZZ_COLOR}'/%3E%3C/svg%3E")`;
const ZZ_BOTTOM = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='12'%3E%3Cpolygon points='0,12 20,12 10,0' fill='${ZZ_COLOR}'/%3E%3C/svg%3E")`;

function ReceiptLine({
  label,
  value,
  bold = false,
  accent = false,
  indent = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
  indent?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: bold ? "12.5px" : "11.5px",
        fontWeight: bold ? 700 : 400,
        color: accent ? "#A03050" : bold ? "#2A1818" : "#6A4848",
        padding: "2.5px 0",
        paddingLeft: indent ? "10px" : "0",
        letterSpacing: "0.03em",
      }}
    >
      <span
        style={{
          flex: 1,
          marginRight: "8px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span style={{ flexShrink: 0 }}>{value}</span>
    </div>
  );
}

function ReceiptDivider({ double = false }: { double?: boolean }) {
  return (
    <div
      style={{
        margin: "8px 0",
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "10px",
        color: "#C8B0B8",
        letterSpacing: "0.15em",
        textAlign: "center",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {double ? "= = = = = = = = = = = = =" : "- - - - - - - - - - - - - - -"}
    </div>
  );
}

interface BudgetReceiptProps {
  income: number;
  savingsGoal: number;
  fees: RecurringFee[];
  totalSkipped: number;
}

function BudgetReceipt({ income, savingsGoal, fees, totalSkipped }: BudgetReceiptProps) {
  const activeFees = fees.filter((f) => f.active);
  const totalFees = activeFees.reduce((s, f) => s + f.amount, 0);
  const spendable = Math.max(0, income - savingsGoal - totalFees);
  const daysInMonth = getDaysInMonth();
  const dayOfMonth = getDayOfMonth();
  const daysLeft = daysInMonth - dayOfMonth + 1;
  const dailyBudget = daysInMonth > 0 ? spendable / daysInMonth : 0;
  const weeklyBudget = dailyBudget * 7;
  const remainingBudget = dailyBudget * daysLeft;
  const isEmpty = income === 0;

  return (
    <div
      style={{
        width: "min(290px, 100%)",
        flexShrink: 0,
        margin: "0 auto",
        filter:
          "drop-shadow(0 8px 24px rgba(160,60,100,0.12)) drop-shadow(0 2px 4px rgba(0,0,0,0.07))",
      }}
    >
      {/* Jagged top edge */}
      <div
        style={{
          height: "12px",
          backgroundImage: ZZ_TOP,
          backgroundRepeat: "repeat-x",
          backgroundPosition: "0 0",
          backgroundColor: "#FFFCF8",
        }}
      />

      {/* Paper body */}
      <div style={{ backgroundColor: "#FFFCF8", padding: "4px 20px 20px" }}>
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "14px",
            fontFamily: "'Courier New', Courier, monospace",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "0.28em",
              color: "#C8A0B0",
              marginBottom: "6px",
            }}
          >
            ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: "#2A1818",
              textTransform: "uppercase",
            }}
          >
            Eden Finance
          </div>
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "0.14em",
              color: "#8A5868",
              marginTop: "2px",
              textTransform: "uppercase",
            }}
          >
            Budget Receipt
          </div>
          <div style={{ fontSize: "10.5px", color: "#B09898", marginTop: "5px" }}>
            {getMonthLabel()}
          </div>
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "0.28em",
              color: "#C8A0B0",
              marginTop: "5px",
            }}
          >
            ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦
          </div>
        </div>

        {isEmpty ? (
          <div
            style={{
              textAlign: "center",
              padding: "28px 0",
              fontFamily: "'Courier New', monospace",
              fontSize: "11px",
              color: "#C0A0A8",
              lineHeight: 2.2,
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>🧾</div>
            <div>enter your budget</div>
            <div>to print your receipt!</div>
          </div>
        ) : (
          <>
            <ReceiptDivider />
            <ReceiptLine label="MONTHLY INCOME" value={`$${fmt(income)}`} bold />
            <ReceiptLine label="SAVINGS GOAL" value={`-$${fmt(savingsGoal)}`} />

            {activeFees.length > 0 && (
              <>
                <ReceiptDivider />
                <div
                  style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: "9.5px",
                    letterSpacing: "0.14em",
                    color: "#B09898",
                    textTransform: "uppercase",
                    marginBottom: "3px",
                  }}
                >
                  Recurring Fees
                </div>
                {activeFees.map((fee) => (
                  <ReceiptLine
                    key={fee.id}
                    label={fee.name.length > 20 ? fee.name.slice(0, 20) + "…" : fee.name}
                    value={`-$${fmt(fee.amount)}`}
                    indent
                  />
                ))}
                <ReceiptLine label="  FEES TOTAL" value={`-$${fmt(totalFees)}`} />
              </>
            )}

            <ReceiptDivider double />
            <ReceiptLine label="SPENDABLE" value={`$${fmt(spendable)}`} bold accent />
            <ReceiptDivider />

            <ReceiptLine label="TODAY'S BUDGET" value={`$${fmt(dailyBudget)}`} bold accent />
            <ReceiptLine label="THIS WEEK" value={`$${fmt(weeklyBudget)}`} bold />
            <ReceiptLine label="DAYS REMAINING" value={`${daysLeft} days`} />
            <ReceiptLine label="BUDGET REMAINING" value={`$${fmt(remainingBudget)}`} />

            {totalSkipped > 0 && (
              <>
                <ReceiptDivider />
                <ReceiptLine
                  label="✨ TOTAL SAVED"
                  value={`$${fmt(totalSkipped)}`}
                  bold
                  accent
                />
                <div
                  style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: "9.5px",
                    color: "#C8A0B0",
                    textAlign: "center",
                    marginTop: "2px",
                    letterSpacing: "0.05em",
                  }}
                >
                  from skipped purchases
                </div>
              </>
            )}

            <ReceiptDivider />

            {/* Footer */}
            <div
              style={{
                textAlign: "center",
                fontFamily: "'Courier New', monospace",
                color: "#C8A0B0",
                fontSize: "9.5px",
                letterSpacing: "0.08em",
                lineHeight: 2,
                marginTop: "4px",
              }}
            >
              <div>* thank you for being wise *</div>
              <div style={{ marginTop: "6px", letterSpacing: "0.3em", fontSize: "8.5px" }}>
                ||| || |||| ||| || ||||| ||
              </div>
              <div style={{ fontSize: "8.5px", marginTop: "2px" }}>
                EDN-{new Date().getFullYear()}-
                {String(new Date().getMonth() + 1).padStart(2, "0")}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Jagged bottom edge */}
      <div
        style={{
          height: "12px",
          backgroundImage: ZZ_BOTTOM,
          backgroundRepeat: "repeat-x",
          backgroundPosition: "0 0",
          backgroundColor: "#FFFCF8",
        }}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const supabase = createClient();

  // Budget
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [income, setIncome] = useState("");
  const [savingsGoal, setSavingsGoal] = useState("");
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetSaved, setBudgetSaved] = useState(false);

  // Fees
  const [fees, setFees] = useState<RecurringFee[]>([]);
  const [newFeeName, setNewFeeName] = useState("");
  const [newFeeAmount, setNewFeeAmount] = useState("");
  const [newFeeCategory, setNewFeeCategory] = useState("other");
  const [feeLoading, setFeeLoading] = useState(false);

  // Skip log
  const [skipped, setSkipped] = useState<SkippedPurchase[]>([]);
  const [skipItem, setSkipItem] = useState("");
  const [skipAmount, setSkipAmount] = useState("");
  const [skipLoading, setSkipLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const [pageLoading, setPageLoading] = useState(true);

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const month = getMonthStart();
    const [budgetRes, feesRes, skippedRes] = await Promise.all([
      supabase.from("budget_months").select("*").eq("month", month).maybeSingle(),
      supabase
        .from("recurring_fees")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("skipped_purchases")
        .select("*")
        .eq("month", month)
        .order("skipped_at", { ascending: false }),
    ]);

    if (budgetRes.data) {
      setBudgetId(budgetRes.data.id);
      setIncome(String(budgetRes.data.income));
      setSavingsGoal(String(budgetRes.data.savings_goal));
    }
    if (feesRes.data) setFees(feesRes.data);
    if (skippedRes.data) setSkipped(skippedRes.data);
    setPageLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Save budget ────────────────────────────────────────────────────────────

  async function saveBudget() {
    setBudgetLoading(true);
    const payload = {
      month: getMonthStart(),
      income: parseFloat(income) || 0,
      savings_goal: parseFloat(savingsGoal) || 0,
      updated_at: new Date().toISOString(),
    };

    if (budgetId) {
      await supabase.from("budget_months").update(payload).eq("id", budgetId);
    } else {
      const { data } = await supabase
        .from("budget_months")
        .insert(payload)
        .select()
        .single();
      if (data) setBudgetId(data.id);
    }

    setBudgetLoading(false);
    setBudgetSaved(true);
    setTimeout(() => setBudgetSaved(false), 2200);
  }

  // ── Add fee ────────────────────────────────────────────────────────────────

  async function addFee() {
    if (!newFeeName.trim() || !newFeeAmount) return;
    setFeeLoading(true);
    const { data } = await supabase
      .from("recurring_fees")
      .insert({
        name: newFeeName.trim(),
        amount: parseFloat(newFeeAmount) || 0,
        category: newFeeCategory,
      })
      .select()
      .single();
    if (data) setFees((prev) => [...prev, data]);
    setNewFeeName("");
    setNewFeeAmount("");
    setNewFeeCategory("other");
    setFeeLoading(false);
  }

  // ── Delete fee ─────────────────────────────────────────────────────────────

  async function deleteFee(id: string) {
    await supabase.from("recurring_fees").delete().eq("id", id);
    setFees((prev) => prev.filter((f) => f.id !== id));
  }

  // ── Log skip ───────────────────────────────────────────────────────────────

  async function logSkip() {
    if (!skipItem.trim() || !skipAmount) return;
    setSkipLoading(true);
    const reward = pickReward();
    const { data } = await supabase
      .from("skipped_purchases")
      .insert({
        item_name: skipItem.trim(),
        amount: parseFloat(skipAmount) || 0,
        reward_message: reward,
        month: getMonthStart(),
      })
      .select()
      .single();
    if (data) setSkipped((prev) => [data, ...prev]);
    setSkipItem("");
    setSkipAmount("");
    setSkipLoading(false);
  }

  // ── Get AI reward ──────────────────────────────────────────────────────────

  async function getAiReward(id: string, itemName: string, amount: number) {
    setAiLoading(id);
    try {
      const res = await fetch("/api/finance/reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_name: itemName, amount }),
      });
      if (res.ok) {
        const { message } = await res.json();
        await supabase
          .from("skipped_purchases")
          .update({ reward_message: message })
          .eq("id", id);
        setSkipped((prev) =>
          prev.map((s) => (s.id === id ? { ...s, reward_message: message } : s))
        );
      }
    } finally {
      setAiLoading(null);
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const incomeNum = parseFloat(income) || 0;
  const savingsNum = parseFloat(savingsGoal) || 0;
  const totalSkipped = skipped.reduce((s, p) => s + p.amount, 0);

  // ── Shared styles ──────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1.5px solid #EDE8E3",
    background: "white",
    fontSize: "14px",
    color: "#3D3535",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 500,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#9B8E8E",
    marginBottom: "6px",
  };

  if (pageLoading) {
    return (
      <div className="page-padding" style={{ color: "#9B8E8E", fontSize: "14px" }}>
        Loading your finances…
      </div>
    );
  }

  return (
    <div className="page-padding" style={{ maxWidth: "1020px" }}>
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "36px" }}>
        <p
          style={{
            fontSize: "12px",
            fontWeight: 500,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#9B8E8E",
            marginBottom: "8px",
          }}
        >
          Finance
        </p>
        <h1
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "40px",
            fontWeight: 400,
            color: "#3D3535",
          }}
        >
          Budget <em>Receipt</em>
        </h1>
        <p style={{ color: "#9B8E8E", fontSize: "14px", marginTop: "6px" }}>
          Know your numbers. Celebrate every skip. Build the life you deserve.
        </p>
      </div>

      {/* ── Main 2-column grid ────────────────────────────────────────────── */}
      <div
        className="grid-finance"
        style={{
          gap: "40px",
          alignItems: "start",
        }}
      >
        {/* ── Left: setup forms ─────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Budget card */}
          <Card padding="lg">
            <CardTitle style={{ marginBottom: "20px" }}>Monthly Budget</CardTitle>
            <div
              className="grid-2-col"
              style={{
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div>
                <label style={labelStyle}>Monthly Income</label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9B8E8E",
                      fontSize: "14px",
                      pointerEvents: "none",
                    }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    style={{ ...inputStyle, paddingLeft: "26px" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#F2C4CE")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#EDE8E3")}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Savings Goal</label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9B8E8E",
                      fontSize: "14px",
                      pointerEvents: "none",
                    }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    value={savingsGoal}
                    onChange={(e) => setSavingsGoal(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    style={{ ...inputStyle, paddingLeft: "26px" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#F2C4CE")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#EDE8E3")}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={saveBudget}
              disabled={budgetLoading}
              style={{
                padding: "10px 24px",
                borderRadius: "10px",
                border: "none",
                background: budgetSaved ? "#D8E4D6" : "#3D3535",
                color: budgetSaved ? "#4A6A44" : "white",
                fontSize: "13px",
                fontWeight: 500,
                cursor: budgetLoading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {budgetSaved ? "✓ Saved!" : budgetLoading ? "Saving…" : "Save Budget"}
            </button>
          </Card>

          {/* Recurring fees card */}
          <Card padding="lg">
            <CardTitle style={{ marginBottom: "20px" }}>Recurring Fees</CardTitle>

            {/* Add new fee row */}
            <div
              className="grid-fee-form"
              style={{
                gap: "10px",
                marginBottom: "16px",
                alignItems: "end",
              }}
            >
              <div>
                <label style={labelStyle}>Name</label>
                <input
                  type="text"
                  value={newFeeName}
                  onChange={(e) => setNewFeeName(e.target.value)}
                  placeholder="e.g. Netflix, Rent…"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#F2C4CE")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#EDE8E3")}
                  onKeyDown={(e) => e.key === "Enter" && addFee()}
                />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <select
                  value={newFeeCategory}
                  onChange={(e) => setNewFeeCategory(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#F2C4CE")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#EDE8E3")}
                >
                  {FEE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Amount</label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9B8E8E",
                      fontSize: "14px",
                      pointerEvents: "none",
                    }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    value={newFeeAmount}
                    onChange={(e) => setNewFeeAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    style={{ ...inputStyle, paddingLeft: "26px" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#F2C4CE")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#EDE8E3")}
                    onKeyDown={(e) => e.key === "Enter" && addFee()}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={addFee}
              disabled={feeLoading || !newFeeName.trim() || !newFeeAmount}
              style={{
                padding: "8px 18px",
                borderRadius: "9px",
                border: "1.5px solid #EDE8E3",
                background: "transparent",
                color: "#5C4E48",
                fontSize: "13px",
                cursor:
                  feeLoading || !newFeeName.trim() || !newFeeAmount
                    ? "not-allowed"
                    : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: fees.length > 0 ? "18px" : "0",
                opacity: !newFeeName.trim() || !newFeeAmount ? 0.45 : 1,
                transition: "all 0.15s",
              }}
            >
              <Plus size={13} />
              Add Fee
            </button>

            {/* Fees list */}
            {fees.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {fees.map((fee) => (
                  <div
                    key={fee.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(242,196,206,0.07)",
                      border: "1px solid rgba(242,196,206,0.22)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{ fontSize: "13.5px", color: "#3D3535", fontWeight: 500 }}
                      >
                        {fee.name}
                      </span>
                      <span
                        style={{
                          fontSize: "10.5px",
                          color: "#B09090",
                          marginLeft: "8px",
                          textTransform: "capitalize",
                        }}
                      >
                        {FEE_CATEGORIES.find((c) => c.value === fee.category)?.label ??
                          fee.category}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "13.5px",
                        color: "#3D3535",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                      }}
                    >
                      ${fmt(fee.amount)}
                    </span>
                    <button
                      onClick={() => deleteFee(fee.id)}
                      style={{
                        padding: "4px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: "#C8A0A8",
                        display: "flex",
                        borderRadius: "6px",
                        transition: "color 0.15s",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#A83050")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#C8A0A8")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {/* Fees total */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 14px 0",
                    borderTop: "1px solid #EDE8E3",
                    marginTop: "4px",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "#9B8E8E", fontWeight: 500 }}>
                    Monthly total
                  </span>
                  <span style={{ fontSize: "13px", color: "#3D3535", fontWeight: 600 }}>
                    ${fmt(fees.reduce((s, f) => s + f.amount, 0))}
                  </span>
                </div>
              </div>
            )}

            {fees.length === 0 && (
              <p style={{ fontSize: "13px", color: "#C0B0B0", fontStyle: "italic" }}>
                No recurring fees yet. Add rent, subscriptions, bills…
              </p>
            )}
          </Card>
        </div>

        {/* ── Right: live receipt ────────────────────────────────────────── */}
        <div
          style={{
            position: "sticky",
            top: "40px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <BudgetReceipt
            income={incomeNum}
            savingsGoal={savingsNum}
            fees={fees}
            totalSkipped={totalSkipped}
          />
        </div>
      </div>

      {/* ── Skip log section ──────────────────────────────────────────────── */}
      <div style={{ marginTop: "52px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h2
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: "30px",
              fontWeight: 400,
              color: "#3D3535",
            }}
          >
            ✨ I Skipped It
          </h2>
          <p style={{ fontSize: "13px", color: "#9B8E8E", marginTop: "4px" }}>
            Log every purchase you chose not to make. Watch your savings stack up.
          </p>
        </div>

        {/* Skip input row */}
        <div
          className="grid-2-col"
          style={{
            gap: "12px",
            marginBottom: "28px",
            alignItems: "end",
          }}
        >
          <div>
            <label style={labelStyle}>What did you skip?</label>
            <input
              type="text"
              value={skipItem}
              onChange={(e) => setSkipItem(e.target.value)}
              placeholder="Bubble tea, ASOS haul, Uber Eats…"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#F2C4CE")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#EDE8E3")}
              onKeyDown={(e) => e.key === "Enter" && logSkip()}
            />
          </div>
          <div>
            <label style={labelStyle}>How much was it?</label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9B8E8E",
                  fontSize: "14px",
                  pointerEvents: "none",
                }}
              >
                $
              </span>
              <input
                type="number"
                value={skipAmount}
                onChange={(e) => setSkipAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                style={{ ...inputStyle, paddingLeft: "26px" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#F2C4CE")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#EDE8E3")}
                onKeyDown={(e) => e.key === "Enter" && logSkip()}
              />
            </div>
          </div>
          <button
            onClick={logSkip}
            disabled={skipLoading || !skipItem.trim() || !skipAmount}
            style={{
              padding: "10px 24px",
              borderRadius: "10px",
              border: "none",
              background:
                skipItem.trim() && skipAmount && !skipLoading ? "#3D3535" : "#EDE8E3",
              color: skipItem.trim() && skipAmount && !skipLoading ? "white" : "#C0B4B4",
              fontSize: "13px",
              fontWeight: 500,
              cursor:
                skipItem.trim() && skipAmount && !skipLoading ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
              transition: "all 0.2s",
              height: "42px",
            }}
          >
            {skipLoading ? "Logging…" : "Log it! ✨"}
          </button>
        </div>

        {/* Savings total banner */}
        {totalSkipped > 0 && (
          <div
            style={{
              padding: "18px 24px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #FBF0F3, #F5E4F0)",
              border: "1.5px solid #F2C4CE",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "20px",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#C9849A",
                  marginBottom: "2px",
                }}
              >
                Total Saved This Month
              </p>
              <p
                style={{
                  fontFamily: "var(--font-cormorant), Georgia, serif",
                  fontSize: "34px",
                  fontWeight: 400,
                  color: "#A03050",
                  lineHeight: 1,
                }}
              >
                ${fmt(totalSkipped)}
              </p>
            </div>
            <div style={{ fontSize: "36px" }}>💰</div>
          </div>
        )}

        {/* Skipped list */}
        {skipped.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {skipped.map((skip) => (
              <div
                key={skip.id}
                style={{
                  padding: "14px 18px",
                  borderRadius: "14px",
                  background: "linear-gradient(160deg, #ffffff 0%, #fff5f8 100%)",
                  border: "1px solid rgba(200,100,140,0.16)",
                  boxShadow:
                    "0 1px 4px rgba(180,60,100,0.06), 0 6px 20px rgba(180,60,100,0.09)",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #F2C4CE, #D8A8C0)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    flexShrink: 0,
                  }}
                >
                  ✨
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginBottom: "3px",
                    }}
                  >
                    <span
                      style={{ fontSize: "14px", fontWeight: 600, color: "#3D3535" }}
                    >
                      {skip.item_name}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#A03050",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      ${fmt(skip.amount)}
                    </span>
                    <span
                      style={{ fontSize: "11px", color: "#C0B0B0", marginLeft: "auto" }}
                    >
                      {new Date(skip.skipped_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {skip.reward_message && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#9B6878",
                        fontStyle: "italic",
                        lineHeight: 1.45,
                      }}
                    >
                      {skip.reward_message}
                    </p>
                  )}
                </div>

                {/* AI reward button */}
                <button
                  onClick={() => getAiReward(skip.id, skip.item_name, skip.amount)}
                  disabled={aiLoading === skip.id}
                  title="Get new AI reward"
                  style={{
                    padding: "6px 10px",
                    border: "1px solid #F2C4CE",
                    borderRadius: "8px",
                    background: "transparent",
                    cursor: aiLoading === skip.id ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    color: "#C9849A",
                    flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#FBF0F3";
                    e.currentTarget.style.borderColor = "#EDA8BC";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "#F2C4CE";
                  }}
                >
                  <Sparkles size={11} />
                  {aiLoading === skip.id ? "…" : "AI"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "44px 24px",
              textAlign: "center",
              color: "#C0B0B0",
            }}
          >
            <div style={{ fontSize: "38px", marginBottom: "14px" }}>🛍️</div>
            <p style={{ fontSize: "14px", marginBottom: "5px" }}>
              No skipped purchases yet this month.
            </p>
            <p style={{ fontSize: "13px" }}>
              Every time you walk away from a purchase, log it here and collect your
              reward!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
