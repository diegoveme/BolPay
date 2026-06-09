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
  trustlessWork: {
    apiUrl: process.env.TRUSTLESS_WORK_API_URL ?? 'https://dev.api.trustlesswork.com',
    apiKey: process.env.TRUSTLESS_WORK_API_KEY ?? '',
  },
  stellar: {
    network: process.env.STELLAR_NETWORK ?? 'testnet',
    usdcIssuer:
      process.env.USDC_ISSUER ??
      'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  },
  circle: {
    apiKey: process.env.CIRCLE_API_KEY ?? '',
  },
});
