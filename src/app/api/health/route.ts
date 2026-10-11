import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/server/lib/prisma'
import { env } from '@/server/config/env'

export const dynamic = 'force-dynamic'

interface HealthCheckResponse {
  status: 'UP' | 'DOWN'
  probe: 'liveness' | 'readiness'
  timestamp: string
  uptimeSeconds: number
  environment: string
  version: string
  checks?: {
    database: {
      status: 'HEALTHY' | 'UNHEALTHY'
      latencyMs?: number
      error?: string
    }
  }
}

const DB_PROBE_TIMEOUT_MS = 3000

/**
 * Pings the database with a strict timeout to prevent hangs.
 */
async function checkDatabaseReadiness(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
  const startTime = Date.now()

  try {
    const pingPromise = prisma.$queryRaw`SELECT 1`
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Database ping timed out')), DB_PROBE_TIMEOUT_MS)
    )

    await Promise.race([pingPromise, timeoutPromise])
    const latencyMs = Date.now() - startTime
    return { healthy: true, latencyMs }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database ping failed'
    console.error('Database readiness check failed:', message)
    return { healthy: false, error: 'Database probe failed or timed out' }
  }
}

/**
 * GET /api/health
 *
 * Semantic behavior:
 * - ?probe=liveness (or ?type=liveness): Lightweight liveness check confirming the HTTP
 *   server is running. Does NOT query the database, ensuring temporary DB maintenance
 *   never causes container restart loops.
 * - (Default or ?probe=readiness): Readiness check verifying full database connectivity.
 *   Returns HTTP 200 when ready to accept traffic, or HTTP 503 if the database is down/slow.
 *
 * Never leaks database connection strings, passwords, or sensitive stack traces.
 */
export async function GET(request?: NextRequest): Promise<NextResponse<HealthCheckResponse>> {
  const url = request ? new URL(request.url) : new URL('http://localhost:3000/api/health')
  const probeParam = (url.searchParams.get('probe') || url.searchParams.get('type') || 'readiness').toLowerCase()
  const isLiveness = probeParam === 'liveness'

  const basePayload = {
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    version: '0.1.0',
  }

  // 1. Lightweight Liveness Probe
  if (isLiveness) {
    return NextResponse.json(
      {
        status: 'UP',
        probe: 'liveness',
        ...basePayload,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    )
  }

  // 2. Comprehensive Readiness Probe (Database-dependent)
  const dbResult = await checkDatabaseReadiness()
  const overallStatus: 'UP' | 'DOWN' = dbResult.healthy ? 'UP' : 'DOWN'
  const httpStatus = dbResult.healthy ? 200 : 503

  const payload: HealthCheckResponse = {
    status: overallStatus,
    probe: 'readiness',
    ...basePayload,
    checks: {
      database: {
        status: dbResult.healthy ? 'HEALTHY' : 'UNHEALTHY',
        ...(dbResult.healthy ? { latencyMs: dbResult.latencyMs } : { error: dbResult.error }),
      },
    },
  }

  return NextResponse.json(payload, {
    status: httpStatus,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}

/**
 * HEAD /api/health
 *
 * Lightweight liveness probe returning HTTP 200 with an empty body as long as the process is alive.
 * If explicitly requested via ?probe=readiness, queries the database.
 */
export async function HEAD(request?: NextRequest): Promise<NextResponse> {
  const url = request ? new URL(request.url) : new URL('http://localhost:3000/api/health')
  const isReadiness = (url.searchParams.get('probe') || '').toLowerCase() === 'readiness'

  if (isReadiness) {
    const dbResult = await checkDatabaseReadiness()
    return new NextResponse(null, {
      status: dbResult.healthy ? 200 : 503,
      headers: { 'Cache-Control': 'no-store, no-cache' },
    })
  }

  // Default HEAD is process liveness (safe against DB restart loops)
  return new NextResponse(null, {
    status: 200,
    headers: { 'Cache-Control': 'no-store, no-cache' },
  })
}
