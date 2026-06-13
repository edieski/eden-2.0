"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex">
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
        </div>
        <div />
      </div>

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
              Reset your password
            </h1>
            <p style={{ color: "#9B8E8E", fontSize: "14px" }}>
              {sent
                ? "Check your inbox for a reset link."
                : "Enter your email and we'll send you a link to choose a new password."}
            </p>
          </div>

          {sent ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ fontSize: "14px", color: "#6B5E5E", lineHeight: 1.6 }}>
                If an account exists for <strong style={{ color: "#3D3535" }}>{email}</strong>, you&apos;ll receive an email shortly.
              </p>
              <Link
                href="/login"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "14px",
                  borderRadius: "12px",
                  background: "#3D3535",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  textDecoration: "none",
                }}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          {!sent && (
            <p style={{ marginTop: "32px", textAlign: "center", fontSize: "14px", color: "#9B8E8E" }}>
              Remember your password?{" "}
              <Link href="/login" style={{ color: "#C0607A", textDecoration: "none", fontWeight: 500 }}>
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
