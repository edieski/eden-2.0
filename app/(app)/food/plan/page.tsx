"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Camera, Upload, X, Sparkles, Check, ShoppingCart,
  ChevronDown, ChevronUp, Plus, Trash2, Timer, Receipt,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import type { GroceryItem } from "@/types";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack",
};
const MEAL_COLORS: Record<string, string> = {
  breakfast: "#F0E4CC", lunch: "#D8E4D6", dinner: "#F2C4CE", snack: "#EDE5F5",
};
const CATEGORY_LABELS: Record<string, string> = {
  produce: "Produce", protein: "Protein", dairy: "Dairy",
  pantry: "Pantry", frozen: "Frozen", bakery: "Bakery", other: "Other",
};
const CATEGORY_ORDER = ["produce", "protein", "dairy", "bakery", "pantry", "frozen", "other"];
const MAX_PHOTOS = 50;

interface ScanIngredient { name: string; quantity: string }
interface ScanMeal {
  day_index: number;
  meal_type: typeof MEAL_TYPES[number];
  title: string;
  description: string;
  ingredients: ScanIngredient[];
  selected: boolean;
}
interface ScanGrocery { name: string; quantity: string; category: string; selected: boolean }
interface PrepSession { day_index: number; label: string; duration_minutes: number; tasks: string[] }

