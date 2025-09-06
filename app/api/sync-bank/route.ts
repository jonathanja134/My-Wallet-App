import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Simulate bank API integration
export async function POST(request: NextRequest) {
  try {
    const { accountId, bankName } = await request.json()

    // Simulate API call to bank (Powens/Plaid equivalent)
    const mockBankData = {
      balance: Math.random() * 10000 + 1000,
      transactions: [
        {
          description: "Achat supermarché",
          amount: -45.67,
          date: new Date().toISOString().split("T")[0],
          category: "Alimentation",
        },
        {
          description: "Salaire",
          amount: 2500.0,
          date: new Date().toISOString().split("T")[0],
          category: "Revenus",
        },
      ],
    }

    // Update account balance
    const { error: accountError } = await supabase
      .from("accounts")
      .update({
        balance: mockBankData.balance,
        is_connected: true,
        bank_connection_id: `${bankName.toLowerCase()}_${accountId}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)

    if (accountError) {
      return NextResponse.json({ error: accountError.message }, { status: 500 })
    }

    // Record balance history
    await supabase.from("account_history").insert([
      {
        account_id: accountId,
        balance: mockBankData.balance,
      },
    ])

    // Import transactions
    const USER_ID = "550e8400-e29b-41d4-a716-446655440000"

    for (const transaction of mockBankData.transactions) {
      await supabase.from("transactions").insert([
        {
          user_id: USER_ID,
          account_id: accountId,
          description: transaction.description,
          amount: transaction.amount,
          transaction_date: transaction.date,
          is_recurring: false,
        },
      ])
    }

    return NextResponse.json({
      success: true,
      message: "Synchronisation réussie",
      data: mockBankData,
    })
  } catch (error) {
    return NextResponse.json({ error: "Erreur de synchronisation" }, { status: 500 })
  }
}
