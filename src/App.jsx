import { useState, useRef, useEffect, useCallback } from "react";
import { useGoogleLogin } from "@react-oauth/google";

const SHEET_ID = import.meta.env.VITE_SHEET_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const RANGE = "Sheet1!A2:F100";

// ── Google Sheets fetch ──
async function fetchAgents() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Google Sheets API error: ${response.status}`);
  const data = await response.json();
  if (!data.values || data.values.length === 0) return [];
  return data.values.map((row, index) => ({
    id: index + 1,
    name: row[0] || "",
    cell: row[1] || "",
    ext: row[2] || "",
    location: row[3] || "",
    office: row[4] || "",
    email: row[5] || "",
  }));
}

// ── Google Calendar fetch ──
async function fetchCalendarEvents(accessToken, calendarId, timeMin, timeMax) {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
    `timeMin=${encodeURIComponent(timeMin)}` +
    `&timeMax=${encodeURIComponent(timeMax)}` +
    `&singleEvents=true` +
    `&orderBy=startTime` +
    `&maxResults=250`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 404 || response.status === 403) {
    throw new Error("No access to this calendar. The agent needs to share their calendar with you.");
  }
  if (!response.ok) throw new Error(`Calendar API error: ${response.status}`);
  const data = await response.json();
  return data.items || [];
}

// ── Date helpers ──
const HOUR_HEIGHT = 56; // px per hour
const START_HOUR = 6; // 6 AM
const END_HOUR = 22; // 10 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;

function getDateRange(view, referenceDate) {
  const d = new Date(referenceDate);
  if (view === "day") {
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    return { start, end };
  }
  if (view === "week") {
    const dayOfWeek = d.getDay();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayOfWeek);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayOfWeek + 7);
    return { start, end };
  }
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start, end };
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isToday(d) { return isSameDay(d, new Date()); }

function formatTime(dateString) {
  if (!dateString) return "All day";
  return new Date(dateString).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function formatTimeRange(event) {
  if (event.start.date) return "All day";
  return `${formatTime(event.start.dateTime)} – ${formatTime(event.end.dateTime)}`;
}
function isNow(event) {
  if (event.start.date) return true;
  const now = new Date();
  return new Date(event.start.dateTime) <= now && now <= new Date(event.end.dateTime);
}
function getEventDate(event) {
  if (event.start.date) return new Date(event.start.date + "T00:00:00");
  return new Date(event.start.dateTime);
}
function getEventsForDay(events, day) {
  return events.filter(e => isSameDay(getEventDate(e), day));
}

// Get fractional hour (e.g., 11:20 AM = 11.333)
function getHourFraction(dateString) {
  const d = new Date(dateString);
  return d.getHours() + d.getMinutes() / 60;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatHourLabel(hour) {
  if (hour === 0 || hour === 24) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

// ── Components ──

function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ background: "rgba(99,182,255,0.25)", borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}

function EventItem({ event }) {
  const active = isNow(event);
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      padding: "10px 14px",
      background: active ? "rgba(34,197,94,0.06)" : "transparent",
      border: active ? "1px solid rgba(34,197,94,0.25)" : "1px solid var(--border)",
      borderRadius: 8,
    }}>
      <div style={{
        width: 3, minHeight: 36, borderRadius: 2, flexShrink: 0, marginTop: 2,
        background: active ? "#22c55e" : "var(--accent)",
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
          fontFamily: "'DM Sans', sans-serif", marginBottom: 2,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {event.summary || "(No title)"}
        </div>
        <div style={{
          fontSize: 11.5, color: "var(--text-secondary)",
          fontFamily: "'DM Mono', monospace",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>{formatTimeRange(event)}</span>
          {active && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: "#22c55e",
              background: "rgba(34,197,94,0.1)", padding: "1px 6px",
              borderRadius: 10, textTransform: "uppercase", letterSpacing: "0.04em",
            }}>Now</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ViewToggle({ view, setView }) {
  const views = ["day", "week", "month"];
  return (
    <div style={{ display: "flex", background: "var(--bg)", borderRadius: 8, padding: 2, gap: 2 }}>
      {views.map(v => (
        <button
          key={v}
          onClick={() => setView(v)}
          style={{
            padding: "4px 14px", fontSize: 11, fontWeight: v === view ? 700 : 500,
            fontFamily: "'DM Sans', sans-serif", borderRadius: 6,
            border: "none", cursor: "pointer", textTransform: "capitalize",
            background: v === view ? "var(--accent-subtle)" : "transparent",
            color: v === view ? "var(--accent)" : "var(--text-muted)",
            transition: "all 0.15s",
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function DateNavigation({ view, referenceDate, setReferenceDate }) {
  const goBack = () => {
    const d = new Date(referenceDate);
    if (view === "day") d.setDate(d.getDate() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setReferenceDate(d);
  };
  const goForward = () => {
    const d = new Date(referenceDate);
    if (view === "day") d.setDate(d.getDate() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setReferenceDate(d);
  };
  const goToday = () => setReferenceDate(new Date());

  let label = "";
  if (view === "day") {
    label = referenceDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  } else if (view === "week") {
    const { start, end } = getDateRange("week", referenceDate);
    const endDisplay = new Date(end.getTime() - 86400000);
    label = `${start.toLocaleDateString([], { month: "short", day: "numeric" })} – ${endDisplay.toLocaleDateString([], { month: "short", day: "numeric" })}`;
  } else {
    label = `${MONTH_NAMES[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`;
  }

  const navBtnStyle = {
    background: "transparent", border: "1px solid var(--border)", borderRadius: 6,
    color: "var(--text-secondary)", cursor: "pointer", padding: "4px 8px", fontSize: 13,
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={goBack} style={navBtnStyle}>‹</button>
      <button onClick={goToday} style={{
        ...navBtnStyle, width: "auto", padding: "4px 10px", fontSize: 11,
        fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
      }}>Today</button>
      <button onClick={goForward} style={navBtnStyle}>›</button>
      <span style={{
        fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
        fontFamily: "'DM Sans', sans-serif", marginLeft: 4,
      }}>{label}</span>
    </div>
  );
}

// ── Time Grid Event Block (for week and day time grid) ──
function TimeGridEvent({ event }) {
  const active = isNow(event);
  return (
    <div
      title={`${event.summary || "(No title)"}\n${formatTimeRange(event)}`}
      style={{
        fontSize: 10.5, padding: "3px 6px", borderRadius: 4,
        background: active ? "rgba(34,197,94,0.15)" : "var(--accent-subtle)",
        border: active ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(99,182,255,0.2)",
        fontFamily: "'DM Sans', sans-serif",
        overflow: "hidden",
        height: "100%",
        cursor: "default",
      }}
    >
      <div style={{
        fontWeight: 600, color: active ? "#22c55e" : "var(--accent)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        lineHeight: "1.3",
      }}>{event.summary || "(No title)"}</div>
      <div style={{
        fontSize: 9.5, color: "var(--text-secondary)",
        fontFamily: "'DM Mono', monospace",
      }}>
        {formatTimeRange(event)}
      </div>
    </div>
  );
}

// ── Current Time Indicator ──
function NowIndicator() {
  const now = new Date();
  const hourFraction = now.getHours() + now.getMinutes() / 60;
  if (hourFraction < START_HOUR || hourFraction > END_HOUR) return null;
  const top = (hourFraction - START_HOUR) * HOUR_HEIGHT;

  return (
    <div style={{
      position: "absolute", left: 0, right: 0, top,
      zIndex: 10, pointerEvents: "none",
    }}>
      <div style={{
        position: "absolute", left: -5, top: -5,
        width: 10, height: 10, borderRadius: "50%",
        background: "#ef4444",
      }} />
      <div style={{
        height: 2, background: "#ef4444",
        marginLeft: 5,
      }} />
    </div>
  );
}

// ── Time Grid (shared between day and week time grid views) ──
function TimeGrid({ days, events, showNowLine }) {
  const scrollRef = useRef(null);

  // Auto-scroll to current time or 8 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const targetHour = Math.max(START_HOUR, now.getHours() - 1);
      scrollRef.current.scrollTop = (targetHour - START_HOUR) * HOUR_HEIGHT;
    }
  }, []);

  const isSingleDay = days.length === 1;

  return (
    <div style={{ borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden" }}>
      {/* Day headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `48px repeat(${days.length}, 1fr)`,
        borderBottom: "1px solid var(--border)",
        background: "var(--card-bg)",
      }}>
        <div style={{ padding: 6 }} />
        {days.map((day, i) => {
          const today = isToday(day);
          return (
            <div key={i} style={{
              textAlign: "center", padding: "8px 4px",
              borderLeft: "1px solid var(--border)",
            }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.05em",
                fontFamily: "'DM Sans', sans-serif",
              }}>{DAY_NAMES[day.getDay()]}</div>
              <div style={{
                fontSize: isSingleDay ? 20 : 16, fontWeight: 700,
                color: today ? "var(--accent)" : "var(--text-primary)",
                fontFamily: "'DM Sans', sans-serif",
                ...(today ? {
                  background: "var(--accent)",
                  color: "#fff",
                  width: isSingleDay ? 36 : 28,
                  height: isSingleDay ? 36 : 28,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                } : {}),
              }}>{day.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* All-day events */}
      {(() => {
        const allDayRows = days.map(day =>
          getEventsForDay(events, day).filter(e => e.start.date)
        );
        const hasAllDay = allDayRows.some(r => r.length > 0);
        if (!hasAllDay) return null;
        return (
          <div style={{
            display: "grid",
            gridTemplateColumns: `48px repeat(${days.length}, 1fr)`,
            borderBottom: "1px solid var(--border)",
            background: "var(--card-bg)",
          }}>
            <div style={{
              padding: "4px 6px", fontSize: 9, color: "var(--text-muted)",
              fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center",
            }}>all day</div>
            {allDayRows.map((dayEvents, i) => (
              <div key={i} style={{
                padding: "4px 2px",
                borderLeft: "1px solid var(--border)",
                display: "flex", flexDirection: "column", gap: 2,
              }}>
                {dayEvents.map(e => (
                  <div key={e.id} style={{
                    fontSize: 10, padding: "2px 5px", borderRadius: 3,
                    background: "var(--accent-subtle)", color: "var(--accent)",
                    fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{e.summary || "(No title)"}</div>
                ))}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Scrollable time grid */}
      <div
        ref={scrollRef}
        style={{
          height: Math.min(TOTAL_HOURS * HOUR_HEIGHT, 420),
          overflowY: "auto",
          position: "relative",
        }}
      >
        <div style={{
          display: "grid",
          gridTemplateColumns: `48px repeat(${days.length}, 1fr)`,
          height: TOTAL_HOURS * HOUR_HEIGHT,
          position: "relative",
        }}>
          {/* Time labels */}
          <div style={{ position: "relative" }}>
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div key={i} style={{
                position: "absolute", top: i * HOUR_HEIGHT - 7,
                right: 6, fontSize: 10,
                color: "var(--text-muted)",
                fontFamily: "'DM Mono', monospace",
                lineHeight: 1,
              }}>
                {i > 0 ? formatHourLabel(START_HOUR + i) : ""}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => {
            const dayEvents = getEventsForDay(events, day).filter(e => !e.start.date);
            const today = isToday(day) && showNowLine;

            return (
              <div key={dayIdx} style={{
                position: "relative",
                borderLeft: "1px solid var(--border)",
                background: today ? "rgba(99,182,255,0.02)" : "transparent",
              }}>
                {/* Hour grid lines */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div key={i} style={{
                    position: "absolute", top: i * HOUR_HEIGHT,
                    left: 0, right: 0,
                    borderTop: "1px solid var(--border)",
                    height: HOUR_HEIGHT,
                  }}>
                    {/* Half-hour line */}
                    <div style={{
                      position: "absolute", top: HOUR_HEIGHT / 2,
                      left: 0, right: 0,
                      borderTop: "1px dashed var(--border)",
                      opacity: 0.4,
                    }} />
                  </div>
                ))}

                {/* Events */}
                {dayEvents.map(event => {
                  const startFrac = getHourFraction(event.start.dateTime);
                  const endFrac = getHourFraction(event.end.dateTime);
                  const clampedStart = Math.max(startFrac, START_HOUR);
                  const clampedEnd = Math.min(endFrac, END_HOUR);
                  const top = (clampedStart - START_HOUR) * HOUR_HEIGHT;
                  const height = Math.max((clampedEnd - clampedStart) * HOUR_HEIGHT, 18);

                  return (
                    <div key={event.id} style={{
                      position: "absolute",
                      top, height,
                      left: 2, right: 2,
                      zIndex: 5,
                    }}>
                      <TimeGridEvent event={event} />
                    </div>
                  );
                })}

                {/* Now indicator */}
                {today && <NowIndicator />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Day View (now uses time grid) ──
function DayView({ events, referenceDate }) {
  const timedEvents = events.filter(e => !e.start.date);
  const allDayEvents = events.filter(e => e.start.date);

  if (timedEvents.length === 0 && allDayEvents.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        No events scheduled
      </div>
    );
  }

  return <TimeGrid days={[referenceDate]} events={events} showNowLine={true} />;
}

// ── Week View (Google Calendar style time grid) ──
function WeekView({ events, referenceDate }) {
  const { start } = getDateRange("week", referenceDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  return <TimeGrid days={days} events={events} showNowLine={true} />;
}

// ── Month View ──
function MonthView({ events, referenceDate, setReferenceDate, setView }) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {DAY_NAMES.map(name => (
          <div key={name} style={{
            textAlign: "center", fontSize: 10, fontWeight: 600,
            color: "var(--text-muted)", textTransform: "uppercase",
            letterSpacing: "0.05em", padding: "4px 0",
            fontFamily: "'DM Sans', sans-serif",
          }}>{name}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const date = new Date(year, month, day);
          const dayEvents = getEventsForDay(events, date);
          const today = isToday(date);
          return (
            <div
              key={day}
              onClick={() => { setReferenceDate(date); setView("day"); }}
              style={{
                padding: 6, borderRadius: 8, minHeight: 52, cursor: "pointer",
                background: today ? "var(--accent-subtle)" : "transparent",
                border: today ? "1px solid var(--accent)" : "1px solid var(--border)",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { if (!today) e.currentTarget.style.background = "var(--card-bg)"; }}
              onMouseLeave={e => { if (!today) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{
                fontSize: 12, fontWeight: today ? 700 : 500,
                color: today ? "var(--accent)" : "var(--text-primary)",
                fontFamily: "'DM Sans', sans-serif", marginBottom: 4,
              }}>{day}</div>
              {dayEvents.length > 0 && (
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                  {dayEvents.slice(0, 3).map((e, idx) => (
                    <div key={idx} style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: isNow(e) ? "#22c55e" : "var(--accent)",
                    }} />
                  ))}
                  {dayEvents.length > 3 && (
                    <span style={{ fontSize: 9, color: "var(--text-muted)" }}>+{dayEvents.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Accordion Header ──
function AccordionHeader({ title, icon, isOpen, onClick, rightContent }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", cursor: "pointer",
        background: "var(--card-bg)",
        border: isOpen ? "1.5px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: isOpen ? "10px 10px 0 0" : 10,
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Chevron */}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-muted)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {icon}
        <span style={{
          fontSize: 14, fontWeight: 700, color: "var(--text-primary)",
          fontFamily: "'DM Sans', sans-serif",
        }}>{title}</span>
      </div>
      {rightContent && <div onClick={e => e.stopPropagation()}>{rightContent}</div>}
    </div>
  );
}

// ── Calendar Panel (reusable) ──
function CalendarPanel({ accessToken, calendarId }) {
  const [view, setView] = useState("day");
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadEvents = useCallback(async () => {
    if (!accessToken || !calendarId) return;
    setLoading(true);
    setError(null);
    try {
      const d = new Date(referenceDate);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const { start: viewStart, end: viewEnd } = getDateRange(view, referenceDate);
      const fetchStart = new Date(Math.min(monthStart.getTime(), viewStart.getTime()));
      const fetchEnd = new Date(Math.max(monthEnd.getTime(), viewEnd.getTime()));
      const items = await fetchCalendarEvents(accessToken, calendarId, fetchStart.toISOString(), fetchEnd.toISOString());
      setEvents(items);
    } catch (err) {
      console.error("Calendar fetch error:", err);
      setError(err.message);
    }
    setLoading(false);
  }, [accessToken, calendarId, referenceDate, view]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const { start: dayStart, end: dayEnd } = getDateRange("day", referenceDate);
  const dayEvents = events.filter(e => {
    const ed = getEventDate(e);
    return ed >= dayStart && ed < dayEnd;
  });

  return (
    <div style={{ padding: 16 }}>
      {/* Controls */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 14, flexWrap: "wrap", gap: 8,
      }}>
        <DateNavigation view={view} referenceDate={referenceDate} setReferenceDate={setReferenceDate} />
        <ViewToggle view={view} setView={setView} />
      </div>

      {loading && (
        <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          Loading calendar…
        </div>
      )}

      {error && (
        <div style={{
          padding: 16, color: "#f87171", fontSize: 12, textAlign: "center",
          background: "rgba(248,113,113,0.06)", borderRadius: 8,
        }}>{error}</div>
      )}

      {!loading && !error && view === "day" && <DayView events={dayEvents} referenceDate={referenceDate} />}
      {!loading && !error && view === "week" && <WeekView events={events} referenceDate={referenceDate} />}
      {!loading && !error && view === "month" && <MonthView events={events} referenceDate={referenceDate} setReferenceDate={setReferenceDate} setView={setView} />}
    </div>
  );
}

// ── Agent Card ──
function AgentCard({ agent, query, isSelected, onClick, hasCalendar }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "start",
        gap: 8,
        padding: "14px 18px",
        background: isSelected ? "var(--card-selected)" : "var(--card-bg)",
        border: isSelected ? "1.5px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: isSelected ? "10px 10px 0 0" : 10,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          {/* Chevron for expand hint */}
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{
              transition: "transform 0.2s", flexShrink: 0,
              transform: isSelected ? "rotate(90deg)" : "rotate(0deg)",
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span style={{
            fontSize: 15, fontWeight: 700, color: "var(--text-primary)",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {highlightMatch(agent.name, query)}
          </span>
          {hasCalendar && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          )}
        </div>
        <div style={{
          fontSize: 12.5, color: "var(--text-secondary)",
          fontFamily: "'DM Mono', monospace",
          display: "flex", flexWrap: "wrap", gap: "4px 14px",
          marginLeft: 22,
        }}>
          <span>ext <strong style={{ color: "var(--text-primary)" }}>{agent.ext}</strong></span>
          <span style={{ color: "var(--border)" }}>|</span>
          <span>{agent.office}</span>
          <span style={{ color: "var(--border)" }}>|</span>
          <span>{agent.location}</span>
        </div>
      </div>
      <a
        href={`tel:${agent.cell}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 12.5, fontFamily: "'DM Mono', monospace",
          color: "var(--accent)", textDecoration: "none",
          padding: "6px 12px", borderRadius: 8,
          background: "var(--accent-subtle)",
          fontWeight: 600, whiteSpace: "nowrap",
          border: "1px solid transparent",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
        </svg>
        {agent.cell}
      </a>
    </div>
  );
}

