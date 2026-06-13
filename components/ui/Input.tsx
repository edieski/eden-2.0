import { cn } from "@/lib/utils";
import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex w-full min-w-0 flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-[500] tracking-[0.07em] uppercase text-[#6B5E5E]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "eden-field w-full min-w-0 px-4 py-3 rounded-xl border text-[14px] text-[#3D3535] placeholder:text-[#C4B8B8] bg-white",
            "border-[#EDE5E5] focus:border-[#F2C4CE] focus:outline-none focus:ring-2 focus:ring-[#F2C4CE]/20",
            "transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-[#E8A0B0] focus:border-[#E8A0B0]",
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="text-[12px] text-[#9B8E8E]">{hint}</p>
        )}
        {error && (
          <p className="text-[12px] text-[#C0607A]">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex w-full min-w-0 flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-[500] tracking-[0.07em] uppercase text-[#6B5E5E]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "eden-field w-full min-w-0 px-4 py-3 rounded-xl border text-[14px] text-[#3D3535] placeholder:text-[#C4B8B8] bg-white resize-none",
            "border-[#EDE5E5] focus:border-[#F2C4CE] focus:outline-none focus:ring-2 focus:ring-[#F2C4CE]/20",
            "transition-all duration-150 disabled:opacity-50",
            error && "border-[#E8A0B0]",
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="text-[12px] text-[#9B8E8E]">{hint}</p>
        )}
        {error && (
          <p className="text-[12px] text-[#C0607A]">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

interface SelectProps {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Select({ label, error, options, value, onChange, placeholder, className }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-[500] tracking-[0.07em] uppercase text-[#6B5E5E]">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full px-4 py-3 rounded-xl border text-[14px] text-[#3D3535] bg-white appearance-none",
          "border-[#EDE5E5] focus:border-[#F2C4CE] focus:outline-none focus:ring-2 focus:ring-[#F2C4CE]/20",
          "transition-all duration-150 cursor-pointer",
          error && "border-[#E8A0B0]",
          className
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-[12px] text-[#C0607A]">{error}</p>}
    </div>
  );
}
