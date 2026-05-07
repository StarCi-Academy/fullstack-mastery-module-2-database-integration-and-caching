import {
    registerAs 
} from "@nestjs/config"

export interface DatabaseConfig {
    postgres: {
        host: string
        port: number
        username: string
        password: string
        database: string
    }
    mongo: {
        uri: string
    }
}

export const databaseConfig = registerAs("database",
    (): DatabaseConfig => ({
        postgres: {
            host: process.env.POSTGRES_HOST ?? "localhost",
            port: Number(process.env.POSTGRES_PORT) || 5432,
            username: process.env.POSTGRES_USER ?? "postgres",
            password: process.env.POSTGRES_PASSWORD ?? "postgres",
            database: process.env.POSTGRES_DB ?? "demo",
        },
        mongo: {
            uri: process.env.MONGO_URI ?? "mongodb://starci_admin:starci_password@localhost:27017/starci_db?authSource=admin",
        },
    }))
