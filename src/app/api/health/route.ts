import { NextResponse } from 'next/server'
import prisma from '@/server/lib/prisma'
import { env } from '@/server/config/env'

export const dynamic = 'force-dynamic'

interface HealthCheckResponse {
  status: 'UP' | 'DOWN'
  timestamp: string
  uptimeSeconds: number
  environment: string
  version: string
  checks: {
    database: {
      status: 'HEALTHY' | 'UNHEALTHY'
      latencyMs?: number
      error?: string
    }
  }
}

/**
 * GET /api/health
 * Production health and readiness probe for load balancers, container orchestrators,
 * and monitoring systems.
 * Never leaks database connection strings, passwords, or sensitive stack traces.
 */
export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  const startTime = Date.now()
  let dbHealthy = false
  let latencyMs = 0

  try {
    // Fast database ping query
    await prisma.$queryRaw`SELECT 1`
    latencyMs = Date.now() - startTime
    dbHealthy = true
  } catch (error) {
    console.error('Health check database probe failed:', error instanceof Error ? error.message : 'Unknown error')
    dbHealthy = false
  }

  const overallStatus: 'UP' | 'DOWN' = dbHealthy ? 'UP' : 'DOWN'
  const httpStatus = dbHealthy ? 200 : 503

  const payload: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    version: '0.1.0',
    checks: {
      database: {
        status: dbHealthy ? 'HEALTHY' : 'UNHEALTHY',
        ...(dbHealthy ? { latencyMs } : { error: 'Database connectivity probe failed' }),
      },
    },
  }

  return NextResponse.json(payload, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

/**
 * HEAD /api/health
 * Fast liveness probe returning HTTP 200 or 503 with empty body.
 */
export async function HEAD(): Promise<NextResponse> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return new NextResponse(null, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache' },
    })
  } catch {
    return new NextResponse(null, {
      status: 503,
      headers: { 'Cache-Control': 'no-store, no-cache' },
    })
  }
}
