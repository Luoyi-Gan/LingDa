/**
 * 环境变量集中加载,供 ConfigService 使用。
 * 用法:
 *   const port = this.configService.get<number>('port');
 *   const jwt  = this.configService.get('jwt.secret');
 */
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  env: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
});
