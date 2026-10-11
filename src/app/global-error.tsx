'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">System Error</h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              A critical layout error occurred. Please refresh the page or contact the system administrator.
            </p>
            {error.digest && (
              <div className="text-[10px] font-mono text-zinc-500 pt-1">
                Error Digest: {error.digest}
              </div>
            )}
          </div>

          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Application
          </button>
        </div>
      </body>
    </html>
  )
}
