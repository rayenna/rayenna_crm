import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function runMigration() {
  try {
    const migrationFile = path.join(__dirname, '20260112183614_add_customer_master', 'migration.sql');
    const sql = fs.readFileSync(migrationFile, 'utf-8');
    
    console.log('Running migration SQL...');
    
    // Split SQL into statements, handling DO blocks
    const statements: string[] = [];
    let currentStatement = '';
    let inDoBlock = false;
    let dollarQuoteLevel = 0;
    
    const lines = sql.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments
      if (trimmed.startsWith('--')) {
        continue;
      }
      
      currentStatement += line + '\n';
      
      // Track DO blocks (they use $$ delimiters)
      const dollarQuotes = (line.match(/\$\$/g) || []).length;
      if (dollarQuotes > 0) {
        dollarQuoteLevel += dollarQuotes;
        if (dollarQuoteLevel % 2 === 0) {
          inDoBlock = false;
        } else {
          inDoBlock = true;
        }
      }
      
      // If we hit a semicolon and we're not in a DO block, it's the end of a statement
      if (line.includes(';') && !inDoBlock) {
        const stmt = currentStatement.trim();
        if (stmt && !stmt.startsWith('--')) {
          statements.push(stmt);
        }
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    console.log(`Found ${statements.length} statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.startsWith('--')) continue;
      
      try {
        await prisma.$executeRawUnsafe(statement);
        console.log(`✓ [${i + 1}/${statements.length}] Executed statement`);
      } catch (error: any) {
        // Check if it's a "already exists" or "does not exist" error which might be okay
        if (error.message && (
          error.message.includes('already exists') ||
          error.message.includes('duplicate key') ||
          error.message.includes('does not exist') ||
          error.message.includes('column') && error.message.includes('does not exist')
        )) {
          console.log(`⚠ [${i + 1}/${statements.length}] Statement may have already been executed:`, error.message.substring(0, 100));
        } else {
          console.error(`✗ [${i + 1}/${statements.length}] Error:`, error.message);
          console.error('Statement preview:', statement.substring(0, 200));
          throw error;
        }
      }
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
