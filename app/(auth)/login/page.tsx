"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex">
      {/* Left — decorative panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16"
        style={{ background: "linear-gradient(160deg, #F2C4CE 0%, #FAE8EC 40%, #EDE5F5 70%, #D8E4D6 100%)" }}
      >
        <div>
          <span
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "28px", fontWeight: 400, letterSpacing: "0.08em", color: "#3D3535" }}
          >
            Eden
          </span>
        </div>
        <div>
          <p
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "52px", fontWeight: 300, lineHeight: 1.1, color: "#3D3535", letterSpacing: "-0.01em" }}
          >
            Every day is a<br />
            <em>new beginning.</em>
          </p>
          <p style={{ marginTop: "24px", color: "#6B5E5E", fontSize: "15px", lineHeight: 1.7, maxWidth: "380px" }}>
            Your personal space for growth, discipline, and becoming the most beautiful version of yourself — inside and out.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {["Health", "Mind", "Home", "Purpose"].map((p) => (
            <span
              key={p}
              style={{
                padding: "4px 14px",
                borderRadius: "99px",
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "0.05em",
                background: "rgba(255,255,255,0.5)",
                color: "#3D3535",
                border: "1px solid rgba(255,255,255,0.6)",
              }}
            >
              {p}
            </span>
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
            <h1
              style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "36px", fontWeight: 400, color: "#3D3535", marginBottom: "8px" }}
            >
              Welcome back
            </h1>
            <p style={{ color: "#9B8E8E", fontSize: "14px" }}>
              Sign in to continue your transformation.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, letterSpacing: "0.06em", color: "#6B5E5E", textTransform: "uppercase", marginBottom: "8px" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@email.com"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1.5px solid #F0EBE3",
                  background: "white",
                  fontSize: "15px",
                  color: "#3D3535",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#F2C4CE")}
                onBlur={(e) => (e.target.style.borderColor = "#F0EBE3")}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, letterSpacing: "0.06em", color: "#6B5E5E", textTransform: "uppercase", marginBottom: "8px" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1.5px solid #F0EBE3",
                  background: "white",
                  fontSize: "15px",
                  color: "#3D3535",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
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
                transition: "background 0.2s, transform 0.1s",
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget.style.background = "#2A2020"); }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget.style.background = "#3D3535"); }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p style={{ marginTop: "32px", textAlign: "center", fontSize: "14px", color: "#9B8E8E" }}>
            New here?{" "}
            <Link href="/signup" style={{ color: "#C0607A", textDecoration: "none", fontWeight: 500 }}>
              Create your account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
