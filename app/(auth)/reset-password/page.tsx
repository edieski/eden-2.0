"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

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
              Choose a new password
            </h1>
            <p style={{ color: "#9B8E8E", fontSize: "14px" }}>
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, letterSpacing: "0.06em", color: "#6B5E5E", textTransform: "uppercase", marginBottom: "8px" }}>
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
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

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, letterSpacing: "0.06em", color: "#6B5E5E", textTransform: "uppercase", marginBottom: "8px" }}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
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
                transition: "background 0.2s",
              }}
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>

          <p style={{ marginTop: "32px", textAlign: "center", fontSize: "14px", color: "#9B8E8E" }}>
            Link expired?{" "}
            <Link href="/forgot-password" style={{ color: "#C0607A", textDecoration: "none", fontWeight: 500 }}>
              Request a new one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
