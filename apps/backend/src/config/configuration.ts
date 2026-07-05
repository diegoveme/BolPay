const JWT_SECRET_PLACEHOLDER = 'change-me-in-local-env';

/**
 * Resolve the JWT secret, failing closed outside development. Production (and
 * any non-development NODE_ENV) must never boot with an empty or placeholder
 * secret; only development keeps the convenience default.
 */
function resolveJwtSecret(): string {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const secret = process.env.JWT_SECRET ?? '';
  if (nodeEnv !== 'development') {
    if (!secret || secret === JWT_SECRET_PLACEHOLDER) {
      throw new Error(
        'JWT_SECRET must be set to a strong value when NODE_ENV is not development',
      );
    }
    return secret;
  }
  return secret || JWT_SECRET_PLACEHOLDER;
}

/**
 * Typed configuration loaded from environment variables.
 * Consumed via Nest's ConfigService (e.g. config.get('trustlessWork.apiUrl')).
 */
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL,
  // Public URL of the web client, used to build links in transactional emails
  // (email verification, invitations).
  webUrl: process.env.WEB_URL ?? 'http://localhost:5173',
  // Allowed browser origins for CORS. Comma-separated list; defaults to webUrl.
  corsOrigins: (process.env.CORS_ORIGINS ?? process.env.WEB_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
  jwt: {
    secret: resolveJwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  // Transactional email over SMTP (Gmail, Brevo, etc.). When host/user/pass are
  // empty, emails are logged to the console instead of sent (local development).
  // For Gmail: host smtp.gmail.com, port 465, user = the address, pass = a
  // Google App Password (requires 2-step verification enabled on the account).
  mail: {
    smtpHost: process.env.SMTP_HOST ?? '',
    smtpPort: parseInt(process.env.SMTP_PORT ?? '465', 10),
    smtpUser: process.env.SMTP_USER ?? '',
    smtpPass: process.env.SMTP_PASS ?? '',
    from: process.env.MAIL_FROM ?? '',
  },
  // Supabase Storage (avatars/logos). URL + anon key; the avatars bucket is
  // public-read with an anon insert policy. Server-side upload keeps the flow
  // behind our JWT.
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    anonKey: process.env.SUPABASE_ANON_KEY ?? '',
    avatarBucket: process.env.SUPABASE_AVATAR_BUCKET ?? 'avatars',
  },
  // Pollar (onboarding-to-payment on Stellar). The publishable key lives in the
  // clients; the backend only needs the secret key for privileged calls
  // (wallet lookups / activation). Optional: when empty, wallet verification
  // against the Pollar Server is skipped (testnet development).
  pollar: {
    apiUrl: process.env.POLLAR_API_URL ?? 'https://api.pollar.xyz',
    secretKey: process.env.POLLAR_SECRET_KEY ?? '',
  },
  trustlessWork: {
    apiUrl:
      process.env.TRUSTLESS_WORK_API_URL ?? 'https://dev.api.trustlesswork.com',
    apiKey: process.env.TRUSTLESS_WORK_API_KEY ?? '',
  },
  // 'trustless_work' performs real escrow operations on Stellar testnet and
  // requires TRUSTLESS_WORK_API_KEY + STELLAR_PLATFORM_SECRET. 'simulated'
  // keeps the full product flow working without touching the chain.
  escrowMode: process.env.ESCROW_MODE ?? 'simulated',
  stellar: {
    network: process.env.STELLAR_NETWORK ?? 'testnet',
    usdcIssuer:
      process.env.USDC_ISSUER ??
      'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    // Platform-operated testnet account used to sign escrow XDRs returned by
    // Trustless Work (deploy / fund / release). Never use a mainnet key here.
    platformSecret: process.env.STELLAR_PLATFORM_SECRET ?? '',
    platformAddress: process.env.STELLAR_PLATFORM_ADDRESS ?? '',
  },
  payroll: {
    // Cron expression for the payroll scheduler tick.
    cron: process.env.PAYROLL_CRON ?? '0 * * * *',
    schedulerEnabled:
      (process.env.PAYROLL_SCHEDULER_ENABLED ?? 'true') === 'true',
  },
});
