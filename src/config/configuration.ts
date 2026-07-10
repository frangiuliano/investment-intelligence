export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/investment_intelligence',
});
