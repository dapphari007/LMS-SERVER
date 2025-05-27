import "reflect-metadata";
import { DataSource } from "typeorm";
import config from "./config";
import path from "path";
import logger from "../utils/logger";

// Create DataSource configuration based on environment
const getDataSourceConfig = () => {
  // Force load environment variables
  require('dotenv').config();
  
  // Define entity paths more explicitly to ensure they're loaded correctly
  const entitiesPath = path.join(__dirname, "../models");
  console.log("Entities path:", entitiesPath);
  
  // List all entity files to ensure they're found
  try {
    const fs = require('fs');
    const entityFiles = fs.readdirSync(entitiesPath);
    console.log("Entity files found:", entityFiles);
  } catch (error) {
    console.error("Error reading entity files:", error);
  }
  
  // Check if DATABASE_URL is provided (Railway and other platforms provide this)
  if (process.env.DATABASE_URL) {
    console.log("Using DATABASE_URL for connection");
    console.log("DATABASE_URL starts with:", process.env.DATABASE_URL.substring(0, 15) + "...");
    
    return {
      type: "postgres",
      url: process.env.DATABASE_URL,
      synchronize: false,
      logging: process.env.DEBUG === "true", // Enable logging based on DEBUG flag
      entities: [
        path.join(__dirname, "../models/**/*.{ts,js}"),
        path.join(__dirname, "../models/*.{ts,js}")
      ],
      migrations: [path.join(__dirname, "../migrations/**/*.{ts,js}")],
      subscribers: [path.join(__dirname, "../subscribers/**/*.{ts,js}")],
      cache: false,
      ssl: { rejectUnauthorized: false }, // Always use SSL with rejectUnauthorized: false for Railway
      extra: {
        // Add connection pool settings
        max: 20, // Maximum number of clients in the pool
        connectionTimeoutMillis: 10000, // Connection timeout in milliseconds
        idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
        // Add retry logic
        retry: {
          retries: 5,
          factor: 2,
          minTimeout: 1000,
          maxTimeout: 10000
        }
      },
      // Add retry logic for connections
      retryAttempts: 10,
      retryDelay: 3000
    };
  } else {
    console.log("DATABASE_URL not found, using individual connection parameters");
    console.log("DB_HOST:", config.database.host);
    console.log("DB_PORT:", config.database.port);
    
    // For Railway deployment, if DATABASE_URL is not set but we're in production,
    // try to construct it from the Railway PostgreSQL environment variables
    if (process.env.NODE_ENV === 'production' && 
        process.env.PGHOST && process.env.PGDATABASE && 
        process.env.PGUSER && process.env.PGPASSWORD) {
      
      console.log("Constructing DATABASE_URL from Railway PostgreSQL environment variables");
      const constructedUrl = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}`;
      console.log("Constructed URL starts with:", constructedUrl.substring(0, 15) + "...");
      
      return {
        type: "postgres",
        url: constructedUrl,
        synchronize: false,
        logging: true,
        entities: [
          path.join(__dirname, "../models/**/*.{ts,js}"),
          path.join(__dirname, "../models/*.{ts,js}")
        ],
        migrations: [path.join(__dirname, "../migrations/**/*.{ts,js}")],
        subscribers: [path.join(__dirname, "../subscribers/**/*.{ts,js}")],
        cache: false,
        ssl: { rejectUnauthorized: false },
        extra: {
          max: 20,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000
        }
      };
    }
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
    logging: true, // Enable SQL logging for debugging
    entities: [
      path.join(__dirname, "../models/**/*.{ts,js}"),
      path.join(__dirname, "../models/*.{ts,js}")
    ],
    migrations: [path.join(__dirname, "../migrations/**/*.{ts,js}")],
    subscribers: [path.join(__dirname, "../subscribers/**/*.{ts,js}")],
    cache: false, // Disable metadata caching
  };
};

// Create the DataSource with more detailed logging
const dataSourceConfig = getDataSourceConfig() as any;
console.log("DataSource configuration type:", dataSourceConfig.type);
console.log("DataSource configuration entities path:", dataSourceConfig.entities);
console.log("DataSource configuration SSL:", dataSourceConfig.ssl ? "Enabled" : "Disabled");

// If we have a URL, log a portion of it
if (dataSourceConfig.url) {
  console.log("DataSource URL starts with:", dataSourceConfig.url.substring(0, 15) + "...");
}

export const AppDataSource = new DataSource(dataSourceConfig);

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

    // Initialize the connection with more detailed error handling
    logger.info("Initializing database connection...");
    console.log("Database URL available:", !!process.env.DATABASE_URL);
    
    // First try to connect with a direct pg client to verify the connection parameters
    let directConnectionSuccessful = false;
    try {
      const { Client } = require('pg');
      const connectionString = process.env.DATABASE_URL || 
        `postgresql://${process.env.DB_USERNAME || 'postgres'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_DATABASE || 'leave_management'}`;
      
      const client = new Client({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      await client.connect();
      logger.info("Direct pg client connection successful");
      
      // Test a simple query
      const result = await client.query('SELECT current_database() as db_name');
      logger.info(`Connected to database: ${result.rows[0].db_name}`);
      
      await client.end();
      directConnectionSuccessful = true;
    } catch (pgError) {
      logger.error("Direct pg client connection failed:", pgError);
    }
    
    if (!directConnectionSuccessful) {
      logger.error("Cannot establish direct database connection, TypeORM connection will likely fail");
    }
    
    // Now try to initialize TypeORM
    try {
      await AppDataSource.initialize();
      logger.info("Database connected successfully via TypeORM");
    } catch (initError) {
      logger.error("Failed to initialize TypeORM database connection:", initError);
      
      // Try to diagnose the issue
      if (initError.message.includes("getaddrinfo ENOTFOUND")) {
        logger.error("DNS resolution failed. Check your database host name.");
      } else if (initError.message.includes("connect ETIMEDOUT")) {
        logger.error("Connection timed out. Check your network or firewall settings.");
      } else if (initError.message.includes("password authentication failed")) {
        logger.error("Authentication failed. Check your database username and password.");
      } else if (initError.message.includes("database") && initError.message.includes("does not exist")) {
        logger.error("Database does not exist. Create the database or check the database name.");
      } else if (initError.message.includes("Driver not Connected")) {
        logger.error("Driver not connected. This might be due to incorrect connection parameters or the database server is not running.");
      }
      
      // If direct connection was successful but TypeORM failed, we have a TypeORM-specific issue
      if (directConnectionSuccessful) {
        logger.warn("Direct database connection works but TypeORM connection failed. This suggests a TypeORM configuration issue.");
        
        // Try with a simplified DataSource configuration
        try {
          logger.info("Attempting to initialize with simplified DataSource configuration...");
          
          const { DataSource } = require("typeorm");
          const simplifiedConfig = {
            type: "postgres",
            url: process.env.DATABASE_URL,
            synchronize: false,
            logging: true,
            entities: [],  // No entities for this test
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
          };
          
          const testDataSource = new DataSource(simplifiedConfig as any);
          await testDataSource.initialize();
          logger.info("Simplified DataSource initialized successfully");
          await testDataSource.destroy();
          
          // If simplified config works, the issue is likely with the entity definitions
          logger.warn("The issue appears to be with entity definitions or migrations, not the connection itself");
        } catch (simplifiedError) {
          logger.error("Simplified DataSource initialization also failed:", simplifiedError);
        }
      }
      
      // Rethrow the error to be handled by the caller
      throw initError;
    }

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
      
      // Check for common database schema issues
      try {
        // Check for case sensitivity issues in column names
        const userColumns = await AppDataSource.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users'
        `);
        
        // Log column names for debugging
        logger.info(`User table columns: ${userColumns.map((col: any) => col.column_name).join(', ')}`);
        
        // Check for specific columns that might have case sensitivity issues
        const roleIdColumn = userColumns.find((col: any) => 
          col.column_name.toLowerCase() === 'roleid');
        
        if (roleIdColumn && roleIdColumn.column_name !== 'roleId') {
          logger.warn(`Found column '${roleIdColumn.column_name}' instead of 'roleId' - case sensitivity issue detected`);
        }
        
      } catch (schemaError) {
        logger.warn("Error checking database schema:", schemaError);
      }
      
    } catch (error) {
      logger.warn("Database connection test failed, reconnecting...");
      await initializeDatabase();
    }
  } catch (error) {
    logger.error("Failed to ensure database connection:", error);
    throw error;
  }
};
