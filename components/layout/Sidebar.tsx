"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  UtensilsCrossed,
  MessageCircle,
  Frame,
  BookOpen,
  Sparkles,
  Home,
  Timer,
  CheckCircle2,
  Receipt,
  CalendarDays,
  HeartHandshake,
  Menu,
  X,
} from "lucide-react";

const navSections = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Planning",
    items: [
      {
        label: "My Plan",
        href: "/plan",
        icon: Target,
        children: [
          { label: "Milestones", href: "/plan/milestones" },
          { label: "Habits", href: "/plan/habits" },
          { label: "Routines", href: "/plan/routines" },
          { label: "Ballet Plan", href: "/plan/ballet" },
        ],
      },
      { label: "Discipline", href: "/discipline", icon: Sparkles },
    ],
  },
  {
    label: "Nourishment",
    items: [
      {
        label: "Food & Nourishment",
        href: "/food",
        icon: UtensilsCrossed,
        children: [
          { label: "Food Diary", href: "/food/diary" },
          { label: "Menu & Grocery", href: "/food/plan" },
          { label: "Meal Planning", href: "/food/meals" },
          { label: "Binge Urge SOS", href: "/sos" },
        ],
      },
    ],
  },
  {
    label: "Daily",
    items: [
      { label: "Talk It Through", href: "/motivate", icon: Sparkles },
      { label: "Calendar", href: "/calendar", icon: CalendarDays },
      { label: "Home & Cleaning", href: "/home", icon: Home },
      { label: "To-Do & Wheel", href: "/todos", icon: CheckCircle2 },
      { label: "Focus Timer", href: "/focus", icon: Timer },
    ],
  },
  {
    label: "Wealth",
    items: [
      { label: "Budget & Finance", href: "/finance", icon: Receipt },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "Notes", href: "/notes", icon: BookOpen },
      { label: "Vision Board", href: "/vision-board", icon: Frame },
    ],
  },
  {
    items: [
      { label: "Binge Urge SOS", href: "/sos", icon: HeartHandshake },
      { label: "Eden — AI", href: "/chat", icon: MessageCircle },
    ],
  },
];

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: { label: string; href: string }[];
};

function NavLink({
  item,
  pathname,
  onClose,
}: {
  item: NavItem;
  pathname: string;
  onClose: () => void;
}) {
  const Icon = item.icon;
  const isActive =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div style={{ marginBottom: "1px" }}>
      <Link
        href={item.href}
        onClick={onClose}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "9px",
          padding: "9px 10px 9px 12px",
          borderRadius: "7px",
          textDecoration: "none",
          color: isActive ? "#A82850" : "#7A4868",
          fontSize: "13px",
          fontWeight: isActive ? 500 : 400,
          letterSpacing: "0.01em",
          transition: "color 0.15s, background 0.15s",
          position: "relative",
          background: isActive ? "rgba(255,255,255,0.55)" : "transparent",
          borderLeft: isActive ? "2px solid #D4789A" : "2px solid transparent",
          boxShadow: isActive ? "0 1px 6px rgba(180,60,100,0.12)" : "none",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.color = "#281A24";
            e.currentTarget.style.background = "rgba(255,255,255,0.35)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.color = "#7A4868";
            e.currentTarget.style.background = "transparent";
          }
        }}
      >
        <Icon
          size={14}
          strokeWidth={isActive ? 1.75 : 1.5}
          style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}
        />
        <span style={{ flex: 1 }}>{item.label}</span>
      </Link>

      {hasChildren && isActive && (
        <div style={{ paddingLeft: "14px", marginTop: "1px", marginBottom: "2px" }}>
          {item.children!.map((child) => {
            const isChildActive = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "7px 10px 7px 10px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  color: isChildActive ? "#A82850" : "#9A5878",
                  fontSize: "12.5px",
                  fontWeight: isChildActive ? 500 : 400,
                  transition: "color 0.15s, background 0.15s",
                  background: isChildActive ? "rgba(255,255,255,0.45)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isChildActive) {
                    e.currentTarget.style.color = "#281A24";
                    e.currentTarget.style.background = "rgba(255,255,255,0.28)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isChildActive) {
                    e.currentTarget.style.color = "#9A5878";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <span
                  style={{
                    width: "3px",
                    height: "3px",
                    borderRadius: "50%",
                    background: isChildActive ? "#C9849A" : "#C8C0C0",
                    flexShrink: 0,
                    marginLeft: "2px",
                  }}
                />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <>
      {/* Hamburger button — mobile only, rendered via CSS class */}
      <button
        className="mobile-hamburger"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu size={18} color="#7A4868" strokeWidth={2} />
      </button>

      {/* Overlay — appears behind open sidebar on mobile */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={close} aria-hidden="true" />
      )}

      {/* Sidebar / drawer */}
      <aside
        className={`sidebar-drawer${mobileOpen ? " sidebar-open" : ""}`}
        style={{
          background: "linear-gradient(180deg, #F7E0EC 0%, #F0D4E4 100%)",
          borderRight: "1px solid #E0C0D0",
          display: "flex",
          flexDirection: "column",
          boxShadow: "2px 0 16px rgba(180,60,100,0.08)",
        }}
      >
        {/* Logo + mobile close */}
        <div
          style={{
            padding: "22px 20px 18px",
            borderBottom: "1px solid #E0C0D0",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <span
                style={{
                  fontFamily: "var(--font-cormorant), Georgia, serif",
                  fontSize: "30px",
                  fontWeight: 400,
                  letterSpacing: "0.12em",
                  color: "#281A24",
                  display: "block",
                  lineHeight: 1,
                }}
              >
                Eden
              </span>
              <p
                style={{
                  fontFamily: "var(--font-caveat), 'Caveat', cursive",
                  fontSize: "14px",
                  color: "#B0809A",
                  marginTop: "3px",
                  letterSpacing: "0.02em",
                }}
              >
                your life, your way
              </p>
            </div>
            {/* Close button — visible on mobile only via CSS */}
            <button
              className="mobile-close-btn"
              onClick={close}
              aria-label="Close navigation menu"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {navSections.map((section, si) => (
            <div
              key={si}
              style={{ marginBottom: si < navSections.length - 1 ? "18px" : "0" }}
            >
              {section.label && (
                <p
                  style={{
                    fontFamily: "var(--font-caveat), 'Caveat', cursive",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#B890A8",
                    padding: "0 12px",
                    marginBottom: "2px",
                  }}
                >
                  {section.label}
                </p>
              )}
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} onClose={close} />
              ))}
            </div>
          ))}
        </nav>

        {/* Profile */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid #E0C0D0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "9px 12px",
              borderRadius: "7px",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.3)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #EAA8C0, #C8A8DC)",
                flexShrink: 0,
                boxShadow: "0 1px 4px rgba(70,40,30,0.15)",
              }}
            />
            <p
              style={{
                fontSize: "12.5px",
                fontWeight: 400,
                color: "#7A4868",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              My Account
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
