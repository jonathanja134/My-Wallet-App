"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ChartConfig {
  [key: string]: {
    label: string
    color: string
  }
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
  children: React.ReactNode
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, config, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("w-full h-full overflow-hidden", className)}
        {...props}
        style={
          {
            "--chart-1": "220 70% 50%",
            "--chart-2": "160 60% 45%",
            "--chart-3": "30 80% 55%",
            "--chart-4": "280 65% 60%",
            "--chart-5": "340 75% 55%",
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    )
  },
)
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border rounded shadow-lg">
        <p className="text-sm font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const ChartTooltipContent = ChartTooltip

export { ChartContainer, ChartTooltip, ChartTooltipContent }
