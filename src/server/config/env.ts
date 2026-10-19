import { z } from 'zod'

/**
 * Zod schema for application environment variables.
 * Enforces production readiness, validates PostgreSQL connection format,
 * requires secure authentication secrets in production,
 * and validates co-dependent configuration pairs without printing secret values.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .refine(
        (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
        {
          message:
            'DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://',
        }
      ),
    AUTH_SECRET: z.string().optional(),
    NEXTAUTH_SECRET: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z
      .string()
      .url('NEXT_PUBLIC_APP_URL must be a valid URL')
      .default('http://localhost:3000'),
    AGENT_ASSISTANT_URL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().url().optional()
    ),
    AGENT_ASSISTANT_TOKEN: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(32).optional()
    ),
    TZ_APP: z.string().default('Asia/Kolkata'),
    ALLOWED_EMAIL_DOMAIN: z.string().optional(),

    // Optional Google OAuth (both required if either is provided)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Optional Cloudinary (all 3 required if any is provided)
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (Boolean(data.AGENT_ASSISTANT_URL) !== Boolean(data.AGENT_ASSISTANT_TOKEN)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [data.AGENT_ASSISTANT_URL ? 'AGENT_ASSISTANT_TOKEN' : 'AGENT_ASSISTANT_URL'],
        message: 'AGENT_ASSISTANT_URL and AGENT_ASSISTANT_TOKEN must be configured together.',
      })
    }

    // 1. Auth secret and production URL enforcement
    const secret = data.AUTH_SECRET || data.NEXTAUTH_SECRET
    if (data.NODE_ENV === 'production') {
      if (!secret) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AUTH_SECRET'],
          message: 'AUTH_SECRET (or NEXTAUTH_SECRET) is required in production.',
        })
      } else if (secret.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AUTH_SECRET'],
          message: 'AUTH_SECRET must be at least 32 characters long in production.',
        })
      }

      // Production requires a real application URL and cannot silently fall back to localhost
      const isLocalhost =
        !data.NEXT_PUBLIC_APP_URL ||
        data.NEXT_PUBLIC_APP_URL.includes('localhost') ||
        data.NEXT_PUBLIC_APP_URL.includes('127.0.0.1')
      if (isLocalhost) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['NEXT_PUBLIC_APP_URL'],
          message:
            'NEXT_PUBLIC_APP_URL must be configured with a valid public domain in production (cannot silently fall back to localhost or 127.0.0.1).',
        })
      }
    }

    // 2. Google OAuth co-dependency check
    const hasGoogleId = !!data.GOOGLE_CLIENT_ID && data.GOOGLE_CLIENT_ID.trim().length > 0
    const hasGoogleSecret = !!data.GOOGLE_CLIENT_SECRET && data.GOOGLE_CLIENT_SECRET.trim().length > 0
    if (hasGoogleId !== hasGoogleSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [hasGoogleId ? 'GOOGLE_CLIENT_SECRET' : 'GOOGLE_CLIENT_ID'],
        message:
          'Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be provided together when Google OAuth is configured.',
      })
    }

    // 3. Cloudinary co-dependency check
    const hasCloud = !!data.CLOUDINARY_CLOUD_NAME && data.CLOUDINARY_CLOUD_NAME.trim().length > 0
    const hasKey = !!data.CLOUDINARY_API_KEY && data.CLOUDINARY_API_KEY.trim().length > 0
    const hasSecretCloud =
      !!data.CLOUDINARY_API_SECRET && data.CLOUDINARY_API_SECRET.trim().length > 0
    const cloudinaryCount = (hasCloud ? 1 : 0) + (hasKey ? 1 : 0) + (hasSecretCloud ? 1 : 0)

    if (cloudinaryCount > 0 && cloudinaryCount < 3) {
      if (!hasCloud) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CLOUDINARY_CLOUD_NAME'],
          message:
            'CLOUDINARY_CLOUD_NAME is required when Cloudinary storage credentials are provided.',
        })
      }
      if (!hasKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CLOUDINARY_API_KEY'],
          message: 'CLOUDINARY_API_KEY is required when Cloudinary storage credentials are provided.',
        })
      }
      if (!hasSecretCloud) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CLOUDINARY_API_SECRET'],
          message:
            'CLOUDINARY_API_SECRET is required when Cloudinary storage credentials are provided.',
        })
      }
    }
  })

export type EnvConfig = z.infer<typeof envSchema>

/**
 * Validates and sanitizes environment configuration.
 * Never prints secret values to console, output, or error messages.
 */
export function validateEnv(rawEnv: Record<string, string | undefined> = process.env): {
  success: boolean
  data?: EnvConfig
  errors?: string[]
} {
  const parsed = envSchema.safeParse(rawEnv)

  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map(
      (issue) => `[${issue.path.join('.')}]: ${issue.message}`
    )
    return {
      success: false,
      errors: errorMessages,
    }
  }

  return {
    success: true,
    data: parsed.data,
  }
}

/**
 * Returns validated environment configuration or throws descriptive Error
 * in production environments. Never leaks credential contents.
 */
export function getValidatedEnv(rawEnv: Record<string, string | undefined> = process.env): EnvConfig {
  const result = validateEnv(rawEnv)

  if (!result.success) {
    const header = '❌ Environment validation failed:'
    const body = result.errors?.map((err) => `  - ${err}`).join('\n') || ''
    const fullMessage = `${header}\n${body}`

    const isBuildPhase =
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.npm_lifecycle_event === 'build'

    if (rawEnv.NODE_ENV === 'production' && !isBuildPhase) {
      throw new Error(`Production startup aborted due to invalid environment configuration:\n${body}`)
    } else {
      console.warn(fullMessage)
      // Fallback with defaults for development/test mode or build phase
      return {
        NODE_ENV: (rawEnv.NODE_ENV as any) || 'development',
        DATABASE_URL: rawEnv.DATABASE_URL || 'postgresql://localhost:5432/acm_incursion',
        AUTH_SECRET: rawEnv.AUTH_SECRET || rawEnv.NEXTAUTH_SECRET || 'acm-incursion-jwt-secret-dev-2026',
        NEXT_PUBLIC_APP_URL: rawEnv.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        AGENT_ASSISTANT_URL: rawEnv.AGENT_ASSISTANT_URL,
        AGENT_ASSISTANT_TOKEN: rawEnv.AGENT_ASSISTANT_TOKEN,
        TZ_APP: rawEnv.TZ_APP || 'Asia/Kolkata',
        ALLOWED_EMAIL_DOMAIN: rawEnv.ALLOWED_EMAIL_DOMAIN,
        GOOGLE_CLIENT_ID: rawEnv.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: rawEnv.GOOGLE_CLIENT_SECRET,
        CLOUDINARY_CLOUD_NAME: rawEnv.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: rawEnv.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: rawEnv.CLOUDINARY_API_SECRET,
      }
    }
  }

  return result.data!
}

export const env = getValidatedEnv()
