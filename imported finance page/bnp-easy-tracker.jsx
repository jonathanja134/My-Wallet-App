import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

// ── Constants ────────────────────────────────────────────────────────────────

const BNP_ETFS = [
  { ticker: "ESE.PA",  name: "S&P 500 EUR C",          full: "BNP Easy S&P 500 UCITS ETF EUR C" }
];

const RANGES = [
  { label: "1D",  key: "1d",  days: 1,    interval: "5m"  },
  { label: "5D",  key: "5d",  days: 5,    interval: "30m" },
  { label: "1M",  key: "1m",  days: 30,   interval: "1d"  },
  { label: "2M",  key: "2m",  days: 60,   interval: "1d"  },
  { label: "6M",  key: "6m",  days: 150,  interval: "1d"  },
  { label: "1Y",  key: "1y",  days: 365,  interval: "1d" },
  { label: "2Y",  key: "2y",  days: 730,  interval: "1d" },
  { label: "3Y",  key: "3y",  days: 1095, interval: "1wk" },
  { label: "5Y",  key: "5y",  days: 1825, interval: "1mo" },
  { label: "10Y", key: "10y", days: 3650, interval: "3mo" },
];

const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const f2 = (n, d = 2) => (n == null || isNaN(n) ? "—" : Number(n).toFixed(d));
const fEur = (n) => n == null || isNaN(n) ? "—" : `€${f2(n)}`;
const fPct = (n) => n == null || isNaN(n) ? "—" : `${n >= 0 ? "+" : ""}${f2(n)}%`;

/** Return vs invested cost at that date (0% = break-even). */
const perfPct = (value, cost) => (cost > 0 ? ((value / cost) - 1) * 100 : 0);

const pnlEur = (value, cost) => value - cost;

function fmtLabel(ts, key) {
  const d = new Date(ts * 1000);
  if (key === "1d") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (key === "5d") return d.toLocaleDateString([], { weekday: "short" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (["1m", "2m", "5m"].includes(key)) return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleDateString([], { month: "short", year: "2-digit" });
}

function yahooChartPath(ticker, rangeKey, interval) {
  const now = Math.floor(Date.now() / 1000);
  const days = RANGES.find(r => r.key === rangeKey)?.days || 365;
  const p1 = now - days * 86400;
  return `/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${p1}&period2=${now}&interval=${interval}&includePrePost=false`;
}

async function fetchYahoo(ticker, rangeKey, interval) {
  const path = yahooChartPath(ticker, rangeKey, interval);
  const yahooUrl = `https://query1.finance.yahoo.com${path}`;
  const attempts = import.meta.env?.DEV
    ? [`/api/yahoo${path}`]
    : [
        yahooUrl,
        `https://query2.finance.yahoo.com${path}`,
        ...CORS_PROXIES.map((proxy) => proxy(yahooUrl)),
      ];

  let lastError = "Could not reach Yahoo Finance";
  for (const url of attempts) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        continue;
      }
      const data = await res.json();
      if (data?.chart?.error) {
        lastError = data.chart.error.description || "Yahoo Finance error";
        continue;
      }
      return data;
    } catch (e) {
      lastError = e.message || lastError;
    }
  }
  throw new Error(lastError);
}

function parseChart(data, rangeKey) {
  const result = data.chart?.result?.[0];
  if (!result) {
    const err = data.chart?.error?.description;
    throw new Error(err || "No data returned from API");
  }
  const ts = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const meta = result.meta || {};
  const points = ts
    .map((t, i) => ({ time: t, label: fmtLabel(t, rangeKey), price: closes[i] }))
    .filter(p => p.price != null && !isNaN(p.price));
  return { points, meta };
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const INPUT = {
  width: "100%",
  background: "#0d1526",
  color: "#e2e8f0",
  border: "1px solid #1e3050",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 12,
  fontFamily: "'JetBrains Mono', monospace",
  outline: "none",
};

const TT_WRAP = {
  background: "#0a1120",
  border: "1px solid #1e3050",
  borderRadius: 10,
  padding: "10px 16px",
  fontFamily: "'JetBrains Mono', monospace",
  boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
  minWidth: 140,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{
      width: 18, height: 18, border: "2px solid #f59e0b",
      borderTopColor: "transparent", borderRadius: "50%",
      animation: "spin 0.7s linear infinite", flexShrink: 0,
    }} />
  );
}

