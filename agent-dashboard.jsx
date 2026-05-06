import { useState, useRef, useEffect } from "react";

const MOCK_AGENTS = [
  { id: 1, name: "Jamie Wallace", team: "Wallace Team", ext: "2041", cell: "931-555-0147", office: "Suite 204", location: "Main Office", status: "available" },
  { id: 2, name: "Amy Chen", team: "Wallace Team", ext: "2042", cell: "931-555-0233", office: "Suite 204", location: "Main Office", status: "busy" },
  { id: 3, name: "Marcus Rivera", team: "Rivera Group", ext: "3010", cell: "931-555-0388", office: "Suite 301", location: "Main Office", status: "available" },
  { id: 4, name: "Denise Okafor", team: "Rivera Group", ext: "3011", cell: "931-555-0412", office: "Suite 301", location: "Main Office", status: "out" },
  { id: 5, name: "Travis Long", team: "Long & Associates", ext: "1050", cell: "931-555-0590", office: "Suite 105", location: "West Branch", status: "available" },
  { id: 6, name: "Rachel Kim", team: "Long & Associates", ext: "1051", cell: "931-555-0634", office: "Suite 105", location: "West Branch", status: "available" },
  { id: 7, name: "Carlos Mendez", team: "Mendez Realty", ext: "4020", cell: "931-555-0771", office: "Suite 402", location: "Main Office", status: "busy" },
  { id: 8, name: "Laura Bridges", team: "Mendez Realty", ext: "4021", cell: "931-555-0819", office: "Suite 402", location: "Main Office", status: "available" },
  { id: 9, name: "Derek Haines", team: "Independent", ext: "2060", cell: "931-555-0903", office: "Suite 206", location: "Main Office", status: "available" },
  { id: 10, name: "Priya Sharma", team: "Independent", ext: "1070", cell: "931-555-0155", office: "Suite 107", location: "West Branch", status: "out" },
  { id: 11, name: "Nathan Cross", team: "Wallace Team", ext: "2043", cell: "931-555-0267", office: "Suite 204", location: "Main Office", status: "available" },
  { id: 12, name: "Monica Tran", team: "Rivera Group", ext: "3012", cell: "931-555-0445", office: "Suite 302", location: "Main Office", status: "busy" },
];

const STATUS_CONFIG = {
  available: { label: "Available", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  busy: { label: "On Call", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  out: { label: "Out", color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

function StatusDot({ status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
      color: cfg.color, textTransform: "uppercase",
      background: cfg.bg, padding: "3px 10px", borderRadius: 20,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", background: cfg.color,
        boxShadow: status === "available" ? `0 0 6px ${cfg.color}` : "none",
      }} />
      {cfg.label}
    </span>
  );
}

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

function AgentCard({ agent, query, isSelected, onClick }) {
  const cfg = STATUS_CONFIG[agent.status];
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
        borderRadius: 10,
        cursor: "pointer",
        transition: "all 0.15s ease",
        position: "relative",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{
            fontSize: 15, fontWeight: 700, color: "var(--text-primary)",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {highlightMatch(agent.name, query)}
          </span>
          <StatusDot status={agent.status} />
        </div>
        <div style={{
          fontSize: 12.5, color: "var(--text-secondary)",
          fontFamily: "'DM Mono', monospace",
          display: "flex", flexWrap: "wrap", gap: "4px 14px",
        }}>
          <span>ext <strong style={{ color: "var(--text-primary)" }}>{agent.ext}</strong></span>
          <span style={{ color: "var(--border)" }}>|</span>
          <span>{agent.office}</span>
          <span style={{ color: "var(--border)" }}>|</span>
          <span>{agent.location}</span>
        </div>
        <div style={{
          fontSize: 11.5, color: "var(--text-muted)", marginTop: 4,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {highlightMatch(agent.team, query)}
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
        padding: "5px 14px",
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        fontFamily: "'DM Sans', sans-serif",
        border: active ? "1.5px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: 20,
        background: active ? "var(--accent-subtle)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        cursor: "pointer",
        transition: "all 0.15s",
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

export default function AgentDashboard() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const inputRef = useRef(null);

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

  const locations = [...new Set(MOCK_AGENTS.map(a => a.location))];

  const filtered = MOCK_AGENTS.filter(a => {
    const matchesQuery = !query ||
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.team.toLowerCase().includes(query.toLowerCase()) ||
      a.ext.includes(query) ||
      a.cell.includes(query);
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesLocation = locationFilter === "all" || a.location === locationFilter;
    return matchesQuery && matchesStatus && matchesLocation;
  });

  const statusCounts = {
    all: MOCK_AGENTS.length,
    available: MOCK_AGENTS.filter(a => a.status === "available").length,
    busy: MOCK_AGENTS.filter(a => a.status === "busy").length,
    out: MOCK_AGENTS.filter(a => a.status === "out").length,
  };

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
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <h1 style={{
            fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em",
            color: "var(--text-primary)",
          }}>
            Agent Directory
          </h1>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginLeft: 32 }}>
          {statusCounts.available} available · {statusCounts.busy} on call · {statusCounts.out} out
        </p>
      </div>

      {/* Search */}
      <div style={{
        position: "relative", marginBottom: 14,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by name, team, or extension…"
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

      {/* Filters */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap",
      }}>
        <FilterPill label="All" count={statusCounts.all} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
        <FilterPill label="Available" count={statusCounts.available} active={statusFilter === "available"} onClick={() => setStatusFilter("available")} />
        <FilterPill label="On Call" count={statusCounts.busy} active={statusFilter === "busy"} onClick={() => setStatusFilter("busy")} />
        <FilterPill label="Out" count={statusCounts.out} active={statusFilter === "out"} onClick={() => setStatusFilter("out")} />
        <span style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
        <FilterPill label="All Locations" active={locationFilter === "all"} onClick={() => setLocationFilter("all")} />
        {locations.map(loc => (
          <FilterPill key={loc} label={loc} active={locationFilter === loc} onClick={() => setLocationFilter(loc)} />
        ))}
      </div>

      {/* Agent List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 40,
            color: "var(--text-muted)", fontSize: 14,
          }}>
            No agents match "{query}"
          </div>
        ) : (
          filtered.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              query={query}
              isSelected={selectedId === agent.id}
              onClick={() => setSelectedId(selectedId === agent.id ? null : agent.id)}
            />
          ))
        )}
      </div>

      {/* Footer hint */}
      <div style={{
        marginTop: 24, textAlign: "center",
        fontSize: 11, color: "var(--text-muted)",
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
