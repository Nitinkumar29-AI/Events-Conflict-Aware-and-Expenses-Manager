import Link from 'next/link'
import { AlertCircle, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-400">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-mono">404</h1>
          <h2 className="text-lg font-semibold text-zinc-200">Page Not Found</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The requested page or resource could not be found. It may have been moved, deleted, or you may not have authorization to view it.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Events Directory
          </Link>
        </div>
      </div>
    </div>
  )
}
