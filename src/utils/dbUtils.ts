import { AppDataSource } from "../config/database";
import logger from "./logger";

/**
 * Utility function to check if a column exists in a table
 * This helps with case-sensitive column names in PostgreSQL
 */
export const getColumnName = async (tableName: string, columnNameToCheck: string): Promise<string | null> => {
  try {
    // Query the information_schema to get the actual column name with correct case
    const result = await AppDataSource.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 
      AND lower(column_name) = lower($2)
    `, [tableName, columnNameToCheck]);
    
    if (result && result.length > 0) {
      return result[0].column_name;
    }
    
    return null;
  } catch (error) {
    logger.error(`Error checking column name ${columnNameToCheck} in table ${tableName}:`, error);
    return null;
  }
};

/**
 * Utility function to safely query a column with case-insensitive matching
 */
export const safeColumnQuery = async (
  tableName: string, 
  columnName: string, 
  limit: number = 1
): Promise<any[]> => {
  try {
    // First get the actual column name with correct case
    const actualColumnName = await getColumnName(tableName, columnName);
    
    if (!actualColumnName) {
      logger.warn(`Column ${columnName} not found in table ${tableName}`);
      return [];
    }
    
    // Use the correct column name in the query
    const result = await AppDataSource.query(`
      SELECT "${actualColumnName}" FROM "${tableName}" LIMIT $1
    `, [limit]);
    
    return result;
  } catch (error) {
    logger.error(`Error in safe column query for ${columnName} in ${tableName}:`, error);
    return [];
  }
};