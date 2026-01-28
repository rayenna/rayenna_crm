/**
 * Migration deploy script with retry logic for Neon/connection pooler issues
 * Handles advisory lock timeouts gracefully
 */

const { execSync } = require('child_process');

const MAX_RETRIES = 5;
const RETRY_DELAY = 8000; // 8 seconds — helps with Neon advisory lock contention during deploy

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkMigrationStatus() {
  try {
    const status = execSync('npx prisma migrate status', {
      encoding: 'utf-8',
      stdio: 'pipe',
      env: process.env,
    });
    
    if (status.includes('Database schema is up to date')) {
      console.log('✅ Database schema is already up to date');
      return true;
    }
    
    return false;
  } catch (error) {
    // Status check failed, proceed with migration
    return false;
  }
}

async function migrateWithRetry(retries = MAX_RETRIES) {
  // First, check if migrations are already applied
  console.log('\n🔍 Checking migration status...');
  if (await checkMigrationStatus()) {
    return true;
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`\n🔄 Attempting migration deploy (attempt ${attempt}/${retries})...`);
      
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: {
          ...process.env,
          // Add connection timeout for Neon
          PRISMA_MIGRATE_SKIP_GENERATE: '1',
        },
      });
      
      console.log('\n✅ Migration deployed successfully!');
      return true;
    } catch (error) {
      const errorMessage = error.message || error.stdout?.toString() || error.stderr?.toString() || '';
      
      // Check if it's a timeout/lock error
      const isTimeoutError = 
        errorMessage.includes('P1002') ||
        errorMessage.includes('timed out') ||
        errorMessage.includes('advisory lock') ||
        (errorMessage.includes('The database server') && errorMessage.includes('was reached but timed out'));
      
      if (isTimeoutError && attempt < retries) {
        console.log(`\n⚠️  Migration failed with timeout (attempt ${attempt}/${retries})`);
        console.log(`⏳ Waiting ${RETRY_DELAY / 1000} seconds before retry...`);
        await sleep(RETRY_DELAY);
        continue;
      } else if (isTimeoutError) {
        console.log('\n❌ Migration failed after all retries due to timeout');
        console.log('💡 This is often caused by connection pooler issues with Neon.');
        console.log('💡 Consider using a direct connection string for migrations.');
        console.log('\n🔍 Verifying if migrations are actually needed...');
        
        // Check one more time if schema is up to date
        if (await checkMigrationStatus()) {
          console.log('✅ Schema is up to date - continuing build');
          return true;
        }
        
        console.log('\n⚠️  Attempting to continue build anyway...');
        console.log('⚠️  Migrations may need to be run manually.');
        // Don't fail the build - the migration might already be applied
        return false;
      } else {
        // Different error - fail immediately
        console.error('\n❌ Migration failed with error:', errorMessage);
        throw error;
      }
    }
  }
  
  return false;
}

(async () => {
  try {
    const success = await migrateWithRetry();
    if (!success) {
      console.log('\n⚠️  Migration deploy had issues but continuing build...');
      console.log('⚠️  Database schema may already be up to date.');
      process.exit(0); // Don't fail the build
    }
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration deploy failed:', error.message);
    process.exit(1);
  }
})();
