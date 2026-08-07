"use client";

import { useState } from "react";
import BnpEasyTracker from "./BnpEasyTracker";
import { PageHeader } from "@/components/page-header";

export default function BnpEasyTrackerWrapper() {
  const [tab, setTab] = useState("market");

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        actionButton={
          <div className="flex items-center gap-2 rounded-[8px] border border-border bg-background p-1">
            {[
              { key: "market", label: "Market" },
              { key: "portfolio", label: "Wallet" },
            ].map(({ key, label }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-[8px] px-4 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-card text-white"
                      : "text-muted-foreground hover:bg-gray-950"
                  }`}
                  style={{ textTransform: "capitalize" }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        }
      />

      <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ">
        <BnpEasyTracker tab={tab} onTabChange={setTab} />
      </main>
    </div>
  );
}
