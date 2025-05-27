import "reflect-metadata";
import { DataSource } from "typeorm";
import config from "./config";
import path from "path";
import logger from "../utils/logger";

// Create DataSource configuration based on environment
const getDataSourceConfig = () => {
  // Check if DATABASE_URL is provided (Railway and other platforms provide this)
  if (process.env.DATABASE_URL) {
    console.log("Using DATABASE_URL for connection");
    return {
      type: "postgres",
      url: process.env.DATABASE_URL,
      synchronize: false,
      logging: true, // Enable logging to debug connection issues
      entities: [path.join(__dirname, "../models/**/*.{ts,js}")],
      migrations: [path.join(__dirname, "../migrations/**/*.{ts,js}")],
      subscribers: [path.join(__dirname, "../subscribers/**/*.{ts,js}")],
      cache: false,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      extra: {
        // Add connection pool settings
        max: 20, // Maximum number of clients in the pool
        connectionTimeoutMillis: 10000, // Connection timeout in milliseconds
        idleTimeoutMillis: 30000 // How long a client is allowed to remain idle before being closed
      }
    };
  }
  
  // Fallback to individual connection parameters
  return {
    type: "postgres",
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    synchronize: false, // Disable auto-synchronization to prevent data loss
    logging: false, // Disable SQL logging
    entities: [path.join(__dirname, "../models/**/*.{ts,js}")],
    migrations: [path.join(__dirname, "../migrations/**/*.{ts,js}")],
    subscribers: [path.join(__dirname, "../subscribers/**/*.{ts,js}")],
    cache: false, // Disable metadata caching
  };
};

export const AppDataSource = new DataSource(getDataSourceConfig() as any);

export const initializeDatabase = async (): Promise<void> => {
  try {
    // Log connection attempt
    logger.info("Attempting to connect to database...");
    console.log("Database URL:", process.env.DATABASE_URL ? "Using DATABASE_URL (value hidden for security)" : "Not using DATABASE_URL");
    console.log("NODE_ENV:", process.env.NODE_ENV);
    
    // If the connection is already established, close it first
    if (AppDataSource.isInitialized) {
      logger.info("Closing existing database connection");
      await AppDataSource.destroy();
    }

    // Initialize the connection
    logger.info("Initializing database connection...");
    await AppDataSource.initialize();
    logger.info("Database connected successfully");

    // Check if tables exist but don't create or modify them
    // This preserves existing data including HR, managers, and leave types
    const tableExists = async (tableName: string): Promise<boolean> => {
      try {
        const result = await AppDataSource.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [tableName]
        );
        return result[0].exists;
      } catch (err) {
        return false;
      }
    };

    // Get all entity metadata
    const entities = AppDataSource.entityMetadatas;

    // Check tables but don't modify them
    for (const entity of entities) {
      const exists = await tableExists(entity.tableName);
      if (!exists) {
        logger.warn(
          `* Table ${entity.tableName} does not exist. Run migrations to create it.`
        );
      }
    }

    // Check for pending migrations
    const pendingMigrations = await AppDataSource.showMigrations();
    if (pendingMigrations) {
      logger.info("* There are pending migrations that need to be applied");
      
      try {
        // Run migrations automatically
        logger.info("* Running pending migrations...");
        await AppDataSource.runMigrations();
        logger.info("* Migrations completed successfully");
      } catch (migrationError) {
        logger.error("* Error running migrations:", migrationError);
        
        // Try running migrations one by one
        logger.info("* Attempting to run migrations individually...");
        
        try {
          // Get all migration files
          const migrationFiles = AppDataSource.migrations;
          
          for (const migration of migrationFiles) {
            try {
              const queryRunner = AppDataSource.createQueryRunner();
              await migration.up(queryRunner);
              await queryRunner.release();
              logger.info(`* Successfully ran migration: ${migration.name}`);
            } catch (singleMigrationError) {
              logger.error(`* Error running migration ${migration.name}:`, singleMigrationError);
            }
          }
        } catch (migrationListError) {
          logger.error("* Error getting migrations list:", migrationListError);
        }
      }
    }

    logger.info("* Database check completed, preserving all existing data");
  } catch (error) {
    logger.error("Error during database initialization:", error);
    throw error;
  }
};

// Function to ensure database connection is established
export const ensureDatabaseConnection = async (): Promise<void> => {
  try {
    // Check if connection is initialized and connected
    if (!AppDataSource.isInitialized) {
      logger.warn(
        "Database connection not initialized, attempting to initialize..."
      );
      await initializeDatabase();
      return;
    }

    // Test the connection with a simple query
    try {
      await AppDataSource.query("SELECT 1");
    } catch (error) {
      logger.warn("Database connection test failed, reconnecting...");
      await initializeDatabase();
    }
  } catch (error) {
    logger.error("Failed to ensure database connection:", error);
    throw error;
  }
};
