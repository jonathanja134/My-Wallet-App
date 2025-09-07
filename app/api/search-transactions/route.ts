import { NextResponse } from "next/server"
import { searchTransactions } from "@/app/actions/expenses"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") || ""

  try {
    const results = await searchTransactions(q)
    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la recherche" }, { status: 500 })
  }
}