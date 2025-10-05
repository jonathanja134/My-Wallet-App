import { LoginForm } from "@/components/auth/login-form"
import { Wallet } from "lucide-react"
import { ThemeProvider } from "next-themes"

export default function LoginPage() {
  return (
    <ThemeProvider attribute="class" enableSystem>
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
            <Wallet className="h-7 w-7 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">My Wallet</h2>
        <p className="mt-2 text-center text-sm text-gray-600">Gérez vos finances en toute sécurité</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <LoginForm />
        </div>
      </div>
    </div>
    </ThemeProvider>
  )
}
