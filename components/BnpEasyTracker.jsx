'use client'
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AreaChart, Area, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

// Minor adaptation from the imported tracker: replace Vite-specific import.meta.env with
// process.env.NODE_ENV checks so it works in Next.

const COURTAGE_RATE = 0.0035;

const BNP_ETFS = [
  { ticker: "ESE.PA",  name: "S&P 500 EUR C",          full: "BNP Easy S&P 500 UCITS ETF EUR C" },
  { ticker: "ESD.PA",  name: "S&P 500 USD C",          full: "BNP Easy S&P 500 UCITS ETF USD C" },
  { ticker: "ESEH.PA", name: "S&P 500 EUR Hedged",     full: "BNP Easy S&P 500 UCITS ETF EUR H" },
  { ticker: "ETZ.PA",  name: "Stoxx Europe 600",       full: "BNP Easy Stoxx Europe 600 UCITS ETF" },
  { ticker: "E40.PA",  name: "CAC 40 ESG",             full: "BNP Easy CAC 40 ESG UCITS ETF" },
  { ticker: "EWRD.PA", name: "MSCI World SRI PAB",     full: "BNP Easy MSCI World SRI PAB UCITS ETF" },
  { ticker: "EEA.PA",  name: "FTSE EPRA Eurozone",     full: "BNP Easy FTSE EPRA/NAREIT Eurozone ETF" },
  { ticker: "ECN.PA",  name: "Low Carbon 100 Europe",  full: "BNP Easy Low Carbon 100 Europe ETF" },
  { ticker: "ETSZ.DE", name: "Stoxx 600 (XETRA)",      full: "BNP Easy Stoxx Europe 600 EUR C (XETRA)" },
  { ticker: "ESEE.DE", name: "S&P 500 EUR C (XETRA)",  full: "BNP Easy S&P 500 UCITS ETF EUR C (XETRA)" },
  { ticker: "EWRD.DE", name: "MSCI World SRI (XETRA)", full: "BNP Easy MSCI World SRI PAB (XETRA)" },
];

const RANGES = [
  { label: "1D",  key: "1d",  days: 1,    interval: "5m"  },
  { label: "5D",  key: "5d",  days: 5,    interval: "30m" },
  { label: "1M",  key: "1m",  days: 30,   interval: "1d"  },
  { label: "2M",  key: "2m",  days: 60,   interval: "1d"  },
  { label: "5M",  key: "5m",  days: 150,  interval: "1d"  },
  { label: "1Y",  key: "1y",  days: 365,  interval: "1wk" },
  { label: "2Y",  key: "2y",  days: 730,  interval: "1wk" },
  { label: "3Y",  key: "3y",  days: 1095, interval: "1mo" },
  { label: "5Y",  key: "5y",  days: 1825, interval: "1mo" },
  { label: "10Y", key: "10y", days: 3650, interval: "3mo" },
];

const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

const f2 = (n, d = 2) => (n == null || isNaN(n) ? "—" : Number(n).toFixed(d));
const fEur = (n) => n == null || isNaN(n) ? "—" : `€${f2(n)}`;
const fPct = (n) => n == null || isNaN(n) ? "—" : `${n >= 0 ? "+" : ""}${f2(n)}%`;
const perfPct = (value, cost) => (cost > 0 ? ((value / cost) - 1) * 100 : 0);

const FRENCH_MONTHS = {
  janvier: 1, janv: 1,
  février: 2, fevrier: 2, févr: 2, fevr: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7, juil: 7,
  août: 8, aout: 8,
  septembre: 9, sept: 9,
  octobre: 10, oct: 10,
  novembre: 11, nov: 11,
  décembre: 12, decembre: 12, déc: 12, dec: 12,
};

