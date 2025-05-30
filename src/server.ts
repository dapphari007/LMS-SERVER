import "reflect-metadata";
// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

// Force set DATABASE_URL for Railway deployment
try {
  // Always load the database URL from the script
  const dbConfig = require('./scripts/set-db-url');
  console.log('DATABASE_URL has been set manually');
  
  // Double-check that it's actually set
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is still not set after loading from script');
    process.env.DATABASE_URL = dbConfig.DATABASE_URL;
    console.log('Explicitly set DATABASE_URL from script export');
  }
} catch (error) {
  console.error('Error setting DATABASE_URL manually:', error);
}

import Hapi from "@hapi/hapi";
import Joi from "joi";
import { registerPlugins } from "./plugins";
import { registerRoutes } from "./routes";
import {
  initializeDatabase,
  ensureDatabaseConnection,
  AppDataSource,
} from "./config/database";
import config from "./config/config";
import logger from "./utils/logger";
import { ensureDefaultUsers } from "./utils/ensure-default-users";
import { createDefaultLeaveTypes } from "./scripts/createDefaultLeaveTypes";
import { createHolidays } from "./scripts/createHolidays2025";
import { initializeSystemRoles, updateUserRoleIds } from "./controllers/roleController";
import { initializeSystemPages } from "./controllers/pageController";
import { createTestUser } from "./scripts/createTestUser";
import { createDefaultDepartments } from "./scripts/createDefaultDepartments";
import { createDefaultPositions } from "./scripts/createDefaultPositions";
import { createDefaultRoles } from "./scripts/createDefaultRoles";
import { setupDefaultData } from "./scripts/setupDefaultData";
import { initializeWorkflows } from "./services/workflowInitService";
import { showRoles } from "./scripts/showRoles";
import { createCustomRole } from "./scripts/manageRoles";
import { syncEssentialData } from "./scripts/syncEssentialData";
import { checkEssentialData } from "./scripts/checkEssentialData";
import { initializeSystem } from "./scripts/initializeSystem";

