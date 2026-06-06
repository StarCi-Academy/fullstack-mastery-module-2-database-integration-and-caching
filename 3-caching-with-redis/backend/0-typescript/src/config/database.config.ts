/**
 * Database + Redis configuration namespace.
 * Uses `registerAs` so the config is injectable via ConfigService
 * and can be loaded lazily (avoids eager process.env reads at import time).
 */
import {
    registerAs
} from "@nestjs/config"

/**
 * Shape of the "database" config namespace.
 * Both TypeORM (Layer 1 query cache) and cache-manager (Layer 2/3) share
 * the same Redis instance — they just use different connection wrappers.
 */
export interface DatabaseConfig {
    postgres: {
        /** Postgres hostname; defaults to localhost for local Docker Compose setup. */
        host: string
        /** Postgres port; 5432 is the default Postgres port. */
        port: number
        /** Postgres role name; matches POSTGRES_USER in compose.yaml. */
        username: string
        /** Postgres password; matches POSTGRES_PASSWORD in compose.yaml. */
        password: string
        /** Logical database name; matches POSTGRES_DB in compose.yaml. */
        database: string
    }
    redis: {
        /** Full Redis connection URI (e.g. redis://localhost:6379). */
        uri: string
    }
}

/**
 * Registered config factory for the "database" namespace.
 * Defaults are intentionally set to match the local Docker Compose setup
 * (no .env edits required to run the demo).
 */
export const databaseConfig = registerAs("database",
    (): DatabaseConfig => ({
        postgres: {
            // Fallback to localhost when running outside Docker
            host: process.env.POSTGRES_HOST ?? "localhost",
            // Use || not ?? so "0" still becomes the default (invalid port guard)
            port: Number(process.env.POSTGRES_PORT) || 5432,
            username: process.env.POSTGRES_USER ?? "postgres",
            password: process.env.POSTGRES_PASSWORD ?? "postgres",
            database: process.env.POSTGRES_DB ?? "demo",
        },
        redis: {
            // Shared Redis URI used by both cache-manager and TypeORM query cache
            uri: process.env.REDIS_URI ?? "redis://localhost:6379",
        }
    }))
