// Database initialization script for Railway
// This script will run on startup to ensure the database is properly set up

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function initializeRailwayDatabase() {
  console.log('Starting Railway database initialization...');
  
  // Get database connection parameters
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set! Cannot initialize database.');
    return false;
  }
  
  console.log('DATABASE_URL is set. First 15 chars:', dbUrl.substring(0, 15) + '...');
  
  // Create client
  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Connect to database
    await client.connect();
    console.log('Connected to database successfully');
    
    // Check if workflow_categories table exists
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'workflow_categories'
      )
    `);
    
    const workflowCategoriesExists = tableCheckResult.rows[0].exists;
    console.log(`workflow_categories table exists: ${workflowCategoriesExists}`);
    
    // Create workflow_categories table if it doesn't exist
    if (!workflowCategoriesExists) {
      console.log('Creating workflow_categories table...');
      
      // First, ensure uuid-ossp extension is available
      await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
      
      // Create the table
      await client.query(`
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
      await client.query(`
        CREATE INDEX "IDX_workflow_categories_active" ON "workflow_categories" ("isActive")
      `);
      await client.query(`
        CREATE INDEX "IDX_workflow_categories_days" ON "workflow_categories" ("minDays", "maxDays")
      `);
      
      // Insert default categories
      await client.query(`
        INSERT INTO "workflow_categories" ("name", "description", "minDays", "maxDays", "maxSteps") VALUES
        ('Short Leave', 'Leave requests up to 2 days', 0.5, 2, 2),
        ('Medium Leave', 'Leave requests between 3 and 5 days', 3, 5, 3),
        ('Long Leave', 'Leave requests between 6 and 14 days', 6, 14, 4),
        ('Extended Leave', 'Leave requests between 15 and 30 days', 15, 30, 5),
        ('Long-Term Leave', 'Leave requests over 30 days', 31, 90, 6)
      `);
      
      console.log('workflow_categories table created and populated successfully');
    } else {
      // Check if maxSteps column exists
      const columnCheckResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'workflow_categories' 
          AND column_name = 'maxSteps'
        )
      `);
      
      const maxStepsExists = columnCheckResult.rows[0].exists;
      console.log(`maxSteps column exists: ${maxStepsExists}`);
      
      // Add maxSteps column if it doesn't exist
      if (!maxStepsExists) {
        console.log('Adding maxSteps column to workflow_categories table...');
        
        await client.query(`
          ALTER TABLE "workflow_categories" ADD "maxSteps" integer NOT NULL DEFAULT 3
        `);
        
        // Update existing categories with specific maxSteps values
        await client.query(`UPDATE "workflow_categories" SET "maxSteps" = 2 WHERE "name" = 'Short Leave'`);
        await client.query(`UPDATE "workflow_categories" SET "maxSteps" = 3 WHERE "name" = 'Medium Leave'`);
        await client.query(`UPDATE "workflow_categories" SET "maxSteps" = 4 WHERE "name" = 'Long Leave'`);
        await client.query(`UPDATE "workflow_categories" SET "maxSteps" = 5 WHERE "name" = 'Extended Leave'`);
        await client.query(`UPDATE "workflow_categories" SET "maxSteps" = 6 WHERE "name" = 'Long-Term Leave'`);
        
        console.log('maxSteps column added successfully');
      }
    }
    
    // Fix column case sensitivity issues in users table
    console.log('Checking for column case sensitivity issues in users table...');
    
    // Check if users table exists
    const usersTableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);
    
    const usersTableExists = usersTableCheckResult.rows[0].exists;
    
    if (usersTableExists) {
      // Get all columns from users table
      const columnsResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      `);
      
      const columns = columnsResult.rows.map(row => row.column_name);
      console.log('Users table columns:', columns.join(', '));
      
      // Check for roleId column
      const hasRoleId = columns.includes('roleId');
      const hasRoleid = columns.includes('roleid');
      
      if (!hasRoleId && hasRoleid) {
        console.log('Fixing roleId column case...');
        await client.query(`ALTER TABLE "users" RENAME COLUMN "roleid" TO "roleId"`);
      }
      
      // Check for departmentId column
      const hasDepartmentId = columns.includes('departmentId');
      const hasDepartmentid = columns.includes('departmentid');
      
      if (!hasDepartmentId && hasDepartmentid) {
        console.log('Fixing departmentId column case...');
        await client.query(`ALTER TABLE "users" RENAME COLUMN "departmentid" TO "departmentId"`);
      }
      
      // Check for positionId column
      const hasPositionId = columns.includes('positionId');
      const hasPositionid = columns.includes('positionid');
      
      if (!hasPositionId && hasPositionid) {
        console.log('Fixing positionId column case...');
        await client.query(`ALTER TABLE "users" RENAME COLUMN "positionid" TO "positionId"`);
      }
    }
    
    console.log('Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error.message);
    console.error('Error details:', error);
    return false;
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the initialization
initializeRailwayDatabase()
  .then(success => {
    if (success) {
      console.log('✅ Railway database initialization successful');
    } else {
      console.error('❌ Railway database initialization failed');
    }
  })
  .catch(err => {
    console.error('Unhandled error in database initialization:', err);
  });