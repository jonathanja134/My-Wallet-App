"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  ArrowUp,
  ArrowDown,
  Plus,
  Upload,
  Download,
  RefreshCw,
  X,
  FolderOpen,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Constants & pure helpers (unchanged business logic from the original tracker)
// ---------------------------------------------------------------------------

const COURTAGE_RATE = 0.00374

const BNP_ETFS = [
  { ticker: "ESE.PA", name: "S&P 500 EUR C", full: "BNP Easy S&P 500 UCITS ETF EUR C" },
]

const RANGES = [
  { label: "1D", key: "1d", days: 1, interval: "5m" },
  { label: "5D", key: "5d", days: 5, interval: "30m" },
  { label: "1M", key: "1m", days: 30, interval: "1d" },
  { label: "2M", key: "2m", days: 60, interval: "1d" },
  { label: "5M", key: "5m", days: 150, interval: "1d" },
  { label: "1Y", key: "1y", days: 365, interval: "1wk" },
  { label: "2Y", key: "2y", days: 730, interval: "1wk" },
  { label: "3Y", key: "3y", days: 1095, interval: "1mo" },
  { label: "5Y", key: "5y", days: 1825, interval: "1mo" },
  { label: "10Y", key: "10y", days: 3650, interval: "3mo" },
]

const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
]

const f2 = (n: number | null | undefined, d = 2) =>
  n == null || isNaN(n as number) ? "—" : Number(n).toFixed(d)
const fEur = (n: number | null | undefined) => (n == null || isNaN(n as number) ? "—" : `${f2(n)} €`)
const fPct = (n: number | null | undefined) =>
  n == null || isNaN(n as number) ? "—" : `${n >= 0 ? "+" : ""}${f2(n)}%`
const perfPct = (value: number, cost: number) => (cost > 0 ? (value / cost - 1) * 100 : 0)
const pnlEur = (value: number, cost: number) => value - cost
const calculateCourtage = (amount: number) => amount * COURTAGE_RATE

const FRENCH_MONTHS: Record<string, number> = {
  janvier: 1, janv: 1, février: 2, fevrier: 2, févr: 2, fevr: 2, mars: 3, avril: 4, mai: 5,
  juin: 6, juillet: 7, juil: 7, août: 8, aout: 8, septembre: 9, sept: 9, octobre: 10, oct: 10,
  novembre: 11, nov: 11, décembre: 12, decembre: 12, déc: 12, dec: 12,
}

const parseFrenchNumber = (raw: string) => {
  const cleaned = String(raw || "")
    .trim()
    .replace(/€/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.+-]/g, "")
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

const createPositionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const parseFrenchDate = (raw: string) => {
  const normalized = String(raw || "").trim().replace(/\u00A0/g, " ")
  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length === 3) {
    const day = parseInt(parts[0].replace(/\D/g, ""), 10)
    const monthKey = parts[1].toLowerCase().replace(/\./g, "")
    const year = parseInt(parts[2].replace(/\D/g, ""), 10)
    const month = FRENCH_MONTHS[monthKey]
    if (day > 0 && month && year > 1900) return new Date(year, month - 1, day)
  }
  const iso = normalized.replace(/(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{4})/, "$3-$2-$1")
  const dt = new Date(iso)
  return Number.isNaN(dt.getTime()) ? null : dt
}

const parseBulkPositions = (text: string) => {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const positions: { date: string; price: number; qty: number }[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const date = parseFrenchDate(lines[i])
    if (!date) continue
    const price = parseFrenchNumber(lines[i + 1])
    const qty = parseFrenchNumber(lines[i + 2])
    if (price == null || qty == null) continue
    positions.push({ date: date.toISOString().slice(0, 10), price, qty })
  }
  return positions
}

