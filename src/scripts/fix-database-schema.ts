import { AppDataSource } from "../config/database";
import logger from "../utils/logger";

/**
 * Script to fix database schema issues
 * - Checks and corrects column case sensitivity issues
 * - Ensures all required tables and columns exist
 */
async function fixDatabaseSchema() {
  try {
    // Initialize the database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info("Database connection initialized");
    }

    // 1. Check if workflow_categories table exists
    const workflowCategoriesExists = await checkTableExists("workflow_categories");
    if (!workflowCategoriesExists) {
      logger.info("Creating workflow_categories table");
      await createWorkflowCategoriesTable();
    } else {
      logger.info("workflow_categories table already exists");
      
      // Check if maxSteps column exists
      const maxStepsExists = await checkColumnExists("workflow_categories", "maxSteps");
      if (!maxStepsExists) {
        logger.info("Adding maxSteps column to workflow_categories table");
        await AppDataSource.query(`
          ALTER TABLE "workflow_categories" ADD "maxSteps" integer NOT NULL DEFAULT 3
        `);
      } else {
        logger.info("maxSteps column already exists in workflow_categories table");
      }
    }

    // 2. Fix column case sensitivity issues in users table
    await fixColumnCaseSensitivity("users", "roleId", "roleid");
    await fixColumnCaseSensitivity("users", "departmentId", "departmentid");
    await fixColumnCaseSensitivity("users", "positionId", "positionid");

    logger.info("Database schema fixes completed successfully");
  } catch (error) {
    logger.error("Error fixing database schema:", error);
  } finally {
    // Close the database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info("Database connection closed");
    }
  }
}

/**
 * Check if a table exists in the database
 */
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await AppDataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName]);
    
    return result[0].exists;
  } catch (error) {
    logger.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * Check if a column exists in a table
 */
async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await AppDataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
      )
    `, [tableName, columnName]);
    
    return result[0].exists;
  } catch (error) {
    logger.error(`Error checking if column ${columnName} exists in table ${tableName}:`, error);
    return false;
  }
}

/**
 * Create the workflow_categories table
 */
async function createWorkflowCategoriesTable(): Promise<void> {
  try {
    await AppDataSource.query(`
      CREATE TABLE "workflow_categories" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "name" VARCHAR NOT NULL,
        "description" VARCHAR,
        "minDays" FLOAT NOT NULL DEFAULT 1,
        "maxDays" FLOAT NOT NULL DEFAULT 30,
        "maxSteps" integer NOT NULL DEFAULT 3,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workflow_categories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_workflow_categories_name" UNIQUE ("name")
      )
    `);
    
    // Create indexes
    await AppDataSource.query(`
      CREATE INDEX "IDX_workflow_categories_active" ON "workflow_categories" ("isActive")
    `);
    await AppDataSource.query(`
      CREATE INDEX "IDX_workflow_categories_days" ON "workflow_categories" ("minDays", "maxDays")
    `);
    
    // Insert default categories
    await AppDataSource.query(`
      INSERT INTO "workflow_categories" ("name", "description", "minDays", "maxDays", "maxSteps") VALUES
      ('Short Leave', 'Leave requests up to 2 days', 0.5, 2, 2),
      ('Medium Leave', 'Leave requests between 3 and 5 days', 3, 5, 3),
      ('Long Leave', 'Leave requests between 6 and 14 days', 6, 14, 4),
      ('Extended Leave', 'Leave requests between 15 and 30 days', 15, 30, 5),
      ('Long-Term Leave', 'Leave requests over 30 days', 31, 90, 6)
    `);
  } catch (error) {
    logger.error("Error creating workflow_categories table:", error);
    throw error;
  }
}

/**
 * Fix column case sensitivity issues
 */
async function fixColumnCaseSensitivity(
  tableName: string, 
  correctColumnName: string, 
  incorrectColumnName: string
): Promise<void> {
  try {
    // Check if the correct column exists
    const correctColumnExists = await checkColumnExists(tableName, correctColumnName);
    
    // Check if the incorrect column exists
    const incorrectColumnExists = await checkColumnExists(tableName, incorrectColumnName);
    
    if (correctColumnExists && !incorrectColumnExists) {
      logger.info(`Column ${correctColumnName} exists with correct case in table ${tableName}`);
      return;
    }
    
    if (!correctColumnExists && incorrectColumnExists) {
      logger.info(`Renaming column ${incorrectColumnName} to ${correctColumnName} in table ${tableName}`);
      await AppDataSource.query(`
        ALTER TABLE "${tableName}" RENAME COLUMN "${incorrectColumnName}" TO "${correctColumnName}"
      `);
      return;
    }
    
    if (correctColumnExists && incorrectColumnExists) {
      logger.warn(`Both ${correctColumnName} and ${incorrectColumnName} exist in table ${tableName}. This is unusual.`);
      // This is a complex situation that might require manual intervention
      return;
    }
    
    logger.info(`Neither ${correctColumnName} nor ${incorrectColumnName} exist in table ${tableName}`);
  } catch (error) {
    logger.error(`Error fixing column case sensitivity for ${correctColumnName} in table ${tableName}:`, error);
  }
}

// Run the script
fixDatabaseSchema()
  .then(() => {
    console.log("Database schema fix script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error running database schema fix script:", error);
    process.exit(1);
  });