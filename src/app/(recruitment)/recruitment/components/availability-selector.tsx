"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { AvailabilityRange } from "@/recruitment/lib/catalog";
import { calendarDateRange, calendarMonthDates, moveCalendarDate } from "@/recruitment/lib/availability-calendar";
import { Icon } from "./ui";

const dateLabel = new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", dateStyle: "full" });
const monthLabel = new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", month: "long", year: "numeric" });
const timeLabel = new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", hour: "numeric", minute: "2-digit" });
const timeOptions = Array.from({ length: 61 }, (_, index) => {
  const hour = String(7 + Math.floor(index / 4)).padStart(2, "0");
  const minute = String(index % 4 * 15).padStart(2, "0");
  return `${hour}:${minute}`;
});
function displayTime(time: string) {
  return timeLabel.format(new Date(`2000-01-01T${time}:00Z`));
}

type Gesture = { date: string; endDate: string; x: number; y: number; dragging: boolean; timer: ReturnType<typeof setTimeout> };

export function AvailabilitySelector({ value, onChange, optional = false, disabled = false, error }: {
  value: AvailabilityRange;
  onChange: (value: AvailabilityRange) => void;
  optional?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  const firstDate = value.startDate >= today ? value.startDate : today;
  const [month, setMonth] = useState(() => firstDate.slice(0, 7));
  const [focusedDate, setFocusedDate] = useState(firstDate);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ startDate: string; endDate: string } | null>(null);
  const calendar = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const focusPending = useRef(false);
  const dates = calendarMonthDates(month);
  const selected = preview || value;
  const describedBy = `availabilityDays-hint${error ? " availabilityDays-error" : ""}`;

  useEffect(() => () => { if (gesture.current) clearTimeout(gesture.current.timer); }, []);
  useEffect(() => {
    if (!focusPending.current) return;
    calendar.current?.querySelector<HTMLButtonElement>(`[data-date="${focusedDate}"]`)?.focus({ preventScroll: true });
    focusPending.current = false;
  }, [focusedDate, month]);

  function selectDate(date: string) {
    if (suppressClick.current) { suppressClick.current = false; return; }
    onChange({ ...value, ...calendarDateRange(anchor || date, date) });
    setAnchor(anchor ? null : date);
    setPreview(null);
    setFocusedDate(date);
  }
  function changeMonth(direction: number) {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + direction);
    const next = date.toISOString().slice(0, 10);
    setMonth(next.slice(0, 7));
    setFocusedDate(next < today ? today : next);
    setPreview(null);
  }
  function keyDate(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const movement: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key === "Escape") { setAnchor(null); setPreview(null); return; }
    if (!(event.key in movement)) return;
    event.preventDefault();
    const candidate = moveCalendarDate(date, movement[event.key]);
    const next = candidate < today ? today : candidate;
    focusPending.current = true;
    setFocusedDate(next);
    setMonth(next.slice(0, 7));
    if (anchor) setPreview(calendarDateRange(anchor, next));
  }
  function startGesture(event: PointerEvent<HTMLButtonElement>, date: string) {
    if (disabled || event.button !== 0) return;
    if (gesture.current) clearTimeout(gesture.current.timer);
    suppressClick.current = false;
    const current: Gesture = {
      date, endDate: date, x: event.clientX, y: event.clientY, dragging: false,
      timer: setTimeout(() => {
        current.dragging = true;
        setPreview(calendarDateRange(date, date));
      }, 350),
    };
    gesture.current = current;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveGesture(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current) return;
    if (event.pointerType === "mouse" && Math.hypot(event.clientX - current.x, event.clientY - current.y) > 6) {
      current.dragging = true;
      clearTimeout(current.timer);
    }
    if (!current.dragging) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>("[data-date]");
    if (target && !target.disabled && calendar.current?.contains(target) && target.dataset.date) {
      current.endDate = target.dataset.date;
      setPreview(calendarDateRange(current.date, target.dataset.date));
    }
  }
  function endGesture(cancelled = false) {
    const current = gesture.current;
    if (!current) return;
    clearTimeout(current.timer);
    gesture.current = null;
    if (current.dragging) {
      suppressClick.current = true;
      if (!cancelled && !disabled) onChange({ ...value, ...calendarDateRange(current.date, current.endDate) });
      setAnchor(null);
    }
    setPreview(null);
  }
  function editDate(key: "startDate" | "endDate", date: string) {
    if (date && date < today) return;
    onChange({ ...value, [key]: date });
    setAnchor(null);
    setPreview(null);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setMonth(date.slice(0, 7));
      setFocusedDate(date);
    }
  }

  return <div className="availability-selector">
    <div className="availability-selector-layout">
      <div className="availability-calendar-panel">
        <div className="availability-calendar-heading">
          <button type="button" aria-label="Previous month" disabled={disabled || month <= today.slice(0, 7)} onClick={() => changeMonth(-1)}><span className="availability-chevron-back"><Icon name="chevron" size={18} /></span></button>
          <strong aria-live="polite">{monthLabel.format(new Date(`${month}-01T12:00:00Z`))}</strong>
          <button type="button" aria-label="Next month" disabled={disabled || month === "9999-12"} onClick={() => changeMonth(1)}><Icon name="chevron" size={18} /></button>
        </div>
        <p className="availability-calendar-instruction" id="availability-calendar-help">Tap a start and end date, or hold and drag to select a range.</p>
        <div className="availability-weekdays" aria-hidden="true">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={index}>{day}</span>)}</div>
        <div className="availability-calendar-days" ref={calendar} role="group" aria-label="Available dates" aria-describedby="availability-calendar-help" onContextMenu={event => event.preventDefault()} onPointerMove={moveGesture} onPointerUp={() => endGesture()} onPointerCancel={() => endGesture(true)}>
          {dates.map((date, index) => {
            if (!date) return <span key={index} />;
            const inRange = !!selected.startDate && !!selected.endDate && date >= selected.startDate && date <= selected.endDate;
            return <button
              type="button"
              key={date}
              data-date={date}
              data-outside={date.slice(0, 7) !== month}
              data-selected={inRange}
              data-endpoint={date === selected.startDate || date === selected.endDate}
              aria-label={dateLabel.format(new Date(`${date}T12:00:00Z`))}
              aria-pressed={inRange}
              aria-current={date === today ? "date" : undefined}
              tabIndex={date === focusedDate ? 0 : -1}
              disabled={disabled || date < today}
              onKeyDown={event => keyDate(event, date)}
              onPointerDown={event => startGesture(event, date)}
              onClick={event => {
                if (event.detail === 0) suppressClick.current = false;
                selectDate(date);
              }}
              onPointerEnter={() => {
                if (anchor && date >= today && !gesture.current) setPreview(calendarDateRange(anchor, date));
              }}
            >
              {Number(date.slice(-2))}
            </button>;
          })}
        </div>
      </div>
      <div className="availability-schedule-panel">
        <div className="availability-panel-title"><Icon name="calendar" size={18} /><h4>Your dates</h4></div>
        <div className="availability-date-fields">
          {(["startDate", "endDate"] as const).map(key => <div className="field" key={key}>
            <label htmlFor={key}>{key === "startDate" ? "From date" : "To date"} {optional ? <span>(optional)</span> : <span className="required-mark" aria-hidden="true">*</span>}</label>
            <input
              id={key}
              type="date"
              required={!optional}
              disabled={disabled}
              min={key === "endDate" && value.startDate > today ? value.startDate : today}
              max="9999-12-31"
              value={value[key]}
              aria-invalid={!!error}
              aria-describedby={describedBy}
              onChange={event => editDate(key, event.target.value)}
            />
          </div>)}
        </div>
        <div className="availability-panel-title availability-hours-title"><Icon name="clock" size={18} /><h4>Daily hours</h4><span>Philippine time</span></div>
        <div className="availability-time-fields">
          {(["startTime", "endTime"] as const).map(key => <div className="field" key={key}>
            <label htmlFor={key}>{key === "startTime" ? "From time" : "To time"} {optional ? <span>(optional)</span> : <span className="required-mark" aria-hidden="true">*</span>}</label>
            <select id={key} required={!optional} disabled={disabled} value={value[key]} aria-invalid={!!error} aria-describedby={describedBy} onChange={event => onChange({ ...value, [key]: event.target.value })}>
              <option value="">Select time</option>
              {value[key] && !timeOptions.includes(value[key]) && <option value={value[key]} disabled={value[key] < "07:00" || value[key] > "22:00"}>{displayTime(value[key])}</option>}
              {timeOptions.map(time => <option key={time} value={time} disabled={key === "startTime" ? time >= "22:00" : time <= "07:00" || !!value.startTime && time <= value.startTime}>{displayTime(time)}</option>)}
            </select>
          </div>)}
        </div>
        <p className="availability-calendar-instruction">Choose hours between 7:00 AM and 10:00 PM. These apply to each date in your range.</p>
        <p className="availability-selection-status" role="status">{anchor ? "Choose an end date to finish your range." : value.startDate && value.endDate ? `${value.startDate} – ${value.endDate}` : "Select the dates you’re available."}</p>
      </div>
    </div>
  </div>;
}