const downloadCSV = (positions: any[]) => {
  if (!positions.length) return
  const headers = [
    "Date", "Ticker", "Name", "Price (€)", "Quantity",
    "Cost Basis (€)", "Courtage 0.5% (€)", "Total Invested (€)",
  ]
  const rows = positions.map((p) => {
    const costBasis = p.price * p.qty
    const courtage = calculateCourtage(costBasis)
    const totalInvested = costBasis + courtage
    return [p.date, p.ticker, p.name, p.price.toFixed(2), p.qty, costBasis.toFixed(2), courtage.toFixed(2), totalInvested.toFixed(2)]
  })
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `positions-${new Date().toISOString().split("T")[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const solveLinearSystem = (matrix: number[][], rhs: number[]) => {
  const n = matrix.length
  const a = matrix.map((row, i) => [...row, rhs[i]])
  for (let i = 0; i < n; i += 1) {
    let pivot = i
    for (let j = i + 1; j < n; j += 1) if (Math.abs(a[j][i]) > Math.abs(a[pivot][i])) pivot = j
    if (pivot !== i) [a[i], a[pivot]] = [a[pivot], a[i]]
    const diag = a[i][i]
    if (!diag) return null
    for (let j = i; j <= n; j += 1) a[i][j] /= diag
    for (let r = 0; r < n; r += 1) {
      if (r === i) continue
      const factor = a[r][i]
      for (let c = i; c <= n; c += 1) a[r][c] -= factor * a[i][c]
    }
  }
  return a.map((row) => row[n])
}

const polynomialRegression = (points: [number, number][], degree = 2) => {
  const n = points.length
  if (n === 0) return Array(degree + 1).fill(0)
  if (n === 1) return [points[0][1], ...Array(degree).fill(0)]
  const sums = Array(2 * degree + 1).fill(0)
  const rhs = Array(degree + 1).fill(0)
  for (const [x, y] of points) {
    let xp = 1
    for (let i = 0; i < sums.length; i += 1) { sums[i] += xp; xp *= x }
    let yp = 1
    for (let i = 0; i <= degree; i += 1) { rhs[i] += y * yp; yp *= x }
  }
  const matrix = Array.from({ length: degree + 1 }, (_, i) => Array.from({ length: degree + 1 }, (_, j) => sums[i + j]))
  const coeffs = solveLinearSystem(matrix, rhs)
  return coeffs || Array(degree + 1).fill(0)
}

const makeTrendSeries = (data: any[], key: string) => {
  const points = data.map((item, index) => [index, item[key]] as [number, number]).filter(([, value]) => Number.isFinite(value))
  const coeffs = polynomialRegression(points, 2)
  return data.map((item, index) => {
    const trend = coeffs.reduce((sum, coef, power) => sum + coef * index ** power, 0)
    return { ...item, [`${key}Trend`]: trend }
  })
}

function fmtLabel(ts: number, key: string) {
  const d = new Date(ts * 1000)
  if (key === "1d") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (key === "5d") return d.toLocaleDateString([], { weekday: "short" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (["1m", "2m", "5m"].includes(key)) return d.toLocaleDateString([], { month: "short", day: "numeric" })
  return d.toLocaleDateString([], { month: "short", year: "2-digit" })
}

function yahooChartPath(ticker: string, rangeKey: string, interval: string) {
  const now = Math.floor(Date.now() / 1000)
  const days = RANGES.find((r) => r.key === rangeKey)?.days || 365
  const p1 = now - days * 86400
  return `/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${p1}&period2=${now}&interval=${interval}&includePrePost=false`
}

async function fetchYahoo(ticker: string, rangeKey: string, interval: string) {
  const path = yahooChartPath(ticker, rangeKey, interval)
  const yahooUrl = `https://query1.finance.yahoo.com${path}`
  const attempts =
    process.env.NODE_ENV === "development"
      ? [`/api/yahoo${path}`]
      : [yahooUrl, `https://query2.finance.yahoo.com${path}`, ...CORS_PROXIES.map((proxy) => proxy(yahooUrl))]

  let lastError = "Could not reach Yahoo Finance"
  for (const url of attempts) {
    try {
      const res = await fetch(url)
      if (!res.ok) { lastError = `HTTP ${res.status}`; continue }
      const data = await res.json()
      if (data?.chart?.error) { lastError = data.chart.error.description || "Yahoo Finance error"; continue }
      return data
    } catch (e: any) {
      lastError = e.message || lastError
    }
  }
  throw new Error(lastError)
}