const init = async () => {
  try {
    // Create Hapi server first so we can start it even if database connection fails
    // Railway sets PORT environment variable, so use that if available
    const port = process.env.PORT || config.server.port;
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : config.server.host;
    
    console.log(`Starting server on ${host}:${port} in ${process.env.NODE_ENV} mode`);
    
    const server = Hapi.server({
      port: port,
      host: host,
      routes: {
        cors: {
          origin: process.env.NODE_ENV === 'production' 
            ? [
                'https://lms-client-production.up.railway.app', // Railway client URL
                'https://lms-client-seven-azure.vercel.app', // Your Vercel app domain
                'https://*.vercel.app', // Allow all subdomains for preview deployments
                process.env.CLIENT_URL || 'https://lms-client-production.up.railway.app',
                ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) : [])
              ].filter(Boolean).flat() 
            : ["http://localhost:5173"], // In development, allow the Vite dev server
          credentials: true,
          additionalHeaders: ["Authorization", "Content-Type", "X-Requested-With"],
          additionalExposedHeaders: ["Authorization"],
          maxAge: 86400, // 24 hours
        },
        validate: {
          failAction: async (request, h, err) => {
            const error = err as Error;
            if (process.env.NODE_ENV === "production") {
              // In production, log the error but return a generic message
              logger.error(
                `Validation error: ${error?.message || "Unknown error"}`
              );
              throw new Error(`Invalid request payload input`);
            } else {
              // During development, log and respond with the full error
              logger.error(
                `Validation error: ${error?.message || "Unknown error"}`
              );
              throw error;
            }
          },
        },
      },
    });
    
    // Register plugins
    await registerPlugins(server);
    
    // Register routes (including health check routes)
    registerRoutes(server);
    
    // Start the server before attempting database connection
    await server.start();
    logger.info(`Server running on ${server.info.uri}`);
    
    // Initialize database connection with retry mechanism in the background
    // This allows the health check to respond even if the database is not yet connected
    (async () => {
      let retries = 5;
      while (retries > 0) {
        try {
          await initializeDatabase();
          logger.info("Database connected successfully");
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            logger.error("All database connection attempts failed");
            // Don't throw error here, just log it
          }
          logger.warn(
            `Database connection failed, retrying... (${retries} attempts left)`
          );
          await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds before retrying
        }
      }
    })();

    // First, test the direct database connection
    try {
      const directDb = require('./utils/direct-db-connection');
      const connectionSuccessful = await directDb.testConnection();
      
      if (!connectionSuccessful) {
        logger.error("Direct database connection failed, cannot proceed with setup");
        throw new Error("Database connection failed");
      }
      
      logger.info("Direct database connection successful, proceeding with setup");
      
      // Initialize the database schema if needed
      await directDb.initializeSchema();
      
      // Now proceed with TypeORM operations only if the database is connected
      if (AppDataSource.isInitialized) {
        // Ensure the maxSteps column exists in the workflow_categories table
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        
        try {
          // Check if the column already exists
          const table = await queryRunner.getTable("workflow_categories");
          const maxStepsColumn = table?.findColumnByName("maxSteps");
          
          if (!maxStepsColumn) {
            logger.info("Adding maxSteps column to workflow_categories table");
            
            // Add maxSteps column with default value 3
            await queryRunner.query(`ALTER TABLE "workflow_categories" ADD COLUMN IF NOT EXISTS "maxSteps" integer NOT NULL DEFAULT 3`);
            
            // Update existing categories with specific maxSteps values
            await queryRunner.query(`UPDATE "workflow_categories" SET "maxSteps" = 2 WHERE "name" = 'Short Leave'`);
            await queryRunner.query(`UPDATE "workflow_categories" SET "maxSteps" = 3 WHERE "name" = 'Medium Leave'`);
            await queryRunner.query(`UPDATE "workflow_categories" SET "maxSteps" = 4 WHERE "name" = 'Long Leave'`);
            await queryRunner.query(`UPDATE "workflow_categories" SET "maxSteps" = 5 WHERE "name" = 'Extended Leave'`);
            await queryRunner.query(`UPDATE "workflow_categories" SET "maxSteps" = 6 WHERE "name" = 'Long-Term Leave'`);
            
            logger.info("Successfully added maxSteps column to workflow_categories table");
          } else {
            logger.info("maxSteps column already exists in workflow_categories table");
          }
        } finally {
          // Release the query runner
          await queryRunner.release();
        }
        
        await setupDefaultData();
        logger.info("Default data setup completed");
      } else {
        logger.warn("TypeORM not initialized, skipping TypeORM-specific setup");
        // Use direct database connection for minimal setup
        const client = directDb.createClient();
        await client.connect();
        
        try {
          // Check if workflow_categories table exists
          const tableResult = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'workflow_categories'
            )
          `);
          
          if (tableResult.rows[0].exists) {
            // Check if maxSteps column exists
            const columnResult = await client.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'workflow_categories'
                AND column_name = 'maxSteps'
              )
            `);
            
            if (!columnResult.rows[0].exists) {
              logger.info("Adding maxSteps column to workflow_categories table using direct connection");
              await client.query(`ALTER TABLE "workflow_categories" ADD COLUMN IF NOT EXISTS "maxSteps" integer NOT NULL DEFAULT 3`);
              logger.info("Successfully added maxSteps column to workflow_categories table");
            }
          }
          
          logger.info("Basic setup completed using direct database connection");
        } finally {
          await client.end();
        }
      }
    } catch (error) {
      logger.error("Error setting up default data:", error);
      // Don't throw the error, allow the server to continue running
    }

    // Server is already created and routes are registered above

    // Run migrations if needed with improved error handling
    try {
      // Use our improved migration runner
      logger.info("Checking for pending migrations...");
      const pendingMigrations = await AppDataSource.showMigrations();

      if (pendingMigrations) {
        logger.info("Running pending migrations...");
        try {
          // Import the runMigrations function
          const { runMigrations } = require("./scripts/runMigrations");
          
          // Run migrations with improved error handling
          await runMigrations(false); // Don't close the connection
          
          logger.info("Migrations completed successfully");

          // Add a small delay to ensure database is in a consistent state
          // before proceeding with other operations
          logger.info("Waiting for database to stabilize...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (migrationError) {
          logger.error("Error running migrations:", migrationError);
        }
      } else {
        logger.info("No pending migrations found");
      }
    } catch (error) {
      logger.error("Error in migration process:", error);
    }

    // Check if tables exist before initializing data
    const tablesExist = async (tableNames: string[]): Promise<boolean> => {
      try {
        // First ensure database connection is established
        if (!AppDataSource.isInitialized) {
          logger.warn(
            "Database connection not initialized when checking tables"
          );
          await ensureDatabaseConnection();
        }

        for (const tableName of tableNames) {
          try {
            const result = await AppDataSource.query(
              `
              SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
              )
            `,
              [tableName]
            );

            if (!result[0].exists) {
              logger.warn(`Table ${tableName} does not exist yet`);
              return false;
            }
          } catch (tableError) {
            logger.warn(
              `Error checking if table ${tableName} exists:`,
              tableError
            );
            return false;
          }
        }
        return true;
      } catch (error) {
        logger.error("Error checking if tables exist:", error);
        return false;
      }
    };

    // Initialize system roles
    try {
      if (await tablesExist(["roles"])) {
        await initializeSystemRoles();
        console.log("System roles initialized");
        
        // Update user roleIds based on their role enum values
        await updateUserRoleIds();
        console.log("User roleIds updated");
      } else {
        logger.warn(
          "Roles table not available yet, skipping system roles initialization"
        );
      }
    } catch (error) {
      logger.error("Error initializing system roles:", error);
    }

    // Initialize system pages
    try {
      if (await tablesExist(["pages"])) {
        await initializeSystemPages();
        console.log("System pages initialized");
      } else {
        logger.warn(
          "Pages table not available yet, skipping system pages initialization"
        );
      }
    } catch (error) {
      logger.error("Error initializing system pages:", error);
    }

    // Ensure default users exist (including superadmin, managers, HR, and employees)
    try {
      if (await tablesExist(["users"])) {
        await ensureDefaultUsers();
        console.log("Default users check completed");
      } else {
        logger.warn(
          "Users table not available yet, skipping default users initialization"
        );
      }
    } catch (error) {
      logger.error("Error ensuring default users:", error);
    }

    // Create default leave types
    try {
      if (await tablesExist(["leave_types"])) {
        // Pass false to not close the connection since we're in the server initialization
        await createDefaultLeaveTypes(false);
        console.log("Default leave types check completed");
      } else {
        logger.warn(
          "Leave types table not available yet, skipping default leave types initialization"
        );
      }
    } catch (error) {
      logger.error("Error creating default leave types:", error);
      // Continue with server initialization even if leave type creation fails
    }

    // Create default departments
    try {
      if (await tablesExist(["departments"])) {
        await createDefaultDepartments(false);
        console.log("Default departments check completed");
      } else {
        logger.warn(
          "Departments table not available yet, skipping default departments initialization"
        );
      }
    } catch (error) {
      logger.error("Error creating default departments:", error);
    }

    // Create default positions
    try {
      if (await tablesExist(["positions"])) {
        await createDefaultPositions(false);
        console.log("Default positions check completed");
      } else {
        logger.warn(
          "Positions table not available yet, skipping default positions initialization"
        );
      }
    } catch (error) {
      logger.error("Error creating default positions:", error);
    }

    // Create default roles
    try {
      if (await tablesExist(["roles"])) {
        await createDefaultRoles(false);
        console.log("Default roles check completed");
      } else {
        logger.warn(
          "Roles table not available yet, skipping default roles initialization"
        );
      }
    } catch (error) {
      logger.error("Error creating default roles:", error);
    }

    // Create holidays
    try {
      if (await tablesExist(["holidays"])) {
        // Pass false to not close the connection since we're in the server initialization
        await createHolidays(false);
        console.log("Holidays check completed");
      } else {
        logger.warn(
          "Holidays table not available yet, skipping holidays initialization"
        );
      }
    } catch (error) {
      logger.error("Error creating holidays:", error);
      // Continue with server initialization even if holiday creation fails
    }
    
    // Initialize approval workflows
    try {
      // First check if the migration has been applied
      let workflowMigrationApplied = false;
      try {
        const result = await AppDataSource.query(
          `SELECT * FROM migrations WHERE name LIKE '%UpdateApprovalWorkflowDaysToFloat%'`
        );
        workflowMigrationApplied = result && result.length > 0;
      } catch (migrationError) {
        logger.warn("Error checking migration status:", migrationError);
        // If we can't check migrations, we'll assume it's not applied
      }
      
      if (await tablesExist(["approval_workflows"])) {
        if (workflowMigrationApplied) {
          logger.info("Workflow migration has been applied, initializing workflows...");
          await initializeWorkflows();
          console.log("Approval workflows initialization completed");
        } else {
          logger.warn(
            "Workflow migration not yet applied. Will attempt to run the migration..."
          );
          
          try {
            // Try to run the migration directly
            await AppDataSource.query(`
              -- First, delete any existing workflows to avoid conversion issues
              DELETE FROM "approval_workflows";
              
              -- Alter the column types from integer to float
              ALTER TABLE "approval_workflows" ALTER COLUMN "minDays" TYPE float;
              ALTER TABLE "approval_workflows" ALTER COLUMN "maxDays" TYPE float;
            `);
            
            logger.info("Successfully applied workflow column type changes. Initializing workflows...");
            await initializeWorkflows();
            console.log("Approval workflows initialization completed after manual migration");
          } catch (migrationError) {
            logger.error("Failed to manually apply workflow column changes:", migrationError);
            logger.warn("Skipping workflow initialization until migration is properly applied");
          }
        }
      } else {
        logger.warn(
          "Approval workflows table not available yet, skipping workflows initialization"
        );
      }
    } catch (error) {
      logger.error("Error initializing approval workflows:", error);
      // Continue with server initialization even if workflow initialization fails
    }

    // Create a test user for login
    try {
      await createTestUser();
      console.log("Test user creation completed");
    } catch (error) {
      logger.error("Error creating test user:", error);
    }

    // Set up database connection health check
    const dbHealthCheck = setInterval(async () => {
      try {
        if (!AppDataSource.isInitialized) {
          logger.warn("Database connection lost, attempting to reconnect...");
          await ensureDatabaseConnection();
        } else {
          // Test the connection with a simple query
          try {
            await AppDataSource.query("SELECT 1");
          } catch (error) {
            logger.warn("Database connection test failed, reconnecting...");
            await ensureDatabaseConnection();
          }
        }
      } catch (error) {
        logger.error("Database health check failed:", error);
      }
    }, 30000); // Check every 30 seconds

    // Server is already started above
    
    // Run comprehensive system initialization
    try {
      await initializeSystem();
      logger.info("System initialization completed successfully");
    } catch (initError) {
      logger.error("Error during system initialization:", initError);
    }

    // Handle unhandled rejections
    process.on("unhandledRejection", (err) => {
      logger.error("Unhandled rejection:", err);
      clearInterval(dbHealthCheck);
      process.exit(1);
    });

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Shutting down server...");
      await server.stop();
      clearInterval(dbHealthCheck);
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      process.exit(0);
    });

    return server;
  } catch (error) {
    logger.error("Error starting server:", error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  init();
}

export default init;

// Export role management and synchronization functions for easy access
export { showRoles, createCustomRole, syncEssentialData, checkEssentialData };
