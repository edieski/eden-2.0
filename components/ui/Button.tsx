import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "blush" | "outline";
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<string, string> = {
  primary: "bg-[#3D3535] text-white hover:bg-[#2A2020] active:scale-[0.98]",
  secondary: "bg-[#F2C4CE] text-[#3D3535] hover:bg-[#E8A0B0] active:scale-[0.98]",
  blush: "bg-[#FAE8EC] text-[#C0607A] hover:bg-[#F2C4CE] active:scale-[0.98]",
  ghost: "bg-transparent text-[#6B5E5E] hover:bg-[#F0EBE3] active:scale-[0.98]",
  outline: "bg-transparent text-[#3D3535] border border-[#E0D8D8] hover:border-[#F2C4CE] hover:bg-[#FAF7F2] active:scale-[0.98]",
};

const sizeStyles: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3.5 text-sm rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium tracking-[0.02em] transition-all duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
