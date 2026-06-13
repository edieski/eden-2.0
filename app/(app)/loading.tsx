export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Animated dots */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #F2C4CE, #C8B8D8)",
              animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
      <p
        style={{
          fontFamily: "var(--font-caveat), 'Caveat', cursive",
          fontSize: "16px",
          color: "#B870A0",
          letterSpacing: "0.04em",
        }}
      >
        just a moment…
      </p>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
