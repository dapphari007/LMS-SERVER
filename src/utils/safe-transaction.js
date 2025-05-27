// Utility for safely running database transactions
const { AppDataSource } = require("../config/database");

/**
 * Safely runs a database operation with transaction handling
 * @param {Function} operation - The operation to run
 * @returns {Promise<any>} - The result of the operation
 */
async function safeTransaction(operation) {
  const queryRunner = AppDataSource.createQueryRunner();
  
  try {
    await queryRunner.connect();
    
    // Only start a transaction if the database is properly initialized
    let transactionStarted = false;
    
    if (AppDataSource.isInitialized) {
      try {
        await queryRunner.startTransaction();
        transactionStarted = true;
      } catch (transactionError) {
        console.warn("Failed to start transaction:", transactionError.message);
      }
    }
    
    // Run the operation
    const result = await operation(queryRunner);
    
    // Commit the transaction if it was started
    if (transactionStarted) {
      try {
        await queryRunner.commitTransaction();
      } catch (commitError) {
        console.warn("Failed to commit transaction:", commitError.message);
        // Try to rollback
        try {
          await queryRunner.rollbackTransaction();
        } catch (rollbackError) {
          console.error("Failed to rollback transaction:", rollbackError.message);
        }
      }
    }
    
    return result;
  } catch (error) {
    // Only try to rollback if the transaction is active
    if (queryRunner.isTransactionActive) {
      try {
        await queryRunner.rollbackTransaction();
      } catch (rollbackError) {
        console.error("Failed to rollback transaction:", rollbackError.message);
      }
    }
    throw error;
  } finally {
    // Always release the query runner
    await queryRunner.release();
  }
}

module.exports = { safeTransaction };