/**
 * 环境变量集中加载,供 ConfigService 使用。
 * 用法:
 *   const port = this.configService.get<number>('port');
 *   const jwt  = this.configService.get('jwt.secret');
 */
export default () => {
  const env = process.env.NODE_ENV || 'development';
  const defaultOrigins = env === 'production'
    ? []
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'];
  return {
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || (env === 'production' ? '127.0.0.1' : '0.0.0.0'),
  env,
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean)
    : defaultOrigins,
  storage: {
    publicDir: process.env.PUBLIC_UPLOAD_DIR || `${process.cwd()}/uploads`,
    privateDir: process.env.PRIVATE_UPLOAD_DIR || `${process.cwd()}/private-uploads`,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  };
};
