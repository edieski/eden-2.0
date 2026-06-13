"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  Trash2,
  CalendarDays,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  color: string;
}

const EVENT_COLORS: { key: string; label: string; bg: string; text: string; border: string }[] = [
  { key: "pink",   label: "Rose",    bg: "#FAE8EC", text: "#C0607A", border: "#F2C4CE" },
  { key: "purple", label: "Lavender",bg: "#EDE5F5", text: "#8B72B0", border: "#DDD0F0" },
  { key: "green",  label: "Sage",    bg: "#D8E4D6", text: "#4A6847", border: "#B8D0B4" },
  { key: "peach",  label: "Peach",   bg: "#F5E4D4", text: "#8A5030", border: "#E8C8A8" },
  { key: "blue",   label: "Mist",    bg: "#D8E8F0", text: "#3A6878", border: "#A8C8D8" },
  { key: "cream",  label: "Cream",   bg: "#F0EBE3", text: "#7A6B5A", border: "#D8CFC4" },
];

function getColor(key: string) {
  return EVENT_COLORS.find((c) => c.key === key) ?? EVENT_COLORS[0];
}

// ─── Add/Edit Event Modal ─────────────────────────────────────────────────────
function EventModal({
  date,
  event,
  onClose,
  onSave,
  onDelete,
}: {
  date: Date;
  event: CalendarEvent | null;
  onClose: () => void;
  onSave: (data: Omit<CalendarEvent, "id">) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [allDay, setAllDay] = useState(event?.all_day ?? true);
  const [startTime, setStartTime] = useState(event?.start_time ?? "");
  const [endTime, setEndTime] = useState(event?.end_time ?? "");
  const [color, setColor] = useState(event?.color ?? "pink");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      event_date: format(date, "yyyy-MM-dd"),
      start_time: allDay ? null : startTime || null,
      end_time: allDay ? null : endTime || null,
      all_day: allDay,
      color,
    });
    setSaving(false);
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(61,53,53,0.22)",
          backdropFilter: "blur(2px)",
          zIndex: 50,
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "white",
          borderRadius: "22px",
          boxShadow: "0 20px 60px rgba(61,53,53,0.15)",
          zIndex: 51,
          width: "min(480px, 92vw)",
          padding: "28px",
          animation: "slide-up 0.25s ease-out",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "22px" }}>
          <div>
            <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "4px" }}>
              {event ? "Edit event" : "New event"}
            </p>
            <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "22px", fontWeight: 400, color: "#3D3535" }}>
              {format(date, "MMMM d, yyyy")}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ padding: "6px", border: "1px solid #F0EBE3", borderRadius: "10px", background: "white", cursor: "pointer", display: "flex" }}
          >
            <X size={14} color="#9B8E8E" />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Title */}
          <Input
            placeholder="Event title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes (optional)…"
            rows={2}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "12px",
              border: "1.5px solid #EDE5E5",
              background: "white",
              fontSize: "13px",
              color: "#3D3535",
              resize: "none",
              outline: "none",
              lineHeight: 1.5,
              fontFamily: "inherit",
              transition: "border-color 0.2s",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#F2C4CE")}
            onBlur={(e) => (e.target.style.borderColor = "#EDE5E5")}
          />

          {/* All day toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setAllDay(!allDay)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "7px 14px", borderRadius: "99px",
                border: `1.5px solid ${allDay ? "#F2C4CE" : "#EDE5E5"}`,
                background: allDay ? "#FAE8EC" : "transparent",
                color: allDay ? "#C0607A" : "#9B8E8E",
                fontSize: "12.5px", fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              <CalendarDays size={13} />
              All day
            </button>

            {!allDay && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                <Clock size={13} color="#9B8E8E" style={{ flexShrink: 0 }} />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={{
                    flex: 1, padding: "7px 10px", borderRadius: "10px",
                    border: "1.5px solid #EDE5E5", fontSize: "12.5px",
                    color: "#3D3535", outline: "none", fontFamily: "inherit",
                    background: "white", transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#F2C4CE")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#EDE5E5")}
                />
                <span style={{ fontSize: "12px", color: "#9B8E8E" }}>–</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={{
                    flex: 1, padding: "7px 10px", borderRadius: "10px",
                    border: "1.5px solid #EDE5E5", fontSize: "12.5px",
                    color: "#3D3535", outline: "none", fontFamily: "inherit",
                    background: "white", transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#F2C4CE")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#EDE5E5")}
                />
              </div>
            )}
          </div>

          {/* Color picker */}
          <div>
            <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#B5A8A8", marginBottom: "8px" }}>
              Colour
            </p>
            <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setColor(c.key)}
                  title={c.label}
                  style={{
                    width: "30px", height: "30px", borderRadius: "50%",
                    background: c.bg,
                    border: `2.5px solid ${color === c.key ? c.text : "transparent"}`,
                    cursor: "pointer", transition: "border-color 0.15s",
                    boxShadow: color === c.key ? `0 0 0 2px ${c.border}` : "none",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "space-between", alignItems: "center" }}>
          {event && onDelete ? (
            <button
              onClick={() => onDelete(event.id)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 14px", borderRadius: "10px",
                border: "1.5px solid #F2C4CE", background: "white",
                color: "#C0607A", fontSize: "12.5px", cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#FAE8EC"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
            >
              <Trash2 size={13} /> Delete
            </button>
          ) : (
            <div />
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 18px", borderRadius: "12px",
                border: "1.5px solid #F0EBE3", background: "white",
                color: "#9B8E8E", fontSize: "13px", cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F8F4F0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
            >
              Cancel
            </button>
            <Button onClick={handleSave} disabled={!title.trim() || saving} size="md">
              {saving ? "Saving…" : event ? "Save" : "Add event"}
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 12px)); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </>
  );
}

