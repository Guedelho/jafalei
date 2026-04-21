import LoginForm from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Jafalei</h1>
        <p className="text-sm text-gray-500 mb-6">Assistente da secretária</p>
        <LoginForm />
      </div>
    </div>
  )
}
