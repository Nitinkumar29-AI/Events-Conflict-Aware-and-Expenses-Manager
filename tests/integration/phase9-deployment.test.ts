import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { validateEnv, getValidatedEnv, envSchema } from '@/server/config/env'
import { GET as healthGet, HEAD as healthHead } from '@/app/api/health/route'
import nextConfig from '../../next.config'
import packageJson from '../../package.json'

describe('Phase 9 — Deployment Readiness, Hardening & Operational Reliability Tests', () => {
  describe('1. Environment Configuration & Secrets Validation', () => {
    it('validates a correct production environment configuration without errors', () => {
      const validConfig = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://postgres:secret123@localhost:5432/acm_prod?schema=public',
        AUTH_SECRET: 'this-is-a-very-secure-32-char-secret-key-12345!',
        NEXT_PUBLIC_APP_URL: 'https://acm.college.edu',
        TZ_APP: 'Asia/Kolkata',
      }

      const result = validateEnv(validConfig)
      expect(result.success).toBe(true)
      expect(result.data?.NODE_ENV).toBe('production')
      expect(result.data?.DATABASE_URL).toBe(validConfig.DATABASE_URL)
      expect(result.data?.AUTH_SECRET).toBe(validConfig.AUTH_SECRET)
    })

    it('accepts an optional conflict assistant only when its URL and shared token are paired', () => {
      const baseConfig = {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://localhost:5432/acm',
      }
      const disabled = validateEnv({
        ...baseConfig,
        AGENT_ASSISTANT_URL: '',
        AGENT_ASSISTANT_TOKEN: '',
      })
      expect(disabled.success).toBe(true)

      const configured = validateEnv({
        ...baseConfig,
        AGENT_ASSISTANT_URL: 'http://127.0.0.1:8010',
        AGENT_ASSISTANT_TOKEN: 'a'.repeat(32),
      })
      expect(configured.success).toBe(true)

      const missingToken = validateEnv({
        ...baseConfig,
        AGENT_ASSISTANT_URL: 'http://127.0.0.1:8010',
      })
      expect(missingToken.success).toBe(false)
      expect(missingToken.errors?.some((error) => error.includes('AGENT_ASSISTANT_TOKEN'))).toBe(true)

      const shortToken = validateEnv({
        ...baseConfig,
        AGENT_ASSISTANT_URL: 'http://127.0.0.1:8010',
        AGENT_ASSISTANT_TOKEN: 'short',
      })
      expect(shortToken.success).toBe(false)
    })

    it('rejects invalid or non-PostgreSQL DATABASE_URL formats', () => {
      const invalidUrls = [
        '',
        'mysql://root:password@localhost:3306/db',
        'mongodb://localhost:27017/db',
        'sqlite://data.db',
      ]

      invalidUrls.forEach((badUrl) => {
        const result = validateEnv({
          NODE_ENV: 'development',
          DATABASE_URL: badUrl,
        })

        expect(result.success).toBe(false)
        expect(result.errors?.some((e) => e.includes('DATABASE_URL'))).toBe(true)
      })
    })

    it('enforces 32-character minimum for AUTH_SECRET in production mode', () => {
      // 1. Missing secret in production
      const missingSecret = validateEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://localhost:5432/acm',
      })
      expect(missingSecret.success).toBe(false)
      expect(missingSecret.errors?.some((e) => e.includes('AUTH_SECRET'))).toBe(true)

      // 2. Secret too short in production (< 32 chars)
      const shortSecret = validateEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://localhost:5432/acm',
        AUTH_SECRET: 'short-secret',
      })
      expect(shortSecret.success).toBe(false)
      expect(shortSecret.errors?.some((e) => e.includes('at least 32 characters'))).toBe(true)

      // 3. Permitted fallback in development mode with warning
      const devMode = validateEnv({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://localhost:5432/acm',
        AUTH_SECRET: 'dev-secret',
      })
      expect(devMode.success).toBe(true)
    })

    it('enforces valid domain for NEXT_PUBLIC_APP_URL in production and rejects localhost/127.0.0.1', () => {
      const localhostProd = validateEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://localhost:5432/acm',
        AUTH_SECRET: 'this-is-a-very-secure-32-char-secret-key-12345!',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      })
      expect(localhostProd.success).toBe(false)
      expect(localhostProd.errors?.some((e) => e.includes('NEXT_PUBLIC_APP_URL'))).toBe(true)

      const loopbackProd = validateEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://localhost:5432/acm',
        AUTH_SECRET: 'this-is-a-very-secure-32-char-secret-key-12345!',
        NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3000',
      })
      expect(loopbackProd.success).toBe(false)
      expect(loopbackProd.errors?.some((e) => e.includes('NEXT_PUBLIC_APP_URL'))).toBe(true)

      const validProd = validateEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://localhost:5432/acm',
        AUTH_SECRET: 'this-is-a-very-secure-32-char-secret-key-12345!',
        NEXT_PUBLIC_APP_URL: 'https://acm.college.edu',
      })
      expect(validProd.success).toBe(true)
    })

    it('validates Google OAuth co-dependency requirement (both required if either set)', () => {
      // Only Client ID provided
      const onlyId = validateEnv({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://localhost:5432/acm',
        GOOGLE_CLIENT_ID: 'my-google-client-id',
      })
      expect(onlyId.success).toBe(false)
      expect(onlyId.errors?.some((e) => e.includes('GOOGLE_CLIENT_SECRET'))).toBe(true)

      // Only Client Secret provided
      const onlySecret = validateEnv({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://localhost:5432/acm',
        GOOGLE_CLIENT_SECRET: 'my-google-client-secret',
      })
      expect(onlySecret.success).toBe(false)
      expect(onlySecret.errors?.some((e) => e.includes('GOOGLE_CLIENT_ID'))).toBe(true)

      // Both provided
      const both = validateEnv({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://localhost:5432/acm',
        GOOGLE_CLIENT_ID: 'my-google-client-id',
        GOOGLE_CLIENT_SECRET: 'my-google-client-secret',
      })
      expect(both.success).toBe(true)
    })

    it('validates Cloudinary storage co-dependency requirement (all 3 required if any set)', () => {
      const partialCloudinary = validateEnv({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://localhost:5432/acm',
        CLOUDINARY_CLOUD_NAME: 'acm-cloud',
      })
      expect(partialCloudinary.success).toBe(false)
      expect(partialCloudinary.errors?.some((e) => e.includes('CLOUDINARY_API_KEY'))).toBe(true)
      expect(partialCloudinary.errors?.some((e) => e.includes('CLOUDINARY_API_SECRET'))).toBe(true)
    })

    it('never leaks secret values in environment validation error output', () => {
      const superSecretPassword = 'UltraTopSecretPassword999!'
      const result = validateEnv({
        NODE_ENV: 'production',
        DATABASE_URL: `mysql://admin:${superSecretPassword}@localhost/db`,
        AUTH_SECRET: 'short',
      })

      expect(result.success).toBe(false)
      const allErrorsCombined = (result.errors || []).join(' ')
      // The secret password must NEVER appear in the error text
      expect(allErrorsCombined).not.toContain(superSecretPassword)
    })

    it('getValidatedEnv throws Error in production when configuration is invalid', () => {
      expect(() => {
        getValidatedEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'invalid-url',
        })
      }).toThrow(/Production startup aborted/)
    })
  })

  describe('2. Operational Health Check & Liveness Probe (/api/health)', () => {
    it('GET /api/health returns 200 with UP status, readiness probe, and healthy database check', async () => {
      const response = await healthGet()
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.status).toBe('UP')
      expect(body.probe).toBe('readiness')
      expect(body.environment).toBeDefined()
      expect(typeof body.uptimeSeconds).toBe('number')
      expect(body.checks?.database.status).toBe('HEALTHY')
      expect(typeof body.checks?.database.latencyMs).toBe('number')

      // Verify ISO-8601 UTC timestamp
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)

      // Verify no-cache headers
      expect(response.headers.get('Cache-Control')).toContain('no-store')
    })

    it('GET /api/health?probe=liveness returns fast 200 without executing database queries', async () => {
      const req = new NextRequest('http://localhost:3000/api/health?probe=liveness')
      const response = await healthGet(req)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.status).toBe('UP')
      expect(body.probe).toBe('liveness')
      expect(body.checks).toBeUndefined()
    })

    it('GET /api/health never leaks internal database passwords or connection strings', async () => {
      const response = await healthGet()
      const bodyText = JSON.stringify(await response.json())

      expect(bodyText).not.toContain('postgresql://')
      expect(bodyText).not.toContain('localhost:5432')
      expect(bodyText).not.toContain('password')
    })

    it('HEAD /api/health returns 200 with empty body for fast liveness probing', async () => {
      const response = await healthHead()
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe('')
    })

    it('HEAD /api/health?probe=readiness probes database connectivity', async () => {
      const req = new NextRequest('http://localhost:3000/api/health?probe=readiness')
      const response = await healthHead(req)
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe('')
    })
  })

  describe('3. HTTP Security Headers & Production Hardening in next.config.ts', () => {
    it('disables X-Powered-By header to prevent server fingerprinting', () => {
      expect(nextConfig.poweredByHeader).toBe(false)
    })

    it('configures standard HTTP security headers across all application routes', async () => {
      expect(typeof nextConfig.headers).toBe('function')
      const headersConfig = await nextConfig.headers!()

      expect(Array.isArray(headersConfig)).toBe(true)
      const rootRule = headersConfig.find((h: any) => h.source === '/(.*)')
      expect(rootRule).toBeDefined()

      const headerMap: Record<string, string> = {}
      rootRule!.headers.forEach((h: any) => {
        headerMap[h.key] = h.value
      })

      // Security header verifications
      expect(headerMap['X-Frame-Options']).toBe('DENY')
      expect(headerMap['X-Content-Type-Options']).toBe('nosniff')
      expect(headerMap['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
      expect(headerMap['Strict-Transport-Security']).toContain('max-age=63072000')
      expect(headerMap['Permissions-Policy']).toContain('camera=()')
      expect(headerMap['Content-Security-Policy']).toContain("default-src 'self'")
      expect(headerMap['Content-Security-Policy']).toContain("connect-src 'self' https://api.cloudinary.com https://accounts.google.com")
      expect(headerMap['Content-Security-Policy']).toContain("base-uri 'self'")
      expect(headerMap['Content-Security-Policy']).toContain("form-action 'self' https://accounts.google.com")
      expect(headerMap['Content-Security-Policy']).toContain("font-src 'self' data:")
      expect(headerMap['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    })
  })

  describe('4. Production Deployment & Migration Commands in package.json', () => {
    it('provides db:migrate:prod script using non-destructive prisma migrate deploy', () => {
      expect(packageJson.scripts['db:migrate:prod']).toBe('prisma migrate deploy')
    })

    it('maintains build, start, and test scripts for production runtime', () => {
      expect(packageJson.scripts['build']).toBe('next build')
      expect(packageJson.scripts['start']).toBe('next start')
      expect(packageJson.scripts['test']).toBe('vitest run')
    })
  })
})
