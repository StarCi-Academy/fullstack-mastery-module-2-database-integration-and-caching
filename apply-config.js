const fs = require('fs');
const path = require('path');

const configData = {
    '0-sql-vs-nosql-in-nestjs': {
        env: `POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=starci_user
POSTGRES_PASSWORD=starci_password
POSTGRES_DB=starci_sql_db
MONGO_URI=mongodb://starci_admin:starci_password@localhost:27017/starci_nosql_db?authSource=admin
`,
        appModuleReplacements: [
            {
                from: `TypeOrmModule.forRoot({
            type: "postgres",
            host: process.env.PG_HOST ?? "localhost",
            port: Number(process.env.PG_PORT ?? 5432),
            username: process.env.PG_USER ?? "starci_user",
            password: process.env.PG_PASSWORD ?? "starci_password",
            database: process.env.PG_DATABASE ?? "starci_sql_db",
            entities: [SqlComparisonItemEntity],
            synchronize: true,
        }),`,
                to: `ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig],
        }),
        TypeOrmModule.forRootAsync({
            inject: [databaseConfig.KEY],
            useFactory: (dbConfig: DatabaseConfig) => ({
                type: "postgres",
                host: dbConfig.postgres.host,
                port: dbConfig.postgres.port,
                username: dbConfig.postgres.username,
                password: dbConfig.postgres.password,
                database: dbConfig.postgres.database,
                entities: [SqlComparisonItemEntity],
                synchronize: true,
            }),
        }),`
            },
            {
                from: `MongooseModule.forRoot(
            process.env.MONGO_URI ??
            "mongodb://starci_admin:starci_password@localhost:27017/starci_nosql_db?authSource=admin",
        ),`,
                to: `MongooseModule.forRootAsync({
            inject: [databaseConfig.KEY],
            useFactory: (dbConfig: DatabaseConfig) => ({
                uri: dbConfig.mongo.uri,
            }),
        }),`
            },
            {
                from: `import {
    CompareModule,
    SqlComparisonItemEntity,
} from "./modules"`,
                to: `import {
    CompareModule,
    SqlComparisonItemEntity,
} from "./modules"
import {
    ConfigModule,
} from "@nestjs/config"
import {
    databaseConfig, DatabaseConfig,
} from "./config"`
            }
        ]
    },
    '1-typeorm-and-postgresql': {
        env: `POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=demo
`,
        appModuleReplacements: [
            {
                from: `TypeOrmModule.forRoot({
            type: "postgres",
            host: "localhost",
            port: 5432,
            username: "postgres",
            password: "postgres",
            database: "demo",`,
                to: `ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig],
        }),
        TypeOrmModule.forRootAsync({
            inject: [databaseConfig.KEY],
            useFactory: (dbConfig: DatabaseConfig) => ({
                type: "postgres",
                host: dbConfig.postgres.host,
                port: dbConfig.postgres.port,
                username: dbConfig.postgres.username,
                password: dbConfig.postgres.password,
                database: dbConfig.postgres.database,`
            },
            {
                from: `import {
    TypeOrmModule,
} from "@nestjs/typeorm"`,
                to: `import {
    TypeOrmModule,
} from "@nestjs/typeorm"
import {
    ConfigModule,
} from "@nestjs/config"
import {
    databaseConfig, DatabaseConfig,
} from "./config"`
            }
        ]
    },
    '2-mongoose-and-mongodb': {
        env: `MONGO_URI=mongodb://starci_admin:starci_password@localhost:27017/starci_db?authSource=admin
`,
        appModuleReplacements: [
            {
                from: `MongooseModule.forRoot(
            "mongodb://starci_admin:starci_password@localhost:27017/starci_db?authSource=admin",
        ),`,
                to: `ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig],
        }),
        MongooseModule.forRootAsync({
            inject: [databaseConfig.KEY],
            useFactory: (dbConfig: DatabaseConfig) => ({
                uri: dbConfig.mongo.uri,
            }),
        }),`
            },
            {
                from: `import {
    MongooseModule 
} from "@nestjs/mongoose"`,
                to: `import {
    MongooseModule 
} from "@nestjs/mongoose"
import {
    ConfigModule 
} from "@nestjs/config"
import {
    databaseConfig, DatabaseConfig 
} from "./config"`
            }
        ]
    },
    '3-caching-with-redis': {
        env: `POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=demo
REDIS_URI=redis://localhost:6379
`,
        appModuleReplacements: [
            {
                from: `TypeOrmModule.forRoot({
            type: "postgres",
            host: "localhost",
            port: 5432,
            username: "postgres",
            password: "postgres",
            database: "demo",`,
                to: `ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig],
        }),
        TypeOrmModule.forRootAsync({
            inject: [databaseConfig.KEY],
            useFactory: (dbConfig: DatabaseConfig) => ({
                type: "postgres",
                host: dbConfig.postgres.host,
                port: dbConfig.postgres.port,
                username: dbConfig.postgres.username,
                password: dbConfig.postgres.password,
                database: dbConfig.postgres.database,`
            },
            {
                from: `useFactory: async () => {
                return {
                    stores: [
                        // Ưu tiên Redis cho data chia sẻ (EN: Prioritize Redis for shared data)
                        new KeyvRedis("redis://localhost:6379"),`,
                to: `inject: [databaseConfig.KEY],
            useFactory: async (dbConfig: DatabaseConfig) => {
                return {
                    stores: [
                        // Ưu tiên Redis cho data chia sẻ (EN: Prioritize Redis for shared data)
                        new KeyvRedis(dbConfig.redis.uri),`
            },
            {
                from: `import {
    CacheModule 
} from "@nestjs/cache-manager"`,
                to: `import {
    CacheModule 
} from "@nestjs/cache-manager"
import {
    ConfigModule 
} from "@nestjs/config"
import {
    databaseConfig, DatabaseConfig 
} from "./config"`
            }
        ]
    }
};

const baseConfigTemplate = `import { registerAs } from "@nestjs/config"

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
    redis: {
        uri: string
    }
}

export const databaseConfig = registerAs("database", (): DatabaseConfig => ({
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
    redis: {
        uri: process.env.REDIS_URI ?? "redis://localhost:6379",
    }
}))
`;

const indexTemplate = `export * from "./database.config"
`;

Object.keys(configData).forEach(lesson => {
    const data = configData[lesson];
    const lessonPath = path.join(__dirname, lesson);
    
    // Write .env
    fs.writeFileSync(path.join(lessonPath, '.env'), data.env);
    console.log('Created .env for', lesson);
    
    // Create config folder
    const configDir = path.join(lessonPath, 'src', 'config');
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir);
    
    // Write config files
    fs.writeFileSync(path.join(configDir, 'database.config.ts'), baseConfigTemplate);
    fs.writeFileSync(path.join(configDir, 'index.ts'), indexTemplate);
    console.log('Created config files for', lesson);
    
    // Update app.module.ts
    const appModulePath = path.join(lessonPath, 'src', 'app.module.ts');
    let appModuleContent = fs.readFileSync(appModulePath, 'utf8');
    
    data.appModuleReplacements.forEach(rep => {
        if (!appModuleContent.includes(rep.from)) {
            console.error('Failed to find replace block in', lesson, '\\n', rep.from);
        } else {
            appModuleContent = appModuleContent.replace(rep.from, rep.to);
        }
    });
    
    fs.writeFileSync(appModulePath, appModuleContent, 'utf8');
    console.log('Updated app.module.ts for', lesson);
});
