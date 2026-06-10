/**
 * Typed configuration loaded from environment variables.
 * Consumed via Nest's ConfigService (e.g. config.get('trustlessWork.apiUrl')).
 */
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-in-local-env',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
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
