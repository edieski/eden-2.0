"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Type, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { VisionBoardItem } from "@/types";

const AFFIRMATION_PRESETS = [
  "I am becoming who I was always meant to be.",
  "My discipline is my love letter to my future self.",
  "I choose growth, even when it's uncomfortable.",
  "My body is capable and worthy of care.",
  "I create my life with intention.",
  "Small steps, every day.",
  "I am enough, and I am becoming more.",
  "My healing is not linear, and that is okay.",
];

const BG_COLORS = ["#FAE8EC", "#D8E4D6", "#EDE5F5", "#F0E4CC", "#F0EBE3", "#E8F0F8", "white"];
const TEXT_COLORS = ["#3D3535", "#C0607A", "#4A6847", "#6B4F8A", "#8A6230", "#9B8E8E"];

interface DraggableItemProps {
  item: VisionBoardItem;
  onUpdate: (id: string, updates: Partial<VisionBoardItem>) => void;
  onDelete: (id: string) => void;
}

function DraggableItem({ item, onUpdate, onDelete }: DraggableItemProps) {
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState(false);
  const dragStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    setDragging(true);
    setSelected(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: item.position_x, py: item.position_y };

    function onMove(e: MouseEvent) {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      onUpdate(item.id, { position_x: dragStart.current.px + dx, position_y: dragStart.current.py + dy });
    }
    function onUp() {
      setDragging(false);
      dragStart.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  return (
    <div
      style={{
        position: "absolute",
        left: item.position_x,
        top: item.position_y,
        width: item.width,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        zIndex: item.z_index + (selected ? 100 : 0),
        transform: `rotate(${item.rotation}deg)`,
        transition: dragging ? "none" : "box-shadow 0.2s",
        boxShadow: selected ? "0 8px 32px rgba(180,150,140,0.25)" : "0 4px 16px rgba(180,150,140,0.15)",
        borderRadius: "12px",
      }}
      onMouseDown={onMouseDown}
      onClick={() => setSelected((s) => !s)}
    >
      {item.type === "image" && item.url ? (
        <div style={{ borderRadius: "12px", overflow: "hidden", border: "3px solid white" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt="" style={{ width: "100%", height: item.height, objectFit: "cover", display: "block" }} draggable={false} />
        </div>
      ) : (
        <div
          style={{
            borderRadius: "12px",
            background: item.bg_color ?? "#FAE8EC",
            padding: "20px",
            minHeight: item.height,
            border: "2px solid white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p
            style={{
              fontFamily: item.type === "affirmation" ? "var(--font-cormorant), Georgia, serif" : "inherit",
              fontSize: item.type === "affirmation" ? "18px" : "14px",
              fontStyle: item.type === "affirmation" ? "italic" : "normal",
              fontWeight: item.type === "affirmation" ? 400 : 500,
              color: item.text_color ?? "#3D3535",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            {item.content}
          </p>
        </div>
      )}

      {selected && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          style={{
            position: "absolute", top: -10, right: -10,
            width: "26px", height: "26px", borderRadius: "50%",
            background: "#3D3535", border: "2px solid white",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10,
          }}
        >
          <Trash2 size={11} color="white" />
        </button>
      )}
    </div>
  );
}

export default function VisionBoardPage() {
  const supabase = createClient();
  const [items, setItems] = useState<VisionBoardItem[]>([]);
  const [panel, setPanel] = useState<"text" | "affirmation" | "image" | null>(null);
  const [textInput, setTextInput] = useState("");
  const [bgColor, setBgColor] = useState("#FAE8EC");
  const [textColor, setTextColor] = useState("#3D3535");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("vision_board_items").select("*").eq("user_id", user.id).order("created_at");
    setItems(data ?? []);
  }

  async function addTextItem(type: "text" | "affirmation") {
    if (!textInput.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("vision_board_items").insert({
      user_id: user.id, type, content: textInput.trim(),
      position_x: 100 + Math.random() * 300, position_y: 100 + Math.random() * 200,
      width: 220, height: 120, rotation: (Math.random() - 0.5) * 6,
      z_index: items.length, bg_color: bgColor, text_color: textColor,
    }).select().single();
    if (data) { setItems((p) => [...p, data]); setTextInput(""); setPanel(null); }
  }

  async function uploadImage(file: File) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("vision-board").upload(path, file);
    if (error) { setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("vision-board").getPublicUrl(path);
    const { data } = await supabase.from("vision_board_items").insert({
      user_id: user.id, type: "image", content: file.name, url: publicUrl,
      position_x: 100 + Math.random() * 300, position_y: 100 + Math.random() * 200,
      width: 200, height: 180, rotation: (Math.random() - 0.5) * 4,
      z_index: items.length,
    }).select().single();
    if (data) setItems((p) => [...p, data]);
    setUploading(false);
  }

  const updateItem = useCallback(async (id: string, updates: Partial<VisionBoardItem>) => {
    setItems((p) => p.map((i) => i.id === id ? { ...i, ...updates } : i));
    await supabase.from("vision_board_items").update(updates).eq("id", id);
  }, [supabase]);

  async function deleteItem(id: string) {
    await supabase.from("vision_board_items").delete().eq("id", id);
    setItems((p) => p.filter((i) => i.id !== id));
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div className="mobile-top-pad" style={{ padding: "16px 24px", borderBottom: "1px solid #F0EBE3", background: "white", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, zIndex: 10, overflowX: "auto", flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "22px", fontWeight: 400, color: "#3D3535", marginRight: "8px" }}>
          Vision Board
        </h1>
        <div style={{ width: "1px", height: "20px", background: "#F0EBE3" }} />
        <button
          onClick={() => setPanel(panel === "text" ? null : "text")}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", border: `1px solid ${panel === "text" ? "#F2C4CE" : "#F0EBE3"}`, background: panel === "text" ? "#FAE8EC" : "white", cursor: "pointer", fontSize: "13px", color: panel === "text" ? "#C0607A" : "#6B5E5E" }}
        >
          <Type size={14} /> Text card
        </button>
        <button
          onClick={() => setPanel(panel === "affirmation" ? null : "affirmation")}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", border: `1px solid ${panel === "affirmation" ? "#F2C4CE" : "#F0EBE3"}`, background: panel === "affirmation" ? "#FAE8EC" : "white", cursor: "pointer", fontSize: "13px", color: panel === "affirmation" ? "#C0607A" : "#6B5E5E" }}
        >
          <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "14px" }}>A</span> Affirmation
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", border: "1px solid #F0EBE3", background: "white", cursor: "pointer", fontSize: "13px", color: "#6B5E5E" }}
        >
          {uploading ? <Upload size={14} style={{ animation: "pop 1s infinite" }} /> : <ImageIcon size={14} />}
          {uploading ? "Uploading…" : "Add image"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />
        <span style={{ marginLeft: "auto", fontSize: "12px", color: "#9B8E8E" }}>
          {items.length} item{items.length !== 1 ? "s" : ""} — drag to rearrange
        </span>
      </div>

      {/* Add panel */}
      {panel && (
        <div style={{ padding: "16px 32px", background: "#FAF7F2", borderBottom: "1px solid #F0EBE3", display: "flex", gap: "12px", alignItems: "flex-start", flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={panel === "affirmation" ? "Write an affirmation…" : "Write your text…"}
              autoFocus
              rows={2}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "10px",
                border: "1.5px solid #EDE5E5", background: "white", fontSize: "14px",
                color: "#3D3535", resize: "none", outline: "none", fontFamily: panel === "affirmation" ? "var(--font-cormorant), Georgia, serif" : "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#F2C4CE")}
              onBlur={(e) => (e.target.style.borderColor = "#EDE5E5")}
            />
            {panel === "affirmation" && (
              <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                {AFFIRMATION_PRESETS.slice(0, 4).map((a) => (
                  <button key={a} onClick={() => setTextInput(a)} style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #F0EBE3", background: "white", fontSize: "11px", color: "#6B5E5E", cursor: "pointer" }}>
                    {a.slice(0, 32)}…
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "4px" }}>
              {BG_COLORS.map((c) => (
                <button key={c} onClick={() => setBgColor(c)} style={{ width: "20px", height: "20px", borderRadius: "50%", background: c, border: `2px solid ${bgColor === c ? "#3D3535" : "#E0D8D8"}`, cursor: "pointer" }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {TEXT_COLORS.map((c) => (
                <button key={c} onClick={() => setTextColor(c)} style={{ width: "20px", height: "20px", borderRadius: "50%", background: c, border: `2px solid ${textColor === c ? "#3D3535" : "#E0D8D8"}`, cursor: "pointer" }} />
              ))}
            </div>
          </div>
          <button
            onClick={() => addTextItem(panel)}
            disabled={!textInput.trim()}
            style={{ padding: "10px 20px", borderRadius: "10px", background: textInput.trim() ? "#3D3535" : "#F0EBE3", color: textInput.trim() ? "white" : "#9B8E8E", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      )}

      {/* Canvas */}
      <div
        style={{
          flex: 1, position: "relative", overflow: "hidden",
          background: "linear-gradient(135deg, #FAF7F2 0%, #F5EEF0 50%, #EEF4EE 100%)",
          backgroundImage: "radial-gradient(circle, rgba(242,196,206,0.15) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
        onClick={() => {}}
      >
        {items.length === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "28px", fontWeight: 300, color: "#C4B8B8", letterSpacing: "0.02em" }}>
              Your vision board is empty
            </p>
            <p style={{ fontSize: "14px", color: "#C4B8B8", marginTop: "8px" }}>Add images, text, and affirmations above</p>
          </div>
        )}
        {items.map((item) => (
          <DraggableItem key={item.id} item={item} onUpdate={updateItem} onDelete={deleteItem} />
        ))}
      </div>
    </div>
  );
}