const parseFrenchNumber = (raw) => {
  const cleaned = String(raw || "").trim()
    .replace(/€/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.+-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
};

const parseFrenchDate = (raw) => {
  const normalized = String(raw || "").trim().replace(/\u00A0/g, " ");
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 3) {
    const day = parseInt(parts[0].replace(/\D/g, ""), 10);
    const monthKey = parts[1].toLowerCase().replace(/\./g, "");
    const year = parseInt(parts[2].replace(/\D/g, ""), 10);
    const month = FRENCH_MONTHS[monthKey];
    if (day > 0 && month && year > 1900) {
      return new Date(year, month - 1, day);
    }
  }
  const iso = normalized.replace(/(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{4})/, "$3-$2-$1");
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const parseBulkPositions = (text) => {
  const lines = String(text || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const positions = [];
  for (let i = 0; i < lines.length; i += 1) {
    const date = parseFrenchDate(lines[i]);
    if (!date) continue;
    const price = parseFrenchNumber(lines[i + 1]);
    const qty = parseFrenchNumber(lines[i + 2]);
    if (price == null || qty == null) continue;
    positions.push({
      date: date.toISOString().slice(0, 10),
      price,
      qty,
    });
  }
  return positions;
};

const pnlEur = (value, cost) => value - cost;
const calculateCourtage = (amount) => amount * COURTAGE_RATE;

const downloadCSV = (positions) => {
  if (!positions.length) return;
  const headers = ["Date", "Ticker", "Name", "Price (€)", "Quantity", "Cost Basis (€)", "Courtage 0.5% (€)", "Total Invested (€)"];
  const rows = positions.map(p => {
    const costBasis = p.price * p.qty;
    const courtage = calculateCourtage(costBasis);
    const totalInvested = costBasis + courtage;
    return [
      p.date,
      p.ticker,
      p.name,
      p.price.toFixed(2),
      p.qty,
      costBasis.toFixed(2),
      courtage.toFixed(2),
      totalInvested.toFixed(2),
    ];
  });
  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `positions-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const solveLinearSystem = (matrix, rhs) => {
  const n = matrix.length;
  const a = matrix.map((row, i) => [...row, rhs[i]]);
  for (let i = 0; i < n; i += 1) {
    let pivot = i;
    for (let j = i + 1; j < n; j += 1) {
      if (Math.abs(a[j][i]) > Math.abs(a[pivot][i])) pivot = j;
    }
    if (pivot !== i) [a[i], a[pivot]] = [a[pivot], a[i]];
    const diag = a[i][i];
    if (!diag) return null;
    for (let j = i; j <= n; j += 1) a[i][j] /= diag;
    for (let r = 0; r < n; r += 1) {
      if (r === i) continue;
      const factor = a[r][i];
      for (let c = i; c <= n; c += 1) a[r][c] -= factor * a[i][c];
    }
  }
  return a.map(row => row[n]);
};

const polynomialRegression = (points, degree = 2) => {
  const n = points.length;
  if (n === 0) return Array(degree + 1).fill(0);
  if (n === 1) return [points[0][1], ...Array(degree).fill(0)];

  const sums = Array(2 * degree + 1).fill(0);
  const rhs = Array(degree + 1).fill(0);
  for (const [x, y] of points) {
    let xp = 1;
    for (let i = 0; i < sums.length; i += 1) {
      sums[i] += xp;
      xp *= x;
    }
    let yp = 1;
    for (let i = 0; i <= degree; i += 1) {
      rhs[i] += y * yp;
      yp *= x;
    }
  }

  const matrix = Array.from({ length: degree + 1 }, (_, i) =>
    Array.from({ length: degree + 1 }, (_, j) => sums[i + j])
  );
  const coeffs = solveLinearSystem(matrix, rhs);
  return coeffs || Array(degree + 1).fill(0);
};

const makeTrendSeries = (data, key) => {
  const points = data.map((item, index) => [index, item[key]]).filter(([, value]) => Number.isFinite(value));
  const coeffs = polynomialRegression(points, 2);
  return data.map((item, index) => {
    const trend = coeffs.reduce((sum, coef, power) => sum + coef * index ** power, 0);
    return { ...item, [`${key}Trend`]: trend };
  });
};

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
  const attempts = process.env.NODE_ENV === 'development'
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

export default function BnpEasyTracker() {
  const [etf, setEtf]               = useState(BNP_ETFS[0]);
  const [range, setRange]            = useState(RANGES[5]);
  const [chartData, setChartData]    = useState([]);
  const [meta, setMeta]              = useState(null);
  const [mktLoading, setMktLoading]  = useState(false);
  const [mktError, setMktError]      = useState(null);

  const [positions, setPositions]    = useState([]);
  const [pfChart, setPfChart]        = useState([]);
  const [pfLoading, setPfLoading]    = useState(false);
  const [showForm, setShowForm]      = useState(false);
  const [showImport, setShowImport]  = useState(false);
  const [importText, setImportText]  = useState("");
  const [importSummary, setImportSummary] = useState("");
  const [form, setForm]              = useState({ ticker: "ESE.PA", date: "", price: "", qty: "" });
  const [tab, setTab]                = useState("market");
  const [storageReady, setStorageReady] = useState(false);
  const [pfRange, setPfRange]        = useState(RANGES[5]);
  const [pfNormalized, setPfNormalized] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bnp-positions-v2");
      if (raw) setPositions(JSON.parse(raw));
      if (localStorage.getItem("bnp-pf-normalized") === "1") setPfNormalized(true);
    } catch {}
    setStorageReady(true);
  }, []);

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

  useEffect(() => {
    if (tab === "portfolio" && positions.length) computePortfolio();
  }, [tab]);

  const handlePfRange = (r) => {
    setPfRange(r);
    computePortfolio(r);
  };

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
  const importPositions = () => {
    const parsed = parseBulkPositions(importText);
    if (!parsed.length) {
      setImportSummary("No valid positions found. Paste rows with date, price and quantity.");
      return;
    }
    const ticker = etf?.ticker || BNP_ETFS[0].ticker;
    const name = BNP_ETFS.find(e => e.ticker === ticker)?.name || ticker;
    setPositions(prev => [
      ...prev,
      ...parsed.map(pos => ({
        id: Date.now() + Math.random(),
        ticker,
        name,
        date: pos.date,
        price: pos.price,
        qty: pos.qty,
      }))
    ]);
    setImportSummary(`Imported ${parsed.length} position${parsed.length !== 1 ? "s" : ""}.`);
    setImportText("");
    setShowImport(false);
  };
  const removePos = id => setPositions(p => p.filter(x => x.id !== id));

  const current    = meta?.regularMarketPrice;
  const prev       = meta?.chartPreviousClose || meta?.previousClose;
  const change     = current != null && prev != null ? current - prev : null;
  const changePct  = change != null && prev ? (change / prev) * 100 : null;
  const isUp       = change == null || change >= 0;
  const accent     = isUp ? "#22d3a5" : "#f06060";

  const prices = chartData.map(d => d.price);
  const minP   = prices.length ? Math.min(...prices) * 0.9985 : "auto";
  const maxP   = prices.length ? Math.max(...prices) * 1.0015 : "auto";

  const costBasis    = positions.reduce((s, p) => s + p.price * p.qty, 0);
  const courtageTotal = calculateCourtage(costBasis);
  const totalCost    = costBasis + courtageTotal;
  const lastPf       = pfChart[pfChart.length - 1];
  const totalVal     = lastPf?.value ?? 0;
  const gain         = totalVal - totalCost;
  const gainPct      = totalCost > 0 ? (gain / totalCost) * 100 : 0;
  const gainColor    = positions.length === 0 ? "#3a5070" : gain >= 0 ? "#22d3a5" : "#f06060";

  const pfPnlSeries = pfChart.map(d => d.pnl ?? pnlEur(d.value, d.cost));
  const pfChartWithTrends = useMemo(() => {
    if (!pfChart.length) return pfChart;
    return makeTrendSeries(makeTrendSeries(pfChart, "value"), "pnl");
  }, [pfChart]);
  const pnlPad = (v) => (v === 0 ? 50 : Math.abs(v) * 0.06);

  const pfMinY = !pfChart.length ? "auto" : pfNormalized
    ? Math.min(...pfPnlSeries, 0) - pnlPad(Math.min(...pfPnlSeries, 0))
    : Math.min(...pfChart.map(d => Math.min(d.value, d.cost))) * 0.995;
  const pfMaxY = !pfChart.length ? "auto" : pfNormalized
    ? Math.max(...pfPnlSeries, 0) + pnlPad(Math.max(...pfPnlSeries, 0))
    : Math.max(...pfChart.map(d => Math.max(d.value, d.cost))) * 1.005;

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

  return (
    <div>
      <style>{`\n        @keyframes spin { to { transform: rotate(360deg); } }\n        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }\n        * { box-sizing: border-box; margin: 0; padding: 0; }\n        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.4) sepia(1) hue-rotate(170deg); cursor: pointer; }\n        select option { background: #0a1120; }\n        ::-webkit-scrollbar { width: 5px; height: 5px; }\n        ::-webkit-scrollbar-track { background: #06090f; }\n        ::-webkit-scrollbar-thumb { background: #1e3050; border-radius: 3px; }\n        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }\n        input[type=number] { -moz-appearance: textfield; }\n        button { transition: opacity 0.15s, transform 0.1s; }\n        button:active { transform: scale(0.97); }\n      `}</style>

      <div style={{ minHeight: "70vh", background: "#06090f", color: "#e2e8f0", fontFamily: "'Syne', sans-serif" }}>

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

          <div style={{ marginLeft: "auto", display: "flex", background: "#07090f", border: "1px solid #111e33", borderRadius: 10, padding: 3, gap: 2, flexShrink: 0 }}>
            { ["market", "portfolio"].map(t => {
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

          {tab === "market" && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>
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

              <div style={{ marginBottom: 16 }}>
                <RangeBar current={range} onChange={setRange} />
              </div>

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

              <div style={{ marginTop: 10, fontSize: 10, color: "#1e3050", textAlign: "right" }}>
                Data via Yahoo Finance (15 min delay)
              </div>
            </div>
          )}

          {tab === "portfolio" && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
                <StatCard
                  label="Portfolio Value"
                  value={positions.length && totalVal ? fEur(totalVal) : "—"}
                  sub={`${positions.length} position${positions.length !== 1 ? "s" : ""}`}
                />
                <StatCard
                  label="Total Invested"
                  value={totalCost ? fEur(totalCost) : "—"}
                  sub={courtageTotal > 0 ? `${fEur(costBasis)} + ${fEur(courtageTotal)} courtage` : "Cost basis"}
                />
                <StatCard
                  label="Total P&L"
                  value={positions.length && totalVal ? `${gain >= 0 ? "+" : ""}${fEur(gain)}` : "—"}
                  sub={positions.length && totalVal ? `${gainPct >= 0 ? "+" : ""}${f2(gainPct)}%` : "Add positions"}
                  color={gainColor}
                />
              </div>

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
                    <ComposedChart data={pfChartWithTrends} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
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
                        <>
                          <Line
                            type="monotone" dataKey="cost" name="Invested"
                            stroke="#1e3050" strokeWidth={1.5}
                            strokeDasharray="5 4" dot={false}
                          />
                          <Line
                            type="monotone" dataKey="valueTrend" name="Tendance valeur"
                            stroke="#60a5fa" strokeWidth={1.5}
                            dot={false} strokeDasharray="6 4"
                          />
                          <Line
                            type="monotone" dataKey="pnlTrend" name="Tendance profit"
                            stroke="#34d399" strokeWidth={1.5}
                            dot={false} strokeDasharray="4 4"
                          />
                        </>
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                )}

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
                    {!pfNormalized && (
                      <>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 18, height: 2, background: "#60a5fa", display: "inline-block", borderRadius: 2 }} />
                          Tendance valeur
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 18, height: 2, background: "#34d399", display: "inline-block", borderRadius: 2 }} />
                          Tendance profit
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Positions</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={() => {
                      setShowImport(false);
                      setShowForm(!showForm);
                    }}
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
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setShowImport(!showImport);
                      setImportSummary("");
                    }}
                    style={{
                      background: showImport ? "transparent" : "#1e3050",
                      color: showImport ? "#f59e0b" : "#e2e8f0",
                      border: showImport ? "1px solid #f59e0b" : "none",
                      borderRadius: 9, padding: "8px 22px",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    {showImport ? "✕ Cancel" : "Import Positions"}
                  </button>
                  <button
                    onClick={() => downloadCSV(positions)}
                    disabled={!positions.length}
                    style={{
                      background: positions.length ? "#22d3a5" : "#1a2a42",
                      color: positions.length ? "#07090f" : "#2a4060",
                      border: "none",
                      borderRadius: 9, padding: "8px 22px",
                      fontSize: 12, fontWeight: 700, cursor: positions.length ? "pointer" : "not-allowed",
                    }}
                  >
                    ↓ Export CSV
                  </button>
                </div>
              </div>

              {showImport && (
                <div style={{
                  background: "#07090f", border: "1px solid #1e3050",
                  borderRadius: 14, padding: 22, marginBottom: 20,
                  animation: "fadeIn 0.2s ease",
                }}>
                  <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 11, letterSpacing: "0.8px", marginBottom: 14 }}>
                    BULK IMPORT
                  </div>
                  <textarea
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="Paste rows with date, price and quantity from your statement.\nExample:\n18 août 2024\n25,24 €\n21\n..."
                    style={{
                      width: "100%", minHeight: 180, resize: "vertical",
                      ...INPUT, padding: "14px 16px", fontSize: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                    <button
                      onClick={importPositions}
                      style={{
                        background: "#f59e0b", color: "#07090f",
                        border: "none", borderRadius: 9,
                        padding: "10px 24px", fontWeight: 700,
                        fontSize: 12, cursor: "pointer",
                      }}
                    >Import</button>
                    <button
                      onClick={() => { setImportText(""); setImportSummary(""); }}
                      style={{
                        background: "transparent", color: "#3a5070",
                        border: "1px solid #111e33", borderRadius: 9,
                        padding: "10px 24px", fontWeight: 700,
                        fontSize: 12, cursor: "pointer",
                      }}
                    >Clear</button>
                  </div>
                  {importSummary && (
                    <div style={{ marginTop: 12, color: "#2a4060", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                      {importSummary}
                    </div>
                  )}
                </div>
              )}

              {showForm && (
                <div style={{
                  background: "#07090f", border: "1px solid #f59e0b22",
                  borderRadius: 14, padding: 22, marginBottom: 20,
                  animation: "fadeIn 0.2s ease",
                }}>
                  <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 11, letterSpacing: "0.8px", marginBottom: 18 }}>
                    NEW POSITION
                  </div>

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

                  {form.price && form.qty && (
                    <div style={{ marginTop: 14, fontSize: 12, color: "#2a4060", fontFamily: "'JetBrains Mono', monospace", padding: "10px 14px", background: "#06090f", borderRadius: 8 }}>
                      Total cost: {" "}
                      <span style={{ color: "#f59e0b" }}>
                        €{f2(parseFloat(form.price || 0) * parseFloat(form.qty || 0))}
                      </span>
                      {" · "}
                      <span style={{ color: "#3a5070" }}>{form.qty} × €{f2(parseFloat(form.price || 0))}</span>
                    </div>
                  )}
                </div>
              )}

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
                        { ["ETF", "Buy Date", "Buy Price", "Qty", "Cost Basis", "Courtage", "Total Invested", ""].map(h => (
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
                      {positions.map((pos, i) => {
                        const costBasis = pos.price * pos.qty;
                        const courtage = calculateCourtage(costBasis);
                        const totalInvested = costBasis + courtage;
                        return (
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
                              €{f2(costBasis)}
                            </td>
                            <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#f59e0b77" }}>
                              €{f2(courtage)}
                            </td>
                            <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#f59e0b", fontWeight: 600 }}>
                              €{f2(totalInvested)}
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
                        );
                      })}
                    </tbody>
                    {positions.length > 1 && (
                      <tfoot>
                        <tr style={{ borderTop: "1px solid #0e1a2e", background: "#06090f" }}>
                          <td colSpan={4} style={{ padding: "11px 16px", fontSize: 11, color: "#2a4060", fontFamily: "'JetBrains Mono', monospace" }}>
                            TOTAL ({positions.length} positions)
                          </td>
                          <td style={{ padding: "11px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#f59e0b" }}>
                            €{f2(costBasis)}
                          </td>
                          <td style={{ padding: "11px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#f59e0b77" }}>
                            €{f2(courtageTotal)}
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
    </div>
  );
}
