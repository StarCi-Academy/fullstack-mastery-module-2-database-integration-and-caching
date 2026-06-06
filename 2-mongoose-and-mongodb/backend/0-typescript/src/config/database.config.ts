import {
    registerAs 
} from "@nestjs/config"

export interface DatabaseConfig {
    mongo: {
        uri: string
    }
}

export const databaseConfig = registerAs("database",
    (): DatabaseConfig => ({
        mongo: {
            uri: process.env.MONGO_URI ?? "mongodb://starci_admin:starci_password@localhost:27017/starci_db?authSource=admin",
        },
    }))
