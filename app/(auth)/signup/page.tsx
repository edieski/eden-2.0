"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/onboarding");
      router.refresh();
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1.5px solid #F0EBE3",
    background: "white",
    fontSize: "15px",
    color: "#3D3535",
    outline: "none",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 500,
    letterSpacing: "0.06em",
    color: "#6B5E5E",
    textTransform: "uppercase",
    marginBottom: "8px",
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex">
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16"
        style={{ background: "linear-gradient(160deg, #EDE5F5 0%, #F2C4CE 40%, #FAE8EC 70%, #D8E4D6 100%)" }}
      >
        <span style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "28px", fontWeight: 400, letterSpacing: "0.08em", color: "#3D3535" }}>
          Eden
        </span>
        <div>
          <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "52px", fontWeight: 300, lineHeight: 1.1, color: "#3D3535" }}>
            Your journey<br />
            <em>starts here.</em>
          </p>
          <p style={{ marginTop: "24px", color: "#6B5E5E", fontSize: "15px", lineHeight: 1.7, maxWidth: "380px" }}>
            Build the habits, clarity, and discipline that transform your life — one intentional day at a time.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", maxWidth: "300px" }}>
          {[
            { label: "Habit Tracking", sub: "Build discipline" },
            { label: "AI Companion", sub: "DBT & ACT guided" },
            { label: "Vision Board", sub: "Manifest your goals" },
            { label: "Chibi Mini-me", sub: "Your progress pal" },
          ].map((f) => (
            <div key={f.label} style={{ background: "rgba(255,255,255,0.45)", borderRadius: "12px", padding: "14px", border: "1px solid rgba(255,255,255,0.6)" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#3D3535" }}>{f.label}</p>
              <p style={{ fontSize: "12px", color: "#6B5E5E", marginTop: "2px" }}>{f.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <div style={{ marginBottom: "48px" }}>
            <p
              className="lg:hidden"
              style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "24px", fontWeight: 400, letterSpacing: "0.06em", color: "#3D3535", marginBottom: "24px" }}
            >
              Eden
            </p>
            <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "36px", fontWeight: 400, color: "#3D3535", marginBottom: "8px" }}>
              Create your space
            </h1>
            <p style={{ color: "#9B8E8E", fontSize: "14px" }}>
              Free forever. No credit card needed.
            </p>
          </div>

          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="First name"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#F2C4CE")}
                onBlur={(e) => (e.target.style.borderColor = "#F0EBE3")}
              />
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@email.com"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#F2C4CE")}
                onBlur={(e) => (e.target.style.borderColor = "#F0EBE3")}
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 8 characters"
                minLength={8}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#F2C4CE")}
                onBlur={(e) => (e.target.style.borderColor = "#F0EBE3")}
              />
            </div>

            {error && (
              <p style={{ fontSize: "13px", color: "#C0607A", background: "#FAE8EC", padding: "10px 14px", borderRadius: "8px" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "8px",
                padding: "14px",
                borderRadius: "12px",
                background: loading ? "#F0EBE3" : "#3D3535",
                color: loading ? "#9B8E8E" : "white",
                fontSize: "14px",
                fontWeight: 500,
                letterSpacing: "0.04em",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget.style.background = "#2A2020"); }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget.style.background = "#3D3535"); }}
            >
              {loading ? "Creating your space..." : "Begin your transformation"}
            </button>
          </form>

          <p style={{ marginTop: "32px", textAlign: "center", fontSize: "14px", color: "#9B8E8E" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#C0607A", textDecoration: "none", fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
