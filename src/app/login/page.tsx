import LoginForm from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold text-gray-900">Jafalei</h1>
        <LoginForm />
      </div>
    </div>
  )
}