function parseChart(data: any, rangeKey: string) {
  const result = data.chart?.result?.[0]
  if (!result) {
    const err = data.chart?.error?.description
    throw new Error(err || "No data returned from API")
  }
  const ts: number[] = result.timestamp || []
  const closes: number[] = result.indicators?.quote?.[0]?.close || []
  const meta = result.meta || {}
  const points = ts
    .map((t, i) => ({ time: t, label: fmtLabel(t, rangeKey), price: closes[i] }))
    .filter((p) => p.price != null && !isNaN(p.price))
  return { points, meta }
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function LoadBox({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 text-muted-foreground"
      style={{ height }}
    >
      {children}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string
  value: string
  sub?: string
  tone?: "default" | "positive" | "negative" | "muted"
}) {
  const toneClass =
    tone === "positive" ? "text-green-600" : tone === "negative" ? "text-red-600" : tone === "muted" ? "text-muted-foreground" : "text-foreground"
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{label}</p>
        <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function ModeToggle({ normalized, onChange }: { normalized: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {[
        { key: false, label: "€ Valeur" },
        { key: true, label: "P&L" },
      ].map(({ key, label }) => (
        <button
          key={String(key)}
          onClick={() => onChange(key)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            normalized === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function RangeBar({ current, onChange }: { current: (typeof RANGES)[number]; onChange: (r: (typeof RANGES)[number]) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {RANGES.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            current.key === r.key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

// Tooltip styling shared by both charts — matches the app's popover token.
const tooltipClass =
  "rounded-lg border border-border bg-popover px-4 py-3 text-popover-foreground shadow-lg text-xs min-w-[150px]"

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type Tab = "market" | "portfolio"

interface BnpEasyTrackerProps {
  tab?: Tab
  onTabChange?: (tab: Tab) => void
}

export default function BnpEasyTracker({ tab: tabProp, onTabChange }: BnpEasyTrackerProps = {}) {
  // Controlled if a parent passes `tab`/`onTabChange` (e.g. BnpEasyTrackerWrapper driving
  // the switcher from the PageHeader) — otherwise falls back to internal state so this
  // component still works standalone.
  const [internalTab] = useState<Tab>("market")
  const tab = tabProp ?? internalTab

  const [etf] = useState(BNP_ETFS[0])
  const [range, setRange] = useState(RANGES[5])
  const [chartData, setChartData] = useState<any[]>([])
  const [meta, setMeta] = useState<any>(null)
  const [mktLoading, setMktLoading] = useState(false)
  const [mktError, setMktError] = useState<string | null>(null)

  const [positions, setPositions] = useState<any[]>([])
  const [pfChart, setPfChart] = useState<any[]>([])
  const [pfLoading, setPfLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState("")
  const [importSummary, setImportSummary] = useState("")
  const [form, setForm] = useState({ ticker: "ESE.PA", date: "", price: "", qty: "" })
  const [storageReady, setStorageReady] = useState(false)
  const [pfRange, setPfRange] = useState(RANGES[5])
  const [pfNormalized, setPfNormalized] = useState(false)

  // Positions: load from the API, falling back to localStorage if unauthenticated/offline.
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/finance/positions")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) setPositions(data)
        } else {
          try {
            const raw = localStorage.getItem("bnp-positions-v2")
            if (raw) setPositions(JSON.parse(raw))
            if (localStorage.getItem("bnp-pf-normalized") === "1") setPfNormalized(true)
          } catch {}
        }
      } catch {
        try {
          const raw = localStorage.getItem("bnp-positions-v2")
          if (raw) setPositions(JSON.parse(raw))
          if (localStorage.getItem("bnp-pf-normalized") === "1") setPfNormalized(true)
        } catch {}
      } finally {
        setStorageReady(true)
      }
    })()
  }, [])

  useEffect(() => {
    if (!storageReady) return
    ;(async () => {
      try {
        if (positions.length) {
          const res = await fetch("/api/finance/positions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ positions }),
          })
          if (!res.ok) console.warn("Failed to sync finance positions to server", res.status)
        }
        try {
          localStorage.setItem("bnp-positions-v2", JSON.stringify(positions))
        } catch {}
      } catch {
        try {
          localStorage.setItem("bnp-positions-v2", JSON.stringify(positions))
        } catch {}
      }
    })()
  }, [positions, storageReady])

  useEffect(() => {
    if (!storageReady) return
    try {
      localStorage.setItem("bnp-pf-normalized", pfNormalized ? "1" : "0")
    } catch {}
  }, [pfNormalized, storageReady])

  useEffect(() => {
    setMktLoading(true)
    setMktError(null)
    fetchYahoo(etf.ticker, range.key, range.interval)
      .then((data) => {
        const { points, meta } = parseChart(data, range.key)
        setChartData(points)
        setMeta(meta)
      })
      .catch((e) => setMktError(e.message))
      .finally(() => setMktLoading(false))
  }, [etf, range])

  const computePortfolio = useCallback(
    async (r?: (typeof RANGES)[number]) => {
      const activeRange = r || pfRange
      if (!positions.length) return
      setPfLoading(true)
      try {
        const tickers = [...new Set(positions.map((p) => p.ticker))]
        const histMap: Record<string, any[]> = {}
        await Promise.all(
          tickers.map(async (t) => {
            try {
              const data = await fetchYahoo(t, activeRange.key, activeRange.interval)
              const { points } = parseChart(data, activeRange.key)
              histMap[t] = points
            } catch {}
          }),
        )

        const allTimes = [...new Set(Object.values(histMap).flatMap((h) => h.map((p) => p.time)))].sort((a, b) => a - b)

        const priceAt = (ticker: string, ts: number) => {
          const hist = histMap[ticker]
          if (!hist?.length) return null
          let best = null
          for (const p of hist) {
            if (p.time <= ts) best = p.price
            else break
          }
          return best
        }

        const result = allTimes
          .map((ts) => {
            let value = 0, cost = 0, hasSomething = false
            positions.forEach((pos) => {
              const buyTs = new Date(pos.date).getTime() / 1000
              if (ts < buyTs) return
              const price = priceAt(pos.ticker, ts)
              if (price) {
                value += price * pos.qty
                cost += pos.price * pos.qty
                hasSomething = true
              }
            })
            if (!hasSomething) return null
            return { time: ts, label: fmtLabel(ts, activeRange.key), value, cost, pnl: pnlEur(value, cost) }
          })
          .filter(Boolean)

        setPfChart(result as any[])
      } catch (e) {
        console.error(e)
      }
      setPfLoading(false)
    },
    [positions, pfRange],
  )

  useEffect(() => {
    if (tab === "portfolio" && positions.length) computePortfolio()
  }, [tab])

  const handlePfRange = (r: (typeof RANGES)[number]) => {
    setPfRange(r)
    computePortfolio(r)
  }

  const addPos = () => {
    const { ticker, date, price, qty } = form
    if (!date || !price || !qty) return
    setPositions((prev) => [
      ...prev,
      {
        id: createPositionId(),
        ticker,
        name: BNP_ETFS.find((e) => e.ticker === ticker)?.name || ticker,
        date,
        price: parseFloat(price),
        qty: parseFloat(qty),
      },
    ])
    setForm((f) => ({ ...f, date: "", price: "", qty: "" }))
    setShowForm(false)
  }

  const importPositions = () => {
    const parsed = parseBulkPositions(importText)
    if (!parsed.length) {
      setImportSummary("Aucune position valide trouvée. Collez des lignes avec date, prix et quantité.")
      return
    }
    const ticker = etf?.ticker || BNP_ETFS[0].ticker
    const name = BNP_ETFS.find((e) => e.ticker === ticker)?.name || ticker
    setPositions((prev) => [
      ...prev,
      ...parsed.map((pos) => ({ id: createPositionId(), ticker, name, date: pos.date, price: pos.price, qty: pos.qty })),
    ])
    setImportSummary(`${parsed.length} position${parsed.length !== 1 ? "s" : ""} importée${parsed.length !== 1 ? "s" : ""}.`)
    setImportText("")
    setShowImport(false)
  }

  const removePos = async (id: string) => {
    setPositions((p) => p.filter((x) => x.id !== id))
    if (!id) return
    try {
      await fetch("/api/finance/positions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
    } catch (e) {
      console.warn("Failed to delete finance position", e)
    }
  }

  const prices = chartData.map((d) => d.price)
  const current = meta?.regularMarketPrice
  const prev = meta?.chartPreviousClose || meta?.previousClose
  const high = prices.length ? Math.max(...prices) : meta?.chartHigh ?? meta?.regularMarketDayHigh
  const low = prices.length ? Math.min(...prices) : meta?.chartLow ?? meta?.low
  const change = current != null && prev != null ? current - prev : null
  const changePct = change != null && prev ? (change / prev) * 100 : null
  const isUp = change == null || change >= 0
  const accent = isUp ? "#16a34a" : "#dc2626" // tailwind green-600 / red-600, matches app convention

  const minP = prices.length ? Math.min(...prices) * 0.9985 : "auto"
  const maxP = prices.length ? Math.max(...prices) * 1.0015 : "auto"

  const costBasis = positions.reduce((s, p) => s + p.price * p.qty, 0)
  const courtageTotal = calculateCourtage(costBasis)
  const totalCost = costBasis + courtageTotal
  const lastPf = pfChart[pfChart.length - 1]
  const totalVal = lastPf?.value ?? 0
  const gain = totalVal - totalCost
  const gainPct = totalCost > 0 ? (gain / totalCost) * 100 : 0
  const gainTone = positions.length === 0 ? "muted" : gain >= 0 ? "positive" : "negative"

  const pfPnlSeries = pfChart.map((d) => d.pnl ?? pnlEur(d.value, d.cost))
  const pfChartWithTrends = useMemo(() => {
    if (!pfChart.length) return pfChart
    return makeTrendSeries(makeTrendSeries(pfChart, "value"), "pnl")
  }, [pfChart])
  const pnlPad = (v: number) => (v === 0 ? 50 : Math.abs(v) * 0.06)

  const pfMinY = !pfChart.length
    ? "auto"
    : pfNormalized
      ? Math.min(...pfPnlSeries, 0) - pnlPad(Math.min(...pfPnlSeries, 0))
      : Math.min(...pfChart.map((d) => Math.min(d.value, d.cost))) * 0.995
  const pfMaxY = !pfChart.length
    ? "auto"
    : pfNormalized
      ? Math.max(...pfPnlSeries, 0) + pnlPad(Math.max(...pfPnlSeries, 0))
      : Math.max(...pfChart.map((d) => Math.max(d.value, d.cost))) * 1.005

  const MktTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div className={tooltipClass}>
        <div className="text-muted-foreground mb-1.5">{d?.label}</div>
        <div className="text-base font-semibold" style={{ color: accent }}>
          {f2(d?.price)} <span className="text-muted-foreground font-normal text-xs">{meta?.currency || "EUR"}</span>
        </div>
      </div>
    )
  }

  const PfTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    const g = d.pnl ?? pnlEur(d.value, d.cost)
    const pct = perfPct(d.value, d.cost)
    const gClass = g >= 0 ? "text-green-600" : "text-red-600"
    return (
      <div className={tooltipClass}>
        <div className="text-muted-foreground mb-2">{d.label}</div>
        <div className="flex flex-col gap-1">
          {pfNormalized && (
            <div className={`text-sm font-semibold mb-0.5 ${gClass}`}>
              P&L {g >= 0 ? "+" : ""}
              {fEur(g)} ({fPct(pct)})
            </div>
          )}
          <div className="text-foreground">Valeur {fEur(d.value)}</div>
          <div className="text-muted-foreground">Investi {fEur(d.cost)}</div>
          {!pfNormalized && (
            <div className={`border-t border-border pt-1 mt-1 ${gClass}`}>
              P&L {g >= 0 ? "+" : ""}
              {fEur(g)} ({fPct(pct)})
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {tab === "market" && (
        <div className="space-y-6">
          <div>
            <p className="text-xs text-muted-foreground mb-2">{etf.full}</p>

            {mktLoading && !meta ? (
              <div className="flex items-center gap-3 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Récupération du prix…</span>
              </div>
            ) : meta ? (
              <>
                <div className="flex flex-wrap items-end gap-5">
                  <div className="text-5xl font-bold tracking-tight text-foreground">
                    {f2(current)}
                    <span className="text-base font-normal text-muted-foreground ml-2">{meta.currency || "EUR"}</span>
                  </div>
                  {change != null && (
                    <div className="flex items-center gap-1 text-lg font-semibold mb-2" style={{ color: accent }}>
                      {isUp ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      {f2(Math.abs(change))} ({isUp ? "+" : ""}
                      {f2(changePct)}%)
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-6 mt-3 text-xs text-muted-foreground">
                  {[
                    ["Ouverture", meta.regularMarketOpen],
                    ["Haut", high],
                    ["Bas", low],
                    ["Préc.", prev],
                    ["Vol", meta.regularMarketVolume != null ? meta.regularMarketVolume.toLocaleString() : null],
                  ].map(
                    ([k, v]) =>
                      v != null && (
                        <span key={k as string}>
                          {k}: <span className="text-foreground">{typeof v === "number" ? f2(v) : v}</span>
                        </span>
                      ),
                  )}
                </div>
              </>
            ) : mktError ? (
              <div className="text-red-600 text-sm">⚠ {mktError}</div>
            ) : null}
          </div>

          <RangeBar current={range} onChange={setRange} />

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              {mktLoading ? (
                <LoadBox height={360}>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Chargement du graphique…</span>
                </LoadBox>
              ) : mktError ? (
                <LoadBox height={360}>
                  <div className="text-xl">⚠</div>
                  <div className="text-red-600 text-sm">Erreur API : {mktError}</div>
                  <div className="text-xs text-muted-foreground">Les données Yahoo Finance sont peut-être temporairement indisponibles</div>
                </LoadBox>
              ) : (
                <ResponsiveContainer width="100%" height={360}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                    <defs>
                      <linearGradient id="gMkt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={accent} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="1 5" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[minP, maxP]}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => f2(v)}
                      width={58}
                    />
                    <Tooltip content={<MktTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
                    {prev && <ReferenceLine y={prev} stroke="hsl(var(--border))" strokeDasharray="3 5" strokeWidth={1} />}
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={accent}
                      strokeWidth={1.8}
                      fill="url(#gMkt)"
                      dot={false}
                      activeDot={{ r: 4, fill: accent, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <p className="text-right text-[10px] text-muted-foreground">Données via Yahoo Finance (délai 15 min)</p>
        </div>
      )}

      {tab === "portfolio" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Valeur du portefeuille"
              value={positions.length && totalVal ? fEur(totalVal) : "—"}
              sub={`${positions.length} position${positions.length !== 1 ? "s" : ""}`}
            />
            <StatCard
              label="Total investi"
              value={totalCost ? fEur(totalCost) : "—"}
              sub={courtageTotal > 0 ? `${fEur(costBasis)} + ${fEur(courtageTotal)} courtage` : "Coût d'acquisition"}
            />
            <StatCard
              label="P&L total"
              value={positions.length && totalVal ? `${gain >= 0 ? "+" : ""}${fEur(gain)}` : "—"}
              sub={positions.length && totalVal ? `${gainPct >= 0 ? "+" : ""}${f2(gainPct)}%` : "Ajoutez des positions"}
              tone={gainTone as any}
            />
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <RangeBar current={pfRange} onChange={handlePfRange} />
                <div className="flex items-center gap-2 flex-wrap">
                  <ModeToggle normalized={pfNormalized} onChange={setPfNormalized} />
                  <Button size="sm" variant="outline" onClick={() => computePortfolio()}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Actualiser
                  </Button>
                </div>
              </div>

              {pfLoading ? (
                <LoadBox height={280}>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Calcul de la performance…</span>
                </LoadBox>
              ) : pfChart.length === 0 ? (
                <LoadBox height={280}>
                  <div className="text-2xl">📈</div>
                  <div className="text-sm">
                    {positions.length === 0 ? "Ajoutez des positions pour voir la performance" : "Cliquez sur Actualiser pour charger le graphique"}
                  </div>
                </LoadBox>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={pfChartWithTrends} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                    <defs>
                      <linearGradient id="gPf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="1 5" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[pfMinY, pfMaxY]}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => (pfNormalized ? fEur(v) : `${Math.round(v)} €`)}
                      width={76}
                    />
                    <Tooltip content={<PfTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
                    {pfNormalized && <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="5 4" strokeWidth={1.5} />}
                    <Area
                      type="monotone"
                      dataKey={pfNormalized ? "pnl" : "value"}
                      name={pfNormalized ? "P&L" : "Valeur"}
                      stroke="#16a34a"
                      strokeWidth={2}
                      fill="url(#gPf)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#16a34a", strokeWidth: 0 }}
                    />
                    {!pfNormalized && (
                      <>
                        <Line type="monotone" dataKey="cost" name="Investi" stroke="hsl(var(--border))" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                        <Line type="monotone" dataKey="valueTrend" name="Tendance valeur" stroke="hsl(var(--chart-2))" strokeWidth={1.5} dot={false} strokeDasharray="6 4" />
                        <Line type="monotone" dataKey="pnlTrend" name="Tendance profit" stroke="#16a34a" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                      </>
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              )}

              {pfChart.length > 0 && (
                <div className="flex flex-wrap gap-5 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 bg-foreground inline-block rounded-full" />
                    {pfNormalized ? "P&L (€)" : "Valeur du portefeuille"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 border-t border-dashed border-border inline-block" />
                    {pfNormalized ? "Seuil de rentabilité (0 €)" : "Coût d'acquisition"}
                  </span>
                  {!pfNormalized && (
                    <>
                      <span className="flex items-center gap-1.5">
                        <span className="w-4 h-0.5 inline-block rounded-full" style={{ background: "hsl(var(--chart-2))" }} />
                        Tendance valeur
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-4 h-0.5 bg-green-600 inline-block rounded-full" />
                        Tendance profit
                      </span>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-foreground">Positions</h2>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={showForm ? "outline" : "default"}
                onClick={() => { setShowImport(false); setShowForm(!showForm) }}
              >
                {showForm ? <X className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                {showForm ? "Annuler" : "Ajouter une position"}
              </Button>
              <Button
                size="sm"
                variant={showImport ? "outline" : "secondary"}
                onClick={() => { setShowForm(false); setShowImport(!showImport); setImportSummary("") }}
              >
                {showImport ? <X className="h-4 w-4 mr-1.5" /> : <Upload className="h-4 w-4 mr-1.5" />}
                {showImport ? "Annuler" : "Importer des positions"}
              </Button>
              <Button size="sm" variant="outline" disabled={!positions.length} onClick={() => downloadCSV(positions)}>
                <Download className="h-4 w-4 mr-1.5" />
                Exporter en CSV
              </Button>
            </div>
          </div>

          {showImport && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Import groupé</p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={"Collez des lignes avec date, prix et quantité depuis votre relevé.\nExemple :\n18 août 2024\n25,24 €\n21\n..."}
                  className="w-full min-h-[180px] resize-y rounded-md border border-input bg-background px-3 py-2 text-xs"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={importPositions}>Importer</Button>
                  <Button size="sm" variant="outline" onClick={() => { setImportText(""); setImportSummary("") }}>Effacer</Button>
                </div>
                {importSummary && <p className="text-xs text-muted-foreground">{importSummary}</p>}
              </CardContent>
            </Card>
          )}

          {showForm && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nouvelle position</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label className="text-xs">ETF</Label>
                    <Select value={form.ticker} onValueChange={(v) => setForm((f) => ({ ...f, ticker: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BNP_ETFS.map((f) => (
                          <SelectItem key={f.ticker} value={f.ticker}>{f.ticker} — {f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date d'achat</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Prix d'achat (€)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Qté</Label>
                    <Input type="number" step="any" placeholder="0" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} />
                  </div>
                  <Button onClick={addPos}>Ajouter</Button>
                </div>
                {form.price && form.qty && (
                  <div className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
                    Coût total : <span className="text-foreground font-medium">{fEur(parseFloat(form.price || "0") * parseFloat(form.qty || "0"))}</span>
                    {" · "}
                    {form.qty} × {fEur(parseFloat(form.price || "0"))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {positions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              <FolderOpen className="h-7 w-7 mx-auto mb-3 opacity-60" />
              Aucune position pour le moment — ajoutez-en une ci-dessus
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["ETF", "Date d'achat", "Prix d'achat", "Qté", "Coût d'acquisition", "Courtage", "Total investi", ""].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos, i) => {
                    const posCost = pos.price * pos.qty
                    const courtage = calculateCourtage(posCost)
                    const totalInvested = posCost + courtage
                    return (
                      <tr key={pos.id} className={i < positions.length - 1 ? "border-b border-border/60" : ""}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{pos.ticker}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{pos.name}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{pos.date}</td>
                        <td className="px-4 py-3">{f2(pos.price)}</td>
                        <td className="px-4 py-3">{pos.qty}</td>
                        <td className="px-4 py-3 text-foreground">{fEur(posCost)}</td>
                        <td className="px-4 py-3 text-foreground">{fEur(courtage)}</td>
                        <td className="px-4 py-3 text-foreground font-semibold">{fEur(totalInvested)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => removePos(pos.id)}
                            className="rounded-md border border-input p-1.5 text-muted-foreground hover:text-red-600 hover:border-red-200 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {positions.length > 1 && (
                  <tfoot>
                    <tr className="border-t border-border bg-muted/40">
                      <td colSpan={4} className="px-4 py-2.5 text-xs text-muted-foreground">
                        TOTAL ({positions.length} positions)
                      </td>
                      <td className="px-4 py-2.5 text-foreground">{fEur(costBasis)}</td>
                      <td className="px-4 py-2.5 text-foreground">{fEur(courtageTotal)}</td>
                      <td className="px-4 py-2.5 text-foreground font-semibold">{fEur(totalCost)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          <p className="text-right text-[10px] text-muted-foreground">
            Données via Yahoo Finance (délai 15 min) · Portefeuille sauvegardé
          </p>
        </div>
      )}
    </div>
  )
}
