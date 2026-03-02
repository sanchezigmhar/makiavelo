export default () => ({
  port: parseInt(process.env.PORT, 10) || 4001,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4000',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'makicore-super-secret-key-change-in-production',
    expiration: process.env.JWT_EXPIRATION || '8h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'makicore-refresh-secret-key-change-in-production',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/makicore?schema=public',
  },
  brand: {
    darkGreen: '#1B3A2D',
    orangeGold: '#D4842A',
    cream: '#F5E6C8',
  },
});
