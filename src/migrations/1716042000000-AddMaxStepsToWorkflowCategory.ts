import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMaxStepsToWorkflowCategory1716042000000 implements MigrationInterface {
    name = 'AddMaxStepsToWorkflowCategory1716042000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        try {
            // Check if the table exists
            const tableExists = await queryRunner.hasTable("workflow_categories");
            if (!tableExists) {
                console.log("Table workflow_categories does not exist, skipping migration");
                return;
            }
            
            // Check if the column already exists
            const table = await queryRunner.getTable("workflow_categories");
            const columnExists = table?.findColumnByName("maxSteps");
            
            if (!columnExists) {
                // Add maxSteps column with default value 3
                await queryRunner.query(`ALTER TABLE "workflow_categories" ADD "maxSteps" integer NOT NULL DEFAULT 3`);
                
                // Update existing categories with specific maxSteps values
                await queryRunner.query(`UPDATE "workflow_categories" SET "maxSteps" = 2 WHERE "name" = 'Short Leave'`);
                await queryRunner.query(`UPDATE "workflow_categories" SET "maxSteps" = 3 WHERE "name" = 'Medium Leave'`);
                await queryRunner.query(`UPDATE "workflow_categories" SET "maxSteps" = 4 WHERE "name" = 'Long Leave'`);
                await queryRunner.query(`UPDATE "workflow_categories" SET "maxSteps" = 5 WHERE "name" = 'Extended Leave'`);
                await queryRunner.query(`UPDATE "workflow_categories" SET "maxSteps" = 6 WHERE "name" = 'Long-Term Leave'`);
            } else {
                console.log("Column maxSteps already exists in workflow_categories table, skipping");
            }
        } catch (error) {
            console.error("Error in AddMaxStepsToWorkflowCategory migration:", error);
            throw error;
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the maxSteps column
        await queryRunner.query(`ALTER TABLE "workflow_categories" DROP COLUMN "maxSteps"`);
    }
}