function LoadBox({ height, children }) {
  return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#3a5070" }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: "#090f1e", border: "1px solid #1a2a42", borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ fontSize: 10, color: "#3a5070", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 600, color: color || "#e2e8f0", letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#3a5070", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function ChartModeToggle({ normalized, onChange }) {
  return (
    <div style={{ display: "flex", background: "#06090f", border: "1px solid #1a2a42", borderRadius: 8, padding: 3, gap: 2 }}>
      {[
        { key: false, label: "€ Absolute" },
        { key: true,  label: "P&L" },
      ].map(({ key, label }) => {
        const active = normalized === key;
        return (
          <button key={String(key)} onClick={() => onChange(key)} style={{
            background: active ? "#1e3050" : "transparent",
            color: active ? "#e2e8f0" : "#3a5070",
            border: `1px solid ${active ? "#2a4060" : "transparent"}`,
            borderRadius: 6, padding: "5px 12px",
            fontSize: 10, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            cursor: "pointer", letterSpacing: "0.3px",
          }}>{label}</button>
        );
      })}
    </div>
  );
}

function RangeBar({ current, onChange }) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {RANGES.map(r => {
        const active = current.key === r.key;
        return (
          <button key={r.key} onClick={() => onChange(r)} style={{
            background: active ? "#f59e0b" : "#0a1120",
            color: active ? "#07090f" : "#3a5070",
            border: `1px solid ${active ? "#f59e0b" : "#1a2a42"}`,
            borderRadius: 7, padding: "5px 13px",
            fontSize: 11, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            cursor: "pointer", letterSpacing: "0.5px",
            transition: "all 0.15s",
          }}>{r.label}</button>
        );
      })}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  // Market
  const [etf, setEtf]               = useState(BNP_ETFS[0]);
  const [range, setRange]            = useState(RANGES[5]);
  const [chartData, setChartData]    = useState([]);
  const [meta, setMeta]              = useState(null);
  const [mktLoading, setMktLoading]  = useState(false);
  const [mktError, setMktError]      = useState(null);

  // Portfolio
  const [positions, setPositions]    = useState([]);
  const [pfChart, setPfChart]        = useState([]);
  const [pfLoading, setPfLoading]    = useState(false);
  const [showForm, setShowForm]      = useState(false);
  const [form, setForm]              = useState({ ticker: "ESE.PA", date: "", price: "", qty: "" });
  const [tab, setTab]                = useState("market");
  const [storageReady, setStorageReady] = useState(false);
  const [pfRange, setPfRange]        = useState(RANGES[5]);
  const [pfNormalized, setPfNormalized] = useState(false);

  // ── Fonts ──
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);

  // ── Load positions + chart prefs from localStorage ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bnp-positions-v2");
      if (raw) setPositions(JSON.parse(raw));
      if (localStorage.getItem("bnp-pf-normalized") === "1") setPfNormalized(true);
    } catch {}
    setStorageReady(true);
  }, []);

  // ── Save positions to localStorage ──
  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem("bnp-positions-v2", JSON.stringify(positions));
    } catch {}
  }, [positions, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    try { localStorage.setItem("bnp-pf-normalized", pfNormalized ? "1" : "0"); } catch {}
  }, [pfNormalized, storageReady]);

  // ── Fetch market chart ──
  useEffect(() => {
    setMktLoading(true);
    setMktError(null);
    fetchYahoo(etf.ticker, range.key, range.interval)
      .then(data => {
        const { points, meta } = parseChart(data, range.key);
        setChartData(points);
        setMeta(meta);
      })
      .catch(e => setMktError(e.message))
      .finally(() => setMktLoading(false));
  }, [etf, range]);

  // ── Compute portfolio performance ──
  const computePortfolio = useCallback(async (r) => {
    const activeRange = r || pfRange;
    if (!positions.length) return;
    setPfLoading(true);
    try {
      const tickers = [...new Set(positions.map(p => p.ticker))];
      const histMap = {};
      await Promise.all(tickers.map(async t => {
        try {
          const data = await fetchYahoo(t, activeRange.key, activeRange.interval);
          const { points } = parseChart(data, activeRange.key);
          histMap[t] = points;
        } catch {}
      }));

      const allTimes = [...new Set(
        Object.values(histMap).flatMap(h => h.map(p => p.time))
      )].sort((a, b) => a - b);

      // Forward-fill price lookup
      const priceAt = (ticker, ts) => {
        const hist = histMap[ticker];
        if (!hist?.length) return null;
        let best = null;
        for (const p of hist) {
          if (p.time <= ts) best = p.price;
          else break;
        }
        return best;
      };

      const result = allTimes.map(ts => {
        let value = 0, cost = 0, hasSomething = false;
        positions.forEach(pos => {
          const buyTs = new Date(pos.date).getTime() / 1000;
          if (ts < buyTs) return;
          const price = priceAt(pos.ticker, ts);
          if (price) {
            value += price * pos.qty;
            cost  += pos.price * pos.qty;
            hasSomething = true;
          }
        });
        if (!hasSomething) return null;
        return {
          time: ts,
          label: fmtLabel(ts, activeRange.key),
          value,
          cost,
          pnl: pnlEur(value, cost),
        };
      }).filter(Boolean);

      setPfChart(result);
    } catch (e) { console.error(e); }
    setPfLoading(false);
  }, [positions, pfRange]);

  // Auto-refresh portfolio when switching to portfolio tab
  useEffect(() => {
    if (tab === "portfolio" && positions.length) computePortfolio();
  }, [tab]); // eslint-disable-line

  const handlePfRange = (r) => {
    setPfRange(r);
    computePortfolio(r);
  };

  // ── Position CRUD ──
  const addPos = () => {
    const { ticker, date, price, qty } = form;
    if (!date || !price || !qty) return;
    setPositions(prev => [...prev, {
      id: Date.now(),
      ticker,
      name: BNP_ETFS.find(e => e.ticker === ticker)?.name || ticker,
      date,
      price: parseFloat(price),
      qty:   parseFloat(qty),
    }]);
    setForm(f => ({ ...f, date: "", price: "", qty: "" }));
    setShowForm(false);
  };
  const removePos = id => setPositions(p => p.filter(x => x.id !== id));

  // ── Derived values ──
  const current    = meta?.regularMarketPrice;
  const prev       = meta?.chartPreviousClose || meta?.previousClose;
  const change     = current != null && prev != null ? current - prev : null;
  const changePct  = change != null && prev ? (change / prev) * 100 : null;
  const isUp       = change == null || change >= 0;
  const accent     = isUp ? "#22d3a5" : "#f06060";

  const prices = chartData.map(d => d.price);
  const minP   = prices.length ? Math.min(...prices) * 0.9985 : "auto";
  const maxP   = prices.length ? Math.max(...prices) * 1.0015 : "auto";

  const totalCost    = positions.reduce((s, p) => s + p.price * p.qty, 0);
  const lastPf       = pfChart[pfChart.length - 1];
  const totalVal     = lastPf?.value ?? 0;
  const gain         = totalVal - totalCost;
  const gainPct      = totalCost > 0 ? (gain / totalCost) * 100 : 0;
  const gainColor    = positions.length === 0 ? "#3a5070" : gain >= 0 ? "#22d3a5" : "#f06060";

  const pfPnlSeries = pfChart.map(d => d.pnl ?? pnlEur(d.value, d.cost));
  const pnlPad = (v) => (v === 0 ? 50 : Math.abs(v) * 0.06);

  const pfMinY = !pfChart.length ? "auto" : pfNormalized
    ? Math.min(...pfPnlSeries, 0) - pnlPad(Math.min(...pfPnlSeries, 0))
    : Math.min(...pfChart.map(d => Math.min(d.value, d.cost))) * 0.995;
  const pfMaxY = !pfChart.length ? "auto" : pfNormalized
    ? Math.max(...pfPnlSeries, 0) + pnlPad(Math.max(...pfPnlSeries, 0))
    : Math.max(...pfChart.map(d => Math.max(d.value, d.cost))) * 1.005;

  // ── Market tooltip ──
  const MktTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={TT_WRAP}>
        <div style={{ color: "#3a5070", fontSize: 10, marginBottom: 6 }}>{d?.label}</div>
        <div style={{ color: accent, fontSize: 16, fontWeight: 600 }}>
          {f2(d?.price)} <span style={{ fontSize: 11, color: "#3a5070" }}>{meta?.currency || "EUR"}</span>
        </div>
      </div>
    );
  };

  // ── Portfolio tooltip ──
  const PfTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    const g = d.pnl ?? pnlEur(d.value, d.cost);
    const pct = perfPct(d.value, d.cost);
    const gColor = g >= 0 ? "#22d3a5" : "#f06060";
    return (
      <div style={TT_WRAP}>
        <div style={{ color: "#3a5070", fontSize: 10, marginBottom: 8 }}>{d.label}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          {pfNormalized && (
            <div style={{ color: gColor, fontSize: 15, fontWeight: 600, marginBottom: 2 }}>
              P&L {g >= 0 ? "+" : ""}{fEur(g)} ({fPct(pct)})
            </div>
          )}
          <div style={{ color: "#f59e0b" }}>Value  {fEur(d.value)}</div>
          <div style={{ color: "#3a5070" }}>Invested  {fEur(d.cost)}</div>
          {!pfNormalized && (
            <div style={{ color: gColor, borderTop: "1px solid #1e3050", paddingTop: 4, marginTop: 2 }}>
              P&L  {g >= 0 ? "+" : ""}{fEur(g)} ({fPct(pct)})
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #06090f; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.4) sepia(1) hue-rotate(170deg); cursor: pointer; }
        select option { background: #0a1120; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #06090f; }
        ::-webkit-scrollbar-thumb { background: #1e3050; border-radius: 3px; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        button { transition: opacity 0.15s, transform 0.1s; }
        button:active { transform: scale(0.97); }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#06090f", color: "#e2e8f0", fontFamily: "'Syne', sans-serif" }}>

        {/* ──────────── HEADER ──────────── */}
        <header style={{
          background: "#07090f",
          borderBottom: "1px solid #111e33",
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          gap: 18,
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(12px)",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 16, color: "#07090f",
              boxShadow: "0 0 16px #f59e0b44",
            }}>B</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.3px", lineHeight: 1.1 }}>BNP Easy</div>
              <div style={{ fontSize: 9, color: "#2a4060", letterSpacing: "1.2px" }}>PORTFOLIO TRACKER</div>
            </div>
          </div>

          {/* ETF picker — market tab only */}
          {tab === "market" && (
            <select
              value={etf.ticker}
              onChange={e => setEtf(BNP_ETFS.find(f => f.ticker === e.target.value))}
              style={{ ...INPUT, maxWidth: 360, flex: 1 }}
            >
              {BNP_ETFS.map(f => (
                <option key={f.ticker} value={f.ticker}>{f.ticker} — {f.name}</option>
              ))}
            </select>
          )}

          {/* Tab switcher */}
          <div style={{ marginLeft: "auto", display: "flex", background: "#07090f", border: "1px solid #111e33", borderRadius: 10, padding: 3, gap: 2, flexShrink: 0 }}>
            {["market", "portfolio"].map(t => {
              const active = tab === t;
              const label  = t === "portfolio"
                ? `Portfolio${positions.length ? ` (${positions.length})` : ""}`
                : "Market";
              return (
                <button key={t} onClick={() => setTab(t)} style={{
                  background: active ? "#f59e0b" : "transparent",
                  color: active ? "#07090f" : "#3a5070",
                  border: "none", borderRadius: 7,
                  padding: "7px 22px", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", letterSpacing: "0.3px", textTransform: "capitalize",
                }}>{label}</button>
              );
            })}
          </div>
        </header>

        <main style={{ padding: "28px 28px", maxWidth: 1100, margin: "0 auto" }}>

          {/* ─────────── MARKET TAB ─────────── */}
          {tab === "market" && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>

              {/* Price header */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, color: "#2a4060", letterSpacing: "0.5px", marginBottom: 10 }}>{etf.full}</div>

                {mktLoading && !meta ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#2a4060", marginBottom: 12 }}>
                    <Spinner /><span style={{ fontSize: 13 }}>Fetching live price…</span>
                  </div>
                ) : meta ? (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 52, fontWeight: 600, letterSpacing: "-2.5px", lineHeight: 1 }}>
                        {f2(current)}
                        <span style={{ fontSize: 16, color: "#2a4060", marginLeft: 10, letterSpacing: 0 }}>{meta.currency || "EUR"}</span>
                      </div>
                      {change != null && (
                        <div style={{ marginBottom: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, color: accent }}>
                          {isUp ? "▲" : "▼"} {f2(Math.abs(change))} ({isUp ? "+" : ""}{f2(changePct)}%)
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 24, marginTop: 12, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "#2a4060", flexWrap: "wrap" }}>
                      {[
                        ["Open",  meta.regularMarketOpen],
                        ["High",  meta.regularMarketDayHigh],
                        ["Low",   meta.regularMarketDayLow],
                        ["Prev",  prev],
                        ["Vol",   meta.regularMarketVolume != null ? meta.regularMarketVolume.toLocaleString() : null],
                      ].map(([k, v]) => v != null && (
                        <span key={k}>{k}: <span style={{ color: "#7a98b8" }}>{typeof v === "number" ? f2(v) : v}</span></span>
                      ))}
                    </div>
                  </>
                ) : mktError ? (
                  <div style={{ color: "#f06060", fontSize: 13, marginBottom: 8 }}>⚠ {mktError}</div>
                ) : null}
              </div>

              {/* Range buttons */}
              <div style={{ marginBottom: 16 }}>
                <RangeBar current={range} onChange={setRange} />
              </div>

              {/* Chart */}
              <div style={{ background: "#07090f", border: "1px solid #111e33", borderRadius: 16, padding: "20px 12px 12px" }}>
                {mktLoading ? (
                  <LoadBox height={360}>
                    <Spinner />
                    <span style={{ fontSize: 13 }}>Loading chart data…</span>
                  </LoadBox>
                ) : mktError ? (
                  <LoadBox height={360}>
                    <div style={{ fontSize: 22 }}>⚠</div>
                    <div style={{ color: "#f06060", fontSize: 13 }}>API Error: {mktError}</div>
                    <div style={{ fontSize: 11, color: "#2a4060" }}>Yahoo Finance data may be temporarily unavailable</div>
                  </LoadBox>
                ) : (
                  <ResponsiveContainer width="100%" height={360}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                      <defs>
                        <linearGradient id="gMkt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor={accent} stopOpacity={0.22} />
                          <stop offset="100%" stopColor={accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="1 5" stroke="#0e1a2e" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#2a4060", fontSize: 10, fontFamily: "JetBrains Mono" }}
                        tickLine={false} axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[minP, maxP]}
                        tick={{ fill: "#2a4060", fontSize: 10, fontFamily: "JetBrains Mono" }}
                        tickLine={false} axisLine={false}
                        tickFormatter={v => f2(v)} width={58}
                      />
                      <Tooltip content={<MktTooltip />} cursor={{ stroke: "#1e3050", strokeWidth: 1 }} />
                      {prev && (
                        <ReferenceLine y={prev} stroke="#1e3050" strokeDasharray="3 5" strokeWidth={1} />
                      )}
                      <Area
                        type="monotone" dataKey="price"
                        stroke={accent} strokeWidth={1.8}
                        fill="url(#gMkt)" dot={false}
                        activeDot={{ r: 4, fill: accent, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Footnote */}
              <div style={{ marginTop: 10, fontSize: 10, color: "#1e3050", textAlign: "right" }}>
                Data via Yahoo Finance (15 min delay)
              </div>
            </div>
          )}

          {/* ─────────── PORTFOLIO TAB ─────────── */}
          {tab === "portfolio" && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>

              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
                <StatCard
                  label="Portfolio Value"
                  value={positions.length && totalVal ? fEur(totalVal) : "—"}
                  sub={`${positions.length} position${positions.length !== 1 ? "s" : ""}`}
                />
                <StatCard
                  label="Total Invested"
                  value={totalCost ? fEur(totalCost) : "—"}
                  sub="Cost basis"
                />
                <StatCard
                  label="Total P&L"
                  value={positions.length && totalVal ? `${gain >= 0 ? "+" : ""}${fEur(gain)}` : "—"}
                  sub={positions.length && totalVal ? `${gainPct >= 0 ? "+" : ""}${f2(gainPct)}%` : "Add positions"}
                  color={gainColor}
                />
              </div>

              {/* Portfolio chart section */}
              <div style={{ background: "#07090f", border: "1px solid #111e33", borderRadius: 16, padding: "20px 12px 16px", marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 8px", flexWrap: "wrap", gap: 10 }}>
                  <RangeBar current={pfRange} onChange={handlePfRange} />
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <ChartModeToggle normalized={pfNormalized} onChange={setPfNormalized} />
                    <button
                      onClick={() => computePortfolio()}
                      style={{
                        background: "transparent", color: "#f59e0b",
                        border: "1px solid #f59e0b33", borderRadius: 8,
                        padding: "6px 16px", fontSize: 11, fontWeight: 700,
                        cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: "0.3px",
                      }}
                    >↻ Refresh</button>
                  </div>
                </div>
                {pfNormalized && pfChart.length > 0 && (
                  <div style={{ fontSize: 10, color: "#2a4060", marginBottom: 12, padding: "0 8px", fontFamily: "'JetBrains Mono', monospace" }}>
                    Axe Y : P&L en euros (valeur − investi) · ligne pointillée = 0 €
                  </div>
                )}

                {pfLoading ? (
                  <LoadBox height={280}>
                    <Spinner />
                    <span style={{ fontSize: 13 }}>Computing portfolio performance…</span>
                  </LoadBox>
                ) : pfChart.length === 0 ? (
                  <LoadBox height={280}>
                    <div style={{ fontSize: 28 }}>📈</div>
                    <div style={{ fontSize: 13 }}>
                      {positions.length === 0
                        ? "Add positions to see performance"
                        : "Click Refresh to load your chart"}
                    </div>
                  </LoadBox>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={pfChart} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                      <defs>
                        <linearGradient id="gPf" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#f59e0b" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="1 5" stroke="#0e1a2e" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#2a4060", fontSize: 10, fontFamily: "JetBrains Mono" }}
                        tickLine={false} axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[pfMinY, pfMaxY]}
                        tick={{ fill: "#2a4060", fontSize: 10, fontFamily: "JetBrains Mono" }}
                        tickLine={false} axisLine={false}
                        tickFormatter={v => pfNormalized ? fEur(v) : `€${Math.round(v)}`}
                        width={76}
                      />
                      <Tooltip content={<PfTooltip />} cursor={{ stroke: "#1e3050", strokeWidth: 1 }} />
                      {pfNormalized && (
                        <ReferenceLine y={0} stroke="#1e3050" strokeDasharray="5 4" strokeWidth={1.5} />
                      )}
                      <Area
                        type="monotone"
                        dataKey={pfNormalized ? "pnl" : "value"}
                        name={pfNormalized ? "P&L" : "Value"}
                        stroke="#f59e0b" strokeWidth={2}
                        fill="url(#gPf)" dot={false}
                        activeDot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
                      />
                      {!pfNormalized && (
                        <Line
                          type="monotone" dataKey="cost" name="Invested"
                          stroke="#1e3050" strokeWidth={1.5}
                          strokeDasharray="5 4" dot={false}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                )}

                {/* Legend */}
                {pfChart.length > 0 && (
                  <div style={{ display: "flex", gap: 20, marginTop: 12, padding: "0 8px", fontSize: 11, color: "#2a4060", fontFamily: "'JetBrains Mono', monospace", flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 18, height: 2, background: "#f59e0b", display: "inline-block", borderRadius: 2 }} />
                      {pfNormalized ? "P&L (€)" : "Portfolio Value"}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 18, height: 0, border: "1px dashed #1e3050", display: "inline-block" }} />
                      {pfNormalized ? "Break-even (0 €)" : "Cost Basis"}
                    </span>
                  </div>
                )}
              </div>

              {/* Positions header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Positions</div>
                <button
                  onClick={() => setShowForm(!showForm)}
                  style={{
                    background: showForm ? "transparent" : "#f59e0b",
                    color: showForm ? "#f06060" : "#07090f",
                    border: showForm ? "1px solid #f06060" : "none",
                    borderRadius: 9, padding: "8px 22px",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  {showForm ? "✕ Cancel" : "+ Add Position"}
                </button>
              </div>

              {/* Add position form */}
              {showForm && (
                <div style={{
                  background: "#07090f", border: "1px solid #f59e0b22",
                  borderRadius: 14, padding: 22, marginBottom: 20,
                  animation: "fadeIn 0.2s ease",
                }}>
                  <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 11, letterSpacing: "0.8px", marginBottom: 18 }}>
                    NEW POSITION
                  </div>

                  {/* Grid of fields */}
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1.1fr 1.1fr 1fr auto", gap: 12, alignItems: "end" }}>

                    <div>
                      <div style={{ fontSize: 10, color: "#2a4060", letterSpacing: "0.7px", textTransform: "uppercase", marginBottom: 7 }}>ETF</div>
                      <select value={form.ticker} onChange={e => setForm(f => ({ ...f, ticker: e.target.value }))} style={INPUT}>
                        {BNP_ETFS.map(f => <option key={f.ticker} value={f.ticker}>{f.ticker} — {f.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <div style={{ fontSize: 10, color: "#2a4060", letterSpacing: "0.7px", textTransform: "uppercase", marginBottom: 7 }}>Buy Date</div>
                      <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={INPUT} />
                    </div>

                    <div>
                      <div style={{ fontSize: 10, color: "#2a4060", letterSpacing: "0.7px", textTransform: "uppercase", marginBottom: 7 }}>Buy Price (€)</div>
                      <input type="number" step="0.01" placeholder="0.00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} style={INPUT} />
                    </div>

                    <div>
                      <div style={{ fontSize: 10, color: "#2a4060", letterSpacing: "0.7px", textTransform: "uppercase", marginBottom: 7 }}>Qty</div>
                      <input type="number" step="any" placeholder="0" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} style={INPUT} />
                    </div>

                    <button
                      onClick={addPos}
                      style={{
                        background: "#f59e0b", color: "#07090f",
                        border: "none", borderRadius: 9,
                        padding: "0 22px", fontWeight: 700,
                        fontSize: 13, cursor: "pointer", height: 40,
                        alignSelf: "end",
                      }}
                    >Add</button>
                  </div>

                  {/* Preview cost */}
                  {form.price && form.qty && (
                    <div style={{ marginTop: 14, fontSize: 12, color: "#2a4060", fontFamily: "'JetBrains Mono', monospace", padding: "10px 14px", background: "#06090f", borderRadius: 8 }}>
                      Total cost:{" "}
                      <span style={{ color: "#f59e0b" }}>
                        €{f2(parseFloat(form.price || 0) * parseFloat(form.qty || 0))}
                      </span>
                      {" · "}
                      <span style={{ color: "#3a5070" }}>{form.qty} × €{f2(parseFloat(form.price || 0))}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Positions table */}
              {positions.length === 0 ? (
                <div style={{
                  border: "1px dashed #111e33", borderRadius: 14,
                  padding: "50px 20px", textAlign: "center",
                  color: "#2a4060", fontSize: 13,
                }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>🗂</div>
                  No positions yet — add your first above
                </div>
              ) : (
                <div style={{ background: "#07090f", border: "1px solid #111e33", borderRadius: 14, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #0e1a2e" }}>
                        {["ETF", "Buy Date", "Buy Price", "Qty", "Cost Basis", ""].map(h => (
                          <th key={h} style={{
                            padding: "11px 16px", textAlign: "left",
                            fontSize: 9, color: "#2a4060",
                            fontWeight: 600, letterSpacing: "0.8px",
                            fontFamily: "'JetBrains Mono', monospace",
                            textTransform: "uppercase",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((pos, i) => (
                        <tr
                          key={pos.id}
                          style={{ borderBottom: i < positions.length - 1 ? "1px solid #0a1120" : "none" }}
                        >
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{pos.ticker}</div>
                            <div style={{ fontSize: 10, color: "#2a4060", marginTop: 3 }}>{pos.name}</div>
                          </td>
                          <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#5a7890" }}>{pos.date}</td>
                          <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{f2(pos.price)}</td>
                          <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{pos.qty}</td>
                          <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#f59e0b" }}>
                            €{f2(pos.price * pos.qty)}
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <button
                              onClick={() => removePos(pos.id)}
                              style={{
                                background: "none", border: "1px solid #111e33",
                                color: "#2a4060", cursor: "pointer",
                                borderRadius: 6, padding: "4px 9px",
                                fontSize: 13,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.color = "#f06060"; e.currentTarget.style.borderColor = "#f0606033"; }}
                              onMouseLeave={e => { e.currentTarget.style.color = "#2a4060"; e.currentTarget.style.borderColor = "#111e33"; }}
                            >✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Footer totals */}
                    {positions.length > 1 && (
                      <tfoot>
                        <tr style={{ borderTop: "1px solid #0e1a2e", background: "#06090f" }}>
                          <td colSpan={4} style={{ padding: "11px 16px", fontSize: 11, color: "#2a4060", fontFamily: "'JetBrains Mono', monospace" }}>
                            TOTAL ({positions.length} positions)
                          </td>
                          <td style={{ padding: "11px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#f59e0b", fontWeight: 600 }}>
                            €{f2(totalCost)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              <div style={{ marginTop: 12, fontSize: 10, color: "#1e3050", textAlign: "right" }}>
                Data via Yahoo Finance (15 min delay) · Portfolio saved locally
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}