function groupGroceryByCategory<T extends { category: string }>(items: T[]) {
  return CATEGORY_ORDER.reduce<Record<string, T[]>>((acc, cat) => {
    const catItems = items.filter((g) => g.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {});
}

function getWeekStartFromDate(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split("T")[0];
}

function dateToMealPlanFields(date: Date): { week_start: string; day_of_week: number } {
  const week_start = getWeekStartFromDate(date);
  const day_of_week = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
  return { week_start, day_of_week };
}

function getCompressionSettings(currentCount: number) {
  if (currentCount >= 30) return { maxDim: 512, quality: 0.7 };
  if (currentCount >= 15) return { maxDim: 768, quality: 0.75 };
  return { maxDim: 1024, quality: 0.82 };
}

function formatPlanDay(planStart: Date, dayIndex: number): string {
  const d = new Date(planStart);
  d.setDate(d.getDate() + dayIndex);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

async function compressImage(file: File, maxDim = 1024, quality = 0.82): Promise<{ preview: string; base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height / width) * maxDim);
            width = maxDim;
          } else {
            width = Math.round((width / height) * maxDim);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas unavailable")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({ preview: dataUrl, base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function readFileRaw(file: File): Promise<{ preview: string; base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      resolve({ preview: dataUrl, base64: dataUrl.split(",")[1], mimeType: file.type });
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function readFileAsImage(file: File, settings?: { maxDim: number; quality: number }) {
  const { maxDim, quality } = settings ?? getCompressionSettings(0);
  return compressImage(file, maxDim, quality).catch(() => readFileRaw(file));
}

export default function MenuPlanPage() {
  const supabase = createClient();
  const weekStart = getWeekStartFromDate(new Date());
  const weekLabel = new Date(weekStart + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const accent = "#6A8A68";
  const planStart = new Date();
  planStart.setHours(0, 0, 0, 0);

  // Scan state
  const [phase, setPhase] = useState<"idle" | "preview" | "loading" | "result">("idle");
  const [images, setImages] = useState<{ preview: string; base64: string; mimeType: string }[]>([]);
  const [numDays, setNumDays] = useState(7);
  const [planNumDays, setPlanNumDays] = useState(7);
  const [summary, setSummary] = useState("");
  const [budgetTip, setBudgetTip] = useState("");
  const [prepSchedule, setPrepSchedule] = useState<PrepSession[]>([]);
  const [detectedFoods, setDetectedFoods] = useState<{ name: string; type: string }[]>([]);
  const [scanMeals, setScanMeals] = useState<ScanMeal[]>([]);
  const [scanGrocery, setScanGrocery] = useState<ScanGrocery[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(true);
  const [groceryExpanded, setGroceryExpanded] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Grocery state
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [generatingGrocery, setGeneratingGrocery] = useState(false);

  useEffect(() => { loadGrocery(); }, []);

  async function loadGrocery() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("grocery_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .order("category")
      .order("name");
    setGroceryItems(data ?? []);
  }

  async function handleFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;

    const remaining = MAX_PHOTOS - images.length;
    if (remaining <= 0) {
      setScanError(`Maximum ${MAX_PHOTOS} photos — remove some to add more`);
      return;
    }

    const toAdd = imageFiles.slice(0, remaining);
    if (toAdd.length < imageFiles.length) {
      setScanError(`Only added ${toAdd.length} — max is ${MAX_PHOTOS} photos`);
    } else {
      setScanError(null);
    }

    let idx = 0;
    const loaded: { preview: string; base64: string; mimeType: string }[] = [];
    for (const file of toAdd) {
      loaded.push(await readFileAsImage(file, getCompressionSettings(images.length + idx)));
      idx++;
    }
    setImages((prev) => [...prev, ...loaded]);
    setPhase("preview");
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function scan() {
    if (!images.length) return;
    setPhase("loading");
    setScanError(null);
    try {
      const res = await fetch("/api/food/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map(({ base64, mimeType }) => ({ base64, mimeType })),
          num_days: numDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setPlanNumDays(data.num_days ?? numDays);
      setSummary(data.summary ?? "");
      setBudgetTip(data.budget_tip ?? "");
      setPrepSchedule(data.prep_schedule ?? []);
      setDetectedFoods(data.detected_foods ?? []);
      setScanMeals((data.menu ?? []).map((m: Omit<ScanMeal, "selected">) => ({ ...m, selected: true })));
      setScanGrocery((data.grocery_list ?? []).map((g: Omit<ScanGrocery, "selected">) => ({ ...g, selected: true })));
      setPhase("result");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
      setPhase("preview");
    }
  }

  function resetScan() {
    setPhase("idle");
    setImages([]);
    setSummary("");
    setBudgetTip("");
    setPrepSchedule([]);
    setDetectedFoods([]);
    setScanMeals([]);
    setScanGrocery([]);
    setScanError(null);
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) setPhase("idle");
      return next;
    });
  }

  async function importPlan() {
    const selected = scanMeals.filter((m) => m.selected && m.title.trim());
    if (!selected.length) return;
    setImporting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setImporting(false); return; }

    for (const meal of selected) {
      const mealDate = new Date(planStart);
      mealDate.setDate(mealDate.getDate() + meal.day_index);
      const { week_start, day_of_week } = dateToMealPlanFields(mealDate);

      const { data: plan } = await supabase.from("meal_plans").insert({
        user_id: user.id,
        week_start,
        day_of_week,
        meal_type: meal.meal_type,
        title: meal.title.trim(),
        description: meal.description || null,
        source: "scan",
      }).select().single();

      if (plan && meal.ingredients.length) {
        await supabase.from("meal_ingredients").insert(
          meal.ingredients.filter((i) => i.name.trim()).map((i) => ({
            user_id: user.id,
            meal_plan_id: plan.id,
            name: i.name.trim(),
            quantity: i.quantity || null,
          }))
        );
      }
    }

    if (scanGrocery.length) {
      const selectedGrocery = scanGrocery.filter((g) => g.selected && g.name.trim());
      if (selectedGrocery.length) {
        const res = await fetch("/api/food/grocery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            week_start: weekStart,
            items: selectedGrocery.map(({ name, quantity, category }) => ({ name, quantity, category })),
          }),
        });
        const data = await res.json();
        if (res.ok) setGroceryItems(data.items ?? []);
      }
    } else {
      await loadGrocery();
    }

    setImporting(false);
    resetScan();
  }

  async function regenerateGrocery() {
    setGeneratingGrocery(true);
    try {
      const res = await fetch("/api/food/grocery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: weekStart }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate");
      setGroceryItems(data.items ?? []);
    } catch {
      // keep existing list
    }
    setGeneratingGrocery(false);
  }

  async function toggleGrocery(id: string, checked: boolean) {
    setGroceryItems((prev) => prev.map((g) => g.id === id ? { ...g, checked } : g));
    await supabase.from("grocery_items").update({ checked }).eq("id", id);
  }

  async function deleteGrocery(id: string) {
    await supabase.from("grocery_items").delete().eq("id", id);
    setGroceryItems((prev) => prev.filter((g) => g.id !== id));
  }

  async function clearCheckedGrocery() {
    const checked = groceryItems.filter((g) => g.checked).map((g) => g.id);
    if (!checked.length) return;
    await supabase.from("grocery_items").delete().in("id", checked);
    setGroceryItems((prev) => prev.filter((g) => !g.checked));
  }

  const selectedMealCount = scanMeals.filter((m) => m.selected).length;
  const selectedGroceryCount = scanGrocery.filter((g) => g.selected).length;
  const checkedGroceryCount = groceryItems.filter((g) => g.checked).length;

  const groupedGrocery = groupGroceryByCategory(groceryItems);
  const groupedScanGrocery = groupGroceryByCategory(scanGrocery);

  const mealsByDay = Array.from({ length: planNumDays }, (_, dayIndex) => ({
    dayIndex,
    label: formatPlanDay(planStart, dayIndex),
    meals: scanMeals.filter((m) => m.day_index === dayIndex),
  })).filter((d) => d.meals.length > 0);

  return (
    <div className="page-padding" style={{ maxWidth: "900px" }}>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "8px" }}>
          Nourishment Planning
        </p>
        <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "40px", fontWeight: 400, color: "#3D3535" }}>
          Menu & <em>Grocery</em>
        </h1>
        <p style={{ color: "#9B8E8E", fontSize: "14px", marginTop: "6px" }}>
          Budget-friendly meal prep — batch cook once, eat all week, shop at a French supermarket
        </p>
      </div>

      {/* Photo scan */}
      <Card style={{ marginBottom: "24px" }}>
        <CardTitle>Photo scan</CardTitle>
        <p style={{ fontSize: "13px", color: "#9B8E8E", marginBottom: "16px", lineHeight: 1.6 }}>
          Upload meal inspiration — Eden builds a budget meal-prep plan: batch-cook sessions, ingredient reuse, one consolidated shop list (Carrefour, Leclerc, Lidl…).
        </p>

        {/* Days picker — visible before/during upload */}
        {(phase === "idle" || phase === "preview") && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "#3D3535" }}>Plan for</label>
            <input
              type="number"
              min={1}
              max={30}
              value={numDays}
              onChange={(e) => setNumDays(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
              style={{
                width: "64px", padding: "8px 10px", borderRadius: "10px",
                border: "1.5px solid #E0D8D8", fontSize: "14px", textAlign: "center",
                fontFamily: "inherit", color: "#3D3535",
              }}
            />
            <span style={{ fontSize: "13px", color: "#9B8E8E" }}>days (1–30)</span>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {phase === "idle" && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => { fileRef.current?.removeAttribute("capture"); fileRef.current?.click(); }}
            style={{
              border: `2px dashed ${accent}50`, borderRadius: "20px", padding: "40px 24px",
              textAlign: "center", cursor: "pointer", background: `${accent}06`, transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${accent}90`; e.currentTarget.style.background = `${accent}10`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${accent}50`; e.currentTarget.style.background = `${accent}06`; }}
          >
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: `linear-gradient(135deg, ${accent}20, ${accent}35)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <Camera size={24} color={accent} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "#3D3535", marginBottom: "4px" }}>Drop meal photos here</p>
            <p style={{ fontSize: "13px", color: "#9B8E8E" }}>Dishes, ingredients, recipes — add as many as you like (up to {MAX_PHOTOS})</p>
            <div style={{ marginTop: "14px", display: "flex", gap: "8px", justifyContent: "center" }}>
              <button
                onClick={(e) => { e.stopPropagation(); fileRef.current?.setAttribute("capture", "environment"); fileRef.current?.click(); }}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "10px", border: `1.5px solid ${accent}40`, background: "transparent", color: accent, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                <Camera size={13} /> Take photo
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); fileRef.current?.removeAttribute("capture"); fileRef.current?.click(); }}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "10px", border: `1.5px solid ${accent}40`, background: "transparent", color: accent, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                <Upload size={13} /> Upload
              </button>
            </div>
          </div>
        )}

        {phase === "preview" && images.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#3D3535" }}>
                {images.length} photo{images.length !== 1 ? "s" : ""} · {numDays}-day plan
              </p>
              {images.length >= MAX_PHOTOS && (
                <span style={{ fontSize: "11px", color: "#C0607A" }}>Max reached</span>
              )}
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
              gap: "8px",
              marginBottom: "14px",
              maxHeight: "320px",
              overflowY: "auto",
              padding: "4px",
            }}>
              {images.map((img, idx) => (
                <div key={idx} style={{ position: "relative", borderRadius: "10px", overflow: "hidden", aspectRatio: "1" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt={`Photo ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => removeImage(idx)} style={{ position: "absolute", top: "4px", right: "4px", width: "20px", height: "20px", borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.55)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={10} />
                  </button>
                  <span style={{ position: "absolute", bottom: "4px", left: "4px", fontSize: "9px", fontWeight: 600, color: "white", background: "rgba(0,0,0,0.45)", padding: "1px 5px", borderRadius: "4px" }}>
                    {idx + 1}
                  </span>
                </div>
              ))}
              {images.length < MAX_PHOTOS && (
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{ borderRadius: "10px", aspectRatio: "1", border: `2px dashed ${accent}40`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer", background: `${accent}06` }}
                >
                  <Plus size={16} color={accent} />
                  <span style={{ fontSize: "10px", color: accent, fontWeight: 600 }}>Add more</span>
                </div>
              )}
            </div>
            {scanError && <p style={{ color: scanError.startsWith("Only added") ? "#9B8E8E" : "#C0607A", fontSize: "13px", marginBottom: "10px" }}>{scanError}</p>}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <Button onClick={scan}>
                <Sparkles size={14} style={{ marginRight: "6px" }} />
                Plan my {numDays} day{numDays !== 1 ? "s" : ""}
              </Button>
              <Button variant="ghost" onClick={resetScan}>Cancel</Button>
            </div>
          </div>
        )}

        {phase === "loading" && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: `${accent}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", animation: "pulse 1.5s ease infinite" }}>
              <Sparkles size={22} color={accent} />
            </div>
            <p style={{ fontSize: "15px", fontWeight: 500, color: "#3D3535" }}>Planning your {numDays}-day menu…</p>
            <p style={{ fontSize: "13px", color: "#9B8E8E", marginTop: "4px" }}>
              Building a budget meal-prep plan from {images.length} photo{images.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {phase === "result" && (
          <div ref={resultsRef}>
            {summary && (
              <p style={{ fontSize: "14px", color: "#3D3535", lineHeight: 1.6, marginBottom: "12px", padding: "12px 16px", borderRadius: "12px", background: `${accent}10` }}>
                {summary}
              </p>
            )}
            {budgetTip && (
              <p style={{ fontSize: "13px", color: "#6A5A40", lineHeight: 1.5, marginBottom: "12px", padding: "10px 14px", borderRadius: "10px", background: "#F5F0E4", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <Receipt size={14} color="#9B8E6E" style={{ flexShrink: 0, marginTop: "2px" }} />
                <span><strong style={{ fontWeight: 600 }}>Budget tip:</strong> {budgetTip}</span>
              </p>
            )}

            {prepSchedule.length > 0 && (
              <div style={{ marginBottom: "20px", padding: "16px", borderRadius: "14px", background: "#F0F4F0", border: "1px solid #D8E4D6" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Timer size={16} color={accent} />
                  <span style={{ fontSize: "15px", fontWeight: 600, color: "#3D3535" }}>Meal prep schedule</span>
                </div>
                {prepSchedule.map((session, i) => (
                  <div key={i} style={{ marginBottom: i < prepSchedule.length - 1 ? "14px" : 0 }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#6A8A68", marginBottom: "6px" }}>
                      Day {session.day_index + 1} · {session.label}
                      {session.duration_minutes > 0 && (
                        <span style={{ fontWeight: 400, color: "#9B8E8E" }}> — ~{session.duration_minutes} min</span>
                      )}
                    </p>
                    <ul style={{ margin: 0, paddingLeft: "18px" }}>
                      {session.tasks.map((task, j) => (
                        <li key={j} style={{ fontSize: "13px", color: "#3D3535", lineHeight: 1.5, marginBottom: "4px" }}>{task}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {detectedFoods.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
                {detectedFoods.map((f, i) => (
                  <span key={i} style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "99px", background: "#F0EBE3", color: "#6A5A5A" }}>
                    {f.name}
                  </span>
                ))}
              </div>
            )}

            {/* Meal plan */}
            <div style={{ marginBottom: "24px", padding: "16px", borderRadius: "14px", background: "#FAFAF8", border: "1px solid #EDE8E8" }}>
              <button
                onClick={() => setMenuExpanded((p) => !p)}
                style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "0 0 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}
              >
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#3D3535", flex: 1, textAlign: "left" }}>
                  Meal plan — {selectedMealCount}/{scanMeals.length} selected
                </span>
                {menuExpanded ? <ChevronUp size={16} color="#9B8E8E" /> : <ChevronDown size={16} color="#9B8E8E" />}
              </button>

              {menuExpanded && (
                <div style={{ maxHeight: "480px", overflowY: "auto" }}>
                  {mealsByDay.map(({ dayIndex, label, meals }) => (
                    <div key={dayIndex} style={{ marginBottom: "16px" }}>
                      <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "8px" }}>
                        Day {dayIndex + 1} · {label}
                      </p>
                      {meals.map((meal) => {
                        const idx = scanMeals.indexOf(meal);
                        return (
                          <div
                            key={idx}
                            onClick={() => setScanMeals((prev) => prev.map((m, i) => i === idx ? { ...m, selected: !m.selected } : m))}
                            style={{
                              display: "flex", gap: "12px", padding: "10px 12px", borderRadius: "10px", marginBottom: "6px",
                              background: meal.selected ? MEAL_COLORS[meal.meal_type] : "#FAFAFA",
                              border: meal.selected ? "1.5px solid transparent" : "1.5px solid #E8E0E0",
                              cursor: "pointer", opacity: meal.selected ? 1 : 0.6, transition: "all 0.15s",
                            }}
                          >
                            <div style={{ width: "20px", height: "20px", borderRadius: "6px", border: meal.selected ? "none" : "1.5px solid #C4B8B8", background: meal.selected ? accent : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                              {meal.selected && <Check size={12} color="white" strokeWidth={3} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#9B8E8E" }}>
                                {MEAL_LABELS[meal.meal_type]}
                              </span>
                              <p style={{ fontSize: "13px", fontWeight: 500, color: "#3D3535", marginTop: "2px" }}>{meal.title}</p>
                              {meal.description && <p style={{ fontSize: "12px", color: "#9B8E8E", marginTop: "2px" }}>{meal.description}</p>}
                              {meal.ingredients.length > 0 && (
                                <p style={{ fontSize: "11px", color: "#9B8E8E", marginTop: "4px", lineHeight: 1.5 }}>
                                  {meal.ingredients.map((i) => i.quantity ? `${i.name} (${i.quantity})` : i.name).join(" · ")}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grocery list from scan */}
            <div style={{ marginBottom: "20px", padding: "16px", borderRadius: "14px", background: "#FAFAF8", border: "1px solid #EDE8E8" }}>
              <button
                onClick={() => setGroceryExpanded((p) => !p)}
                style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "0 0 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}
              >
                <ShoppingCart size={15} color={accent} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#3D3535", flex: 1, textAlign: "left" }}>
                  Grocery list — {selectedGroceryCount}/{scanGrocery.length} selected
                </span>
                {groceryExpanded ? <ChevronUp size={16} color="#9B8E8E" /> : <ChevronDown size={16} color="#9B8E8E" />}
              </button>

              {groceryExpanded && (
                scanGrocery.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "#9B8E8E" }}>No grocery items returned — try scanning again.</p>
                ) : (
                  <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {Object.entries(groupedScanGrocery).map(([cat, items]) => (
                      <div key={cat} style={{ marginBottom: "14px" }}>
                        <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "6px" }}>
                          {CATEGORY_LABELS[cat] ?? cat}
                        </p>
                        {items.map((item, idx) => {
                          const globalIdx = scanGrocery.indexOf(item);
                          return (
                            <div
                              key={idx}
                              onClick={() => setScanGrocery((prev) => prev.map((g, i) => i === globalIdx ? { ...g, selected: !g.selected } : g))}
                              style={{
                                display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px",
                                borderRadius: "8px", marginBottom: "4px", cursor: "pointer",
                                background: item.selected ? "white" : "#F5F0F0",
                                opacity: item.selected ? 1 : 0.55, transition: "all 0.15s",
                              }}
                            >
                              <div style={{
                                width: "20px", height: "20px", borderRadius: "6px", flexShrink: 0,
                                border: item.selected ? "none" : "1.5px solid #C4B8B8",
                                background: item.selected ? accent : "white",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                {item.selected && <Check size={12} color="white" strokeWidth={3} />}
                              </div>
                              <span style={{ flex: 1, fontSize: "13px", color: "#3D3535" }}>
                                {item.name}
                                {item.quantity && <span style={{ color: "#9B8E8E", marginLeft: "6px", fontSize: "12px" }}>{item.quantity}</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Button onClick={importPlan} disabled={importing || selectedMealCount === 0}>
                {importing ? "Saving…" : `Save ${selectedMealCount} meals & ${selectedGroceryCount} items`}
              </Button>
              <Button variant="ghost" onClick={() => {
                setScanMeals((prev) => prev.map((m) => ({ ...m, selected: true })));
                setScanGrocery((prev) => prev.map((g) => ({ ...g, selected: true })));
              }}>Select all</Button>
              <Button variant="ghost" onClick={resetScan}>Start over</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Grocery list */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px", flexWrap: "wrap", gap: "10px" }}>
          <CardTitle>Grocery list</CardTitle>
          <span style={{ fontSize: "12px", color: "#9B8E8E" }}>Week of {weekLabel}</span>
        </div>
        <p style={{ fontSize: "13px", color: "#9B8E8E", marginBottom: "16px" }}>
          Shoppable at a French supermarket — from your photo scan or{" "}
          <Link href="/food/meals" style={{ color: accent, textDecoration: "underline" }}>meal planner</Link>.
        </p>

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={regenerateGrocery} disabled={generatingGrocery}>
            <Sparkles size={13} style={{ marginRight: "5px" }} />
            {generatingGrocery ? "Generating…" : "Generate from meal plan"}
          </Button>
          {checkedGroceryCount > 0 && (
            <Button variant="ghost" onClick={clearCheckedGrocery}>
              Clear {checkedGroceryCount} checked
            </Button>
          )}
        </div>

        {groceryItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "#9B8E8E" }}>
            <ShoppingCart size={28} style={{ opacity: 0.4, marginBottom: "10px" }} />
            <p style={{ fontSize: "14px" }}>No grocery items yet</p>
            <p style={{ fontSize: "12px", marginTop: "4px" }}>Upload meal photos above or generate from your meal planner</p>
          </div>
        ) : (
          <div>
            {Object.entries(groupedGrocery).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "8px" }}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </p>
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px",
                      borderRadius: "8px", marginBottom: "4px",
                      background: item.checked ? "#F5F0F0" : "transparent",
                      opacity: item.checked ? 0.55 : 1, transition: "all 0.15s",
                    }}
                  >
                    <button
                      onClick={() => toggleGrocery(item.id, !item.checked)}
                      style={{
                        width: "20px", height: "20px", borderRadius: "6px", flexShrink: 0,
                        border: item.checked ? "none" : "1.5px solid #C4B8B8",
                        background: item.checked ? accent : "white",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {item.checked && <Check size={12} color="white" strokeWidth={3} />}
                    </button>
                    <span style={{ flex: 1, fontSize: "13px", color: "#3D3535", textDecoration: item.checked ? "line-through" : "none" }}>
                      {item.name}
                      {item.quantity && <span style={{ color: "#9B8E8E", marginLeft: "6px", fontSize: "12px" }}>{item.quantity}</span>}
                    </span>
                    <button
                      onClick={() => deleteGrocery(item.id)}
                      style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C4B8B8", padding: "2px" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#C0607A")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#C4B8B8")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