// ─── Day Detail Panel ─────────────────────────────────────────────────────────
function DayPanel({
  date,
  events,
  onClose,
  onAdd,
  onEdit,
}: {
  date: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onAdd: (date: Date) => void;
  onEdit: (event: CalendarEvent, date: Date) => void;
}) {
  const sorted = [...events].sort((a, b) => {
    if (a.all_day && !b.all_day) return -1;
    if (!a.all_day && b.all_day) return 1;
    return (a.start_time ?? "").localeCompare(b.start_time ?? "");
  });

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "white", borderRadius: "20px",
          boxShadow: "0 16px 50px rgba(61,53,53,0.14)",
          zIndex: 45, width: "min(380px, 92vw)",
          maxHeight: "70vh", display: "flex", flexDirection: "column",
          animation: "pop 0.2s ease-out",
        }}
      >
        <div style={{ padding: "20px 22px 16px", borderBottom: "1px solid #F0EBE3", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "20px", fontWeight: 400, color: "#3D3535" }}>
              {format(date, "EEEE")}
            </p>
            <p style={{ fontSize: "12px", color: "#9B8E8E", marginTop: "1px" }}>
              {format(date, "MMMM d, yyyy")}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => onAdd(date)}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "7px 13px", borderRadius: "10px",
                border: "1.5px solid #F2C4CE", background: "#FAE8EC",
                color: "#C0607A", fontSize: "12px", fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Plus size={13} /> Add
            </button>
            <button
              onClick={onClose}
              style={{ padding: "6px", border: "1px solid #F0EBE3", borderRadius: "9px", background: "white", cursor: "pointer", display: "flex" }}
            >
              <X size={14} color="#9B8E8E" />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 22px 20px" }}>
          {sorted.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <p style={{ fontSize: "13px", color: "#B5A8A8" }}>No events — tap Add to create one.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {sorted.map((ev) => {
                const c = getColor(ev.color);
                return (
                  <div
                    key={ev.id}
                    onClick={() => onEdit(ev, date)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "12px",
                      padding: "12px 14px", borderRadius: "14px",
                      background: c.bg, border: `1px solid ${c.border}`,
                      cursor: "pointer", transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.8"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  >
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: c.text, flexShrink: 0, marginTop: "5px" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "14px", fontWeight: 500, color: "#3D3535", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.title}
                      </p>
                      {!ev.all_day && ev.start_time && (
                        <p style={{ fontSize: "12px", color: "#9B8E8E", marginTop: "2px" }}>
                          {ev.start_time.slice(0, 5)}{ev.end_time ? ` – ${ev.end_time.slice(0, 5)}` : ""}
                        </p>
                      )}
                      {ev.description && (
                        <p style={{ fontSize: "12px", color: "#9B8E8E", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ev.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pop {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 8px)) scale(0.97); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}

// ─── Calendar Page ────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const supabase = createClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [addingToDate, setAddingToDate] = useState<Date | null>(null);

  useEffect(() => {
    loadEvents();
  }, [currentMonth]);

  async function loadEvents() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const from = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const to = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const { data } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id)
      .gte("event_date", from)
      .lte("event_date", to)
      .order("event_date", { ascending: true });
    setEvents(data ?? []);
    setLoading(false);
  }

  async function saveEvent(data: Omit<CalendarEvent, "id">) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editEvent) {
      const { data: updated } = await supabase
        .from("calendar_events")
        .update(data)
        .eq("id", editEvent.id)
        .select()
        .single();
      if (updated) setEvents((prev) => prev.map((e) => (e.id === editEvent.id ? updated : e)));
    } else {
      const { data: inserted } = await supabase
        .from("calendar_events")
        .insert({ ...data, user_id: user.id })
        .select()
        .single();
      if (inserted) setEvents((prev) => [...prev, inserted]);
    }

    setAddingToDate(null);
    setEditEvent(null);
  }

  async function deleteEvent(id: string) {
    await supabase.from("calendar_events").delete().eq("id", id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setEditEvent(null);
    setAddingToDate(null);
  }

  function eventsForDay(day: Date) {
    const key = format(day, "yyyy-MM-dd");
    return events.filter((e) => e.event_date === key);
  }

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const modalDate = addingToDate ?? (editEvent ? parseISO(editEvent.event_date) : null);

  return (
    <div className="page-padding" style={{ maxWidth: "1100px" }}>
      {/* Page header */}
      <div style={{ marginBottom: "32px" }}>
        <p style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "8px" }}>
          Schedule
        </p>
        <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "40px", fontWeight: 400, color: "#3D3535" }}>
          Calendar
        </h1>
        <p style={{ color: "#9B8E8E", fontSize: "14px", marginTop: "6px" }}>
          Plan your days, track your events.
        </p>
      </div>

      <div className="calendar-scroll-wrapper">
      <Card padding="none" style={{ overflow: "hidden", minWidth: "560px" }}>
        {/* Month nav */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px",
          borderBottom: "1px solid #F0EBE3",
          background: "linear-gradient(135deg, #FAF6F8 0%, #F5EFF2 100%)",
        }}>
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            style={{
              width: "34px", height: "34px", borderRadius: "10px",
              border: "1.5px solid #EDE5E5", background: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F2C4CE"; e.currentTarget.style.background = "#FAE8EC"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#EDE5E5"; e.currentTarget.style.background = "white"; }}
          >
            <ChevronLeft size={16} color="#7A6868" />
          </button>

          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "26px", fontWeight: 400, color: "#3D3535", lineHeight: 1 }}>
              {format(currentMonth, "MMMM")}
            </p>
            <p style={{ fontSize: "12px", color: "#B5A8A8", marginTop: "2px" }}>
              {format(currentMonth, "yyyy")}
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => setCurrentMonth(new Date())}
              style={{
                padding: "7px 13px", borderRadius: "10px",
                border: "1.5px solid #EDE5E5", background: "white",
                color: "#9B8E8E", fontSize: "12px", cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F2C4CE"; e.currentTarget.style.color = "#C0607A"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#EDE5E5"; e.currentTarget.style.color = "#9B8E8E"; }}
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              style={{
                width: "34px", height: "34px", borderRadius: "10px",
                border: "1.5px solid #EDE5E5", background: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F2C4CE"; e.currentTarget.style.background = "#FAE8EC"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#EDE5E5"; e.currentTarget.style.background = "white"; }}
            >
              <ChevronRight size={16} color="#7A6868" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
          borderBottom: "1px solid #F0EBE3",
          background: "#FAF6F8",
        }}>
          {weekdays.map((d) => (
            <div
              key={d}
              style={{
                textAlign: "center", padding: "10px 4px",
                fontSize: "11px", fontWeight: 600,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "#B5A8A8",
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#B5A8A8", fontSize: "14px" }}>
            Loading…
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {days.map((day, idx) => {
              const dayEvents = eventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDay = isToday(day);
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDay(isSameDay(day, selectedDay ?? new Date(-1)) ? null : day);
                  }}
                  style={{
                    minHeight: "100px",
                    padding: "8px 8px 6px",
                    borderRight: (idx + 1) % 7 === 0 ? "none" : "1px solid #F0EBE3",
                    borderBottom: idx < days.length - 7 ? "1px solid #F0EBE3" : "none",
                    background: isSelected
                      ? "#FFF0F4"
                      : isTodayDay
                      ? "#FFF8FA"
                      : isWeekend && isCurrentMonth
                      ? "#FAF8F8"
                      : "white",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    opacity: isCurrentMonth ? 1 : 0.38,
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#FFF5F7";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = isSelected
                      ? "#FFF0F4"
                      : isTodayDay
                      ? "#FFF8FA"
                      : isWeekend && isCurrentMonth
                      ? "#FAF8F8"
                      : "white";
                  }}
                >
                  {/* Day number */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: isTodayDay ? 600 : 400,
                        color: isTodayDay ? "white" : isCurrentMonth ? "#3D3535" : "#C4B8B8",
                        width: "24px", height: "24px",
                        borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isTodayDay ? "#C0607A" : "transparent",
                        flexShrink: 0,
                      }}
                    >
                      {format(day, "d")}
                    </span>
                    {dayEvents.length === 0 && isCurrentMonth && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setAddingToDate(day); setEditEvent(null); setSelectedDay(null); }}
                        style={{
                          width: "20px", height: "20px", borderRadius: "6px",
                          border: "1.5px solid #EDE5E5", background: "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", opacity: 0, transition: "opacity 0.15s",
                          flexShrink: 0,
                        }}
                        className="add-btn"
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F2C4CE"; e.currentTarget.style.background = "#FAE8EC"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#EDE5E5"; e.currentTarget.style.background = "white"; }}
                      >
                        <Plus size={11} color="#C0607A" />
                      </button>
                    )}
                  </div>

                  {/* Event chips */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    {dayEvents.slice(0, 3).map((ev) => {
                      const c = getColor(ev.color);
                      return (
                        <div
                          key={ev.id}
                          style={{
                            fontSize: "11px",
                            fontWeight: 500,
                            padding: "2px 6px",
                            borderRadius: "5px",
                            background: c.bg,
                            color: c.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            lineHeight: 1.4,
                          }}
                        >
                          {!ev.all_day && ev.start_time && (
                            <span style={{ opacity: 0.75, marginRight: "3px" }}>
                              {ev.start_time.slice(0, 5)}
                            </span>
                          )}
                          {ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span style={{ fontSize: "10.5px", color: "#9B8E8E", paddingLeft: "6px" }}>
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      </div>

      {/* Color legend */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "18px" }}>
        {EVENT_COLORS.map((c) => (
          <div key={c.key} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: c.bg, border: `1.5px solid ${c.border}` }} />
            <span style={{ fontSize: "11.5px", color: "#9B8E8E" }}>{c.label}</span>
          </div>
        ))}
      </div>

      {/* Day detail panel */}
      {selectedDay && !addingToDate && !editEvent && (
        <DayPanel
          date={selectedDay}
          events={eventsForDay(selectedDay)}
          onClose={() => setSelectedDay(null)}
          onAdd={(d) => { setAddingToDate(d); setEditEvent(null); setSelectedDay(null); }}
          onEdit={(ev, d) => { setEditEvent(ev); setAddingToDate(d); setSelectedDay(null); }}
        />
      )}

      {/* Add / Edit modal */}
      {modalDate && (
        <EventModal
          date={modalDate}
          event={editEvent}
          onClose={() => { setAddingToDate(null); setEditEvent(null); }}
          onSave={saveEvent}
          onDelete={editEvent ? deleteEvent : undefined}
        />
      )}

      <style>{`
        div:hover .add-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
