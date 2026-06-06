import {
    registerAs
} from "@nestjs/config"

/**
 * Shape of the database configuration namespace.
 * Groups all Postgres connection parameters under a single typed object
 * so downstream consumers (e.g. TypeOrmModule.forRootAsync) receive a single injection token.
 */
export interface DatabaseConfig {
    /** PostgreSQL connection parameters. */
    postgres: {
        /** Hostname or IP of the PostgreSQL server. Defaults to "localhost". */
        host: string
        /** TCP port the server listens on. Defaults to 5432. */
        port: number
        /** Database role used to authenticate. Defaults to "postgres". */
        username: string
        /** Password for the database role. Defaults to "postgres". */
        password: string
        /** Name of the target database. Defaults to "demo". */
        database: string
    }
}

/**
 * NestJS `registerAs` factory — registers the database config under the "database" namespace key.
 * This allows injection via `@Inject(databaseConfig.KEY)` (typed access) instead of raw `ConfigService.get`.
 * All values fall back to sensible local-dev defaults so the demo runs without a `.env` file.
 */
export const databaseConfig = registerAs("database",
    (): DatabaseConfig => ({
        postgres: {
            // Read host from env; fall back to localhost for local Docker Compose setup.
            host: process.env.POSTGRES_HOST ?? "localhost",
            // Parse port as integer; default to standard PostgreSQL port 5432.
            port: Number(process.env.POSTGRES_PORT) || 5432,
            // Username for the PostgreSQL role; default matches the Docker Compose POSTGRES_USER.
            username: process.env.POSTGRES_USER ?? "postgres",
            // Password; default matches the Docker Compose POSTGRES_PASSWORD.
            password: process.env.POSTGRES_PASSWORD ?? "postgres",
            // Database name; default matches the Docker Compose POSTGRES_DB.
            database: process.env.POSTGRES_DB ?? "demo",
        },
    }))