function FilterPill({ label, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 14px", fontSize: 12,
        fontWeight: active ? 700 : 500,
        fontFamily: "'DM Sans', sans-serif",
        border: active ? "1.5px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: 20,
        background: active ? "var(--accent-subtle)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        cursor: "pointer", transition: "all 0.15s",
        display: "flex", alignItems: "center", gap: 6,
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{
          background: active ? "var(--accent)" : "var(--border)",
          color: active ? "#fff" : "var(--text-secondary)",
          fontSize: 10, fontWeight: 700,
          padding: "1px 6px", borderRadius: 10,
        }}>{count}</span>
      )}
    </button>
  );
}

// ── Main Dashboard ──
export default function AgentDashboard() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const inputRef = useRef(null);

  // Auth state
  const [accessToken, setAccessToken] = useState(null);
  const [userName, setUserName] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  // My Schedule accordion
  const [myScheduleOpen, setMyScheduleOpen] = useState(true);

  // Google Sign-In
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
      try {
        const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await res.json();
        setUserName(userInfo.given_name || userInfo.name || "User");
        setUserEmail(userInfo.email || "");
      } catch {
        setUserName("User");
      }
    },
    onError: (err) => console.error("Google login failed:", err),
    scope: "https://www.googleapis.com/auth/calendar.readonly",
  });

  const handleSignOut = () => {
    setAccessToken(null);
    setUserName(null);
    setUserEmail(null);
    setSelectedId(null);
    setMyScheduleOpen(true);
  };

  // Fetch agents
  useEffect(() => {
    fetchAgents()
      .then((data) => { setAgents(data); setLoading(false); })
      .catch((err) => {
        console.error("Failed to fetch agents:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setQuery("");
        setSelectedId(null);
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const locations = [...new Set(agents.map(a => a.location).filter(Boolean))];

  const filtered = agents.filter(a => {
    const matchesQuery = !query ||
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.ext.includes(query) ||
      a.cell.includes(query) ||
      a.office.toLowerCase().includes(query.toLowerCase());
    const matchesLocation = locationFilter === "all" || a.location === locationFilter;
    return matchesQuery && matchesLocation;
  });

  const calendarIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      color: "var(--text-primary)",
      fontFamily: "'DM Sans', sans-serif",
      padding: "24px 20px",
      maxWidth: 720,
      margin: "0 auto",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        :root {
          --bg: #0f1117;
          --card-bg: #181a23;
          --card-selected: #1c2033;
          --border: #2a2d3a;
          --text-primary: #e8eaed;
          --text-secondary: #8b8fa3;
          --text-muted: #5f6375;
          --accent: #63b6ff;
          --accent-subtle: rgba(99,182,255,0.08);
          --search-bg: #181a23;
        }
        @media (prefers-color-scheme: light) {
          :root {
            --bg: #f4f5f7;
            --card-bg: #ffffff;
            --card-selected: #f0f5ff;
            --border: #e0e2e8;
            --text-primary: #1a1d2b;
            --text-secondary: #6b7084;
            --text-muted: #9498ad;
            --accent: #2b7de9;
            --accent-subtle: rgba(43,125,233,0.06);
            --search-bg: #ffffff;
          }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: var(--text-muted); }
        input:focus { outline: none; }
        button:hover { opacity: 0.85; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              Agent Directory
            </h1>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginLeft: 32 }}>
            {agents.length} agents loaded
          </p>
        </div>

        <div>
          {!accessToken ? (
            <button
              onClick={() => login()}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 8,
                background: "var(--card-bg)", border: "1px solid var(--border)",
                color: "var(--text-primary)", fontSize: 13,
                fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                cursor: "pointer", transition: "border-color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              {calendarIcon}
              Sign in for Calendar
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif" }}>
                {userName}
              </span>
              <button
                onClick={handleSignOut}
                style={{
                  padding: "5px 12px", borderRadius: 6,
                  background: "transparent", border: "1px solid var(--border)",
                  color: "var(--text-muted)", fontSize: 11,
                  fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* My Schedule - Accordion */}
      {accessToken && userEmail && (
        <div style={{ marginBottom: 20 }}>
          <AccordionHeader
            title="My Schedule"
            icon={calendarIcon}
            isOpen={myScheduleOpen}
            onClick={() => setMyScheduleOpen(!myScheduleOpen)}
          />
          {myScheduleOpen && (
            <div style={{
              border: "1.5px solid var(--accent)",
              borderTop: "none",
              borderRadius: "0 0 10px 10px",
              background: "var(--card-bg)",
              overflow: "hidden",
            }}>
              <CalendarPanel accessToken={accessToken} calendarId={userEmail} />
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by name, extension, cell, or office…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedId(null); }}
          style={{
            width: "100%",
            padding: "12px 14px 12px 42px",
            fontSize: 14,
            fontFamily: "'DM Sans', sans-serif",
            background: "var(--search-bg)",
            border: "1.5px solid var(--border)",
            borderRadius: 10,
            color: "var(--text-primary)",
            transition: "border-color 0.15s",
          }}
          onFocus={e => e.target.style.borderColor = "var(--accent)"}
          onBlur={e => e.target.style.borderColor = "var(--border)"}
        />
        {!query && (
          <span style={{
            position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
            fontSize: 10, fontFamily: "'DM Mono', monospace",
            color: "var(--text-muted)", background: "var(--bg)",
            padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)",
          }}>/</span>
        )}
      </div>

      {/* Location Filters */}
      {locations.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          <FilterPill label="All Locations" count={agents.length} active={locationFilter === "all"} onClick={() => setLocationFilter("all")} />
          {locations.map(loc => (
            <FilterPill
              key={loc}
              label={loc}
              count={agents.filter(a => a.location === loc).length}
              active={locationFilter === loc}
              onClick={() => setLocationFilter(loc)}
            />
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)", fontSize: 14 }}>
          Loading agents from Google Sheets…
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          textAlign: "center", padding: 40, color: "#f87171", fontSize: 14,
          background: "rgba(248,113,113,0.08)", borderRadius: 10, border: "1px solid rgba(248,113,113,0.2)",
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Failed to load agents</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{error}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
            Check that your .env file has VITE_SHEET_ID and VITE_GOOGLE_SHEETS_API_KEY set, and that the sheet is shared as "Anyone with the link can view."
          </div>
        </div>
      )}

      {/* Agent List */}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 14 }}>
              {query ? `No agents match "${query}"` : "No agents found in the spreadsheet"}
            </div>
          ) : (
            filtered.map(agent => (
              <div key={agent.id}>
                <AgentCard
                  agent={agent}
                  query={query}
                  isSelected={selectedId === agent.id}
                  onClick={() => setSelectedId(selectedId === agent.id ? null : agent.id)}
                  hasCalendar={!!agent.email && !!accessToken}
                />
                {/* Agent Calendar - expands below */}
                {selectedId === agent.id && accessToken && agent.email && (
                  <div style={{
                    border: "1.5px solid var(--accent)",
                    borderTop: "none",
                    borderRadius: "0 0 10px 10px",
                    background: "var(--card-bg)",
                    overflow: "hidden",
                  }}>
                    <CalendarPanel accessToken={accessToken} calendarId={agent.email} />
                  </div>
                )}
                {selectedId === agent.id && accessToken && !agent.email && (
                  <div style={{
                    padding: 16, textAlign: "center",
                    border: "1.5px solid var(--accent)", borderTopWidth: 0,
                    borderRadius: "0 0 10px 10px",
                    background: "var(--card-bg)",
                    color: "var(--text-muted)", fontSize: 12,
                  }}>
                    No email set for this agent. Add their Google email to column F in the spreadsheet to view their calendar.
                  </div>
                )}
                {selectedId === agent.id && !accessToken && (
                  <div style={{
                    padding: 16, textAlign: "center",
                    border: "1px solid var(--border)", borderTopWidth: 0,
                    borderRadius: "0 0 10px 10px",
                    background: "var(--card-bg)",
                    color: "var(--text-muted)", fontSize: 12,
                  }}>
                    Sign in with Google to view agent calendars.
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 24, textAlign: "center", fontSize: 11, color: "var(--text-muted)",
        fontFamily: "'DM Mono', monospace",
      }}>
        <kbd style={{
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: 4, padding: "2px 6px", fontSize: 10,
        }}>/</kbd> to search · <kbd style={{
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: 4, padding: "2px 6px", fontSize: 10,
        }}>esc</kbd> to clear
      </div>
    </div>
  );
}
