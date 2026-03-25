import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let postgresContainer: StartedPostgreSqlContainer;

export const getPostgresConnection = () => {
  if (!postgresContainer) {
    throw new Error('PostgreSQL container not initialized');
  }

  return {
    host: postgresContainer.getHost(),
    port: postgresContainer.getPort(),
    username: postgresContainer.getUsername(),
    password: postgresContainer.getPassword(),
    database: postgresContainer.getDatabase(),
  };
};

beforeAll(async () => {
  postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('test_integration_db')
    .withUsername('test')
    .withPassword('test')
    .start();

  const connection = getPostgresConnection();

  process.env.DB_HOST = connection.host;
  process.env.DB_PORT = connection.port.toString();
  process.env.DB_USERNAME = connection.username;
  process.env.DB_PASSWORD = connection.password;
  process.env.DB_DATABASE = connection.database;
  process.env.NODE_ENV = 'test';
}, 120000);

afterAll(async () => {
  if (postgresContainer) {
    await postgresContainer.stop();
  }
}, 30000);
