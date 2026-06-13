"use client";

import { useState, useEffect, useRef } from "react";
import { Send, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ChibiCharacter from "@/components/features/ChibiCharacter";
import type { ChatMessage } from "@/types";

export default function ChatPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { loadHistory(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);

  async function loadHistory() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("chat_messages").select("*").eq("user_id", user.id).order("created_at", { ascending: true }).limit(60);
    setMessages(data ?? []);
    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    const text = input.trim();
    setInput("");
    setStreaming(true);
    setStreamingText("");

    const userMsg: ChatMessage = { id: crypto.randomUUID(), user_id: "", role: "user", content: text, created_at: new Date().toISOString() };
    setMessages((p) => [...p, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) throw new Error("Failed to send");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const { text: t } = JSON.parse(data);
              full += t;
              setStreamingText(full);
            } catch { /* skip */ }
          }
        }
      }

      const assistantMsg: ChatMessage = { id: crypto.randomUUID(), user_id: "", role: "assistant", content: full, created_at: new Date().toISOString() };
      setMessages((p) => [...p, assistantMsg]);
      setStreamingText("");
    } catch {
      setMessages((p) => [...p, { id: crypto.randomUUID(), user_id: "", role: "assistant", content: "Something went wrong. Please try again.", created_at: new Date().toISOString() }]);
    } finally {
      setStreaming(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const PROMPTS = [
    "I'm feeling overwhelmed today",
    "Help me with a habit I keep avoiding",
    "I need a grounding exercise",
    "Let's talk about my values",
    "I'm struggling with task initiation",
  ];

  return (
    <div className="mobile-top-pad" style={{ height: "100vh", display: "flex", flexDirection: "column", maxWidth: "760px", margin: "0 auto", padding: "0 24px" }}>
      {/* Header */}
      <div style={{ padding: "32px 0 20px", borderBottom: "1px solid #F0EBE3", display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
        <ChibiCharacter mood="happy" outfit="default" size={56} animate={false} />
        <div>
          <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "26px", fontWeight: 400, color: "#3D3535" }}>
            Eden
          </h1>
          <p style={{ fontSize: "12px", color: "#9B8E8E", marginTop: "2px" }}>
            Your companion — DBT & ACT informed, always here
          </p>
        </div>
        <button
          onClick={loadHistory}
          style={{ marginLeft: "auto", border: "1px solid #F0EBE3", borderRadius: "8px", padding: "6px 8px", background: "white", cursor: "pointer", display: "flex" }}
          title="Refresh"
        >
          <RefreshCw size={14} color="#9B8E8E" />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0", display: "flex", flexDirection: "column", gap: "16px" }}>
        {loading && <p style={{ color: "#9B8E8E", fontSize: "14px", textAlign: "center" }}>Loading…</p>}

        {!loading && messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", marginTop: "40px" }}>
            <ChibiCharacter mood="happy" outfit="default" size={100} animate />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "22px", color: "#3D3535", marginBottom: "6px" }}>
                Hello, I&apos;m Eden
              </p>
              <p style={{ fontSize: "14px", color: "#9B8E8E", maxWidth: "360px", lineHeight: 1.6 }}>
                I&apos;m here to support your journey — whatever you&apos;re feeling, working through, or just want to talk about.
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", maxWidth: "480px" }}>
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setInput(p); textareaRef.current?.focus(); }}
                  style={{
                    padding: "8px 16px", borderRadius: "99px", border: "1px solid #F0EBE3",
                    background: "white", cursor: "pointer", fontSize: "13px", color: "#6B5E5E",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F2C4CE"; e.currentTarget.style.background = "#FAE8EC"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#F0EBE3"; e.currentTarget.style.background = "white"; }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "assistant" && (
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #F2C4CE, #C8B8D8)", flexShrink: 0, marginRight: "10px", marginTop: "2px" }} />
            )}
            <div
              style={{
                maxWidth: "72%",
                padding: msg.role === "user" ? "12px 16px" : "14px 18px",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
                background: msg.role === "user" ? "#3D3535" : "white",
                color: msg.role === "user" ? "white" : "#3D3535",
                fontSize: "14px",
                lineHeight: 1.65,
                border: msg.role === "assistant" ? "1px solid #F0EBE3" : "none",
                boxShadow: msg.role === "assistant" ? "0 2px 12px rgba(180,150,140,0.08)" : "none",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming */}
        {streaming && streamingText && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #F2C4CE, #C8B8D8)", flexShrink: 0, marginRight: "10px", marginTop: "2px" }} />
            <div style={{ maxWidth: "72%", padding: "14px 18px", borderRadius: "4px 18px 18px 18px", background: "white", color: "#3D3535", fontSize: "14px", lineHeight: 1.65, border: "1px solid #F0EBE3", boxShadow: "0 2px 12px rgba(180,150,140,0.08)", whiteSpace: "pre-wrap" }}>
              {streamingText}
              <span style={{ display: "inline-block", width: "2px", height: "14px", background: "#F2C4CE", marginLeft: "2px", animation: "pop 1s ease-in-out infinite", verticalAlign: "middle" }} />
            </div>
          </div>
        )}

        {streaming && !streamingText && (
          <div style={{ display: "flex", gap: "6px", paddingLeft: "38px" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#F2C4CE", animation: `pop 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "16px 0 28px", borderTop: "1px solid #F0EBE3", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`; }}
            onKeyDown={handleKey}
            placeholder="Talk to Eden…"
            rows={1}
            style={{
              flex: 1, padding: "13px 16px", borderRadius: "16px",
              border: "1.5px solid #EDE5E5", background: "white",
              fontSize: "14px", color: "#3D3535", resize: "none",
              outline: "none", lineHeight: 1.5, fontFamily: "inherit",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#F2C4CE")}
            onBlur={(e) => (e.target.style.borderColor = "#EDE5E5")}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            style={{
              width: "44px", height: "44px", borderRadius: "14px",
              background: input.trim() && !streaming ? "#3D3535" : "#F0EBE3",
              border: "none", cursor: input.trim() && !streaming ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s", flexShrink: 0,
            }}
          >
            <Send size={16} color={input.trim() && !streaming ? "white" : "#9B8E8E"} />
          </button>
        </div>
        <p style={{ fontSize: "11px", color: "#B5A8A8", marginTop: "8px", textAlign: "center", letterSpacing: "0.02em" }}>
          Eden is a supportive companion, not a therapist. For crisis support, please reach out to a professional.
        </p>
      </div>
    </div>
  );
}
