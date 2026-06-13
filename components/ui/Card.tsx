import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "white" | "cream" | "blush" | "sage";
  padding?: "none" | "sm" | "md" | "lg";
  onClick?: () => void;
  hoverable?: boolean;
  style?: React.CSSProperties;
}

const variantStyles: Record<string, string> = {
  white: [
    "border border-[rgba(200,100,140,0.18)]",
    "shadow-[0_1px_4px_rgba(180,60,100,0.07),0_8px_28px_rgba(180,60,100,0.12),inset_0_1px_0_rgba(255,255,255,0.95)]",
  ].join(" "),
  cream: [
    "border border-[rgba(200,100,140,0.14)]",
    "shadow-[0_1px_3px_rgba(180,60,100,0.05),0_4px_16px_rgba(180,60,100,0.09)]",
  ].join(" "),
  blush: "border border-[rgba(200,100,140,0.28)] shadow-[0_2px_12px_rgba(180,60,100,0.10)]",
  sage: "bg-[#D8E4D6] border border-[rgba(100,150,100,0.25)] shadow-[0_2px_12px_rgba(80,120,80,0.08)]",
};

const variantBg: Record<string, string> = {
  white: "linear-gradient(160deg, #ffffff 0%, #fff5f8 100%)",
  cream: "linear-gradient(160deg, #fdf5f8 0%, #f8e8f0 100%)",
  blush: "linear-gradient(160deg, #fae8ec 0%, #f5d8e4 100%)",
  sage: "",
};

const paddingStyles: Record<string, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({
  children,
  className,
  variant = "white",
  padding = "md",
  onClick,
  hoverable,
  style,
}: CardProps) {
  const bg = variantBg[variant];
  return (
    <div
      onClick={onClick}
      style={bg ? { backgroundImage: bg, ...style } : style}
      className={cn(
        "rounded-[18px]",
        variantStyles[variant],
        paddingStyles[padding],
        hoverable && "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(180,60,100,0.09),0_16px_40px_rgba(180,60,100,0.16),inset_0_1px_0_rgba(255,255,255,0.95)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <h2
      className={cn("text-[22px] font-[400] tracking-[0.01em]", className)}
      style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "#281A24", ...style }}
    >
      {children}
    </h2>
  );
}
