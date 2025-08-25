/**
 * Database initialization script
 * Creates the SQLite database and tables for NLPDS backend
 */

import { DatabaseManager } from '../api/database/DatabaseManager.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
  try {
    console.log('🗄️  Initializing NLPDS database...');

    // Ensure database directory exists
    const dbDir = path.join(__dirname, '../database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log('📁 Created database directory');
    }

    // Initialize database manager (this will create tables)
    const db = await new DatabaseManager().initialize();
    
    console.log('✅ Database initialized successfully');
    console.log('📊 Tables created:');
    console.log('  - users');
    console.log('  - user_progress');
    console.log('  - learning_sessions');
    console.log('  - leaderboard_cache');
    
    // Optional: Create a test user for development
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n🧪 Creating test user for development...');
      
      try {
        const bcrypt = await import('bcryptjs');
        const testUserId = await db.createUser({
          username: 'testuser',
          email: 'test@example.com',
          passwordHash: await bcrypt.default.hash('password123', 12),
          displayName: 'Test User'
        });
        
        console.log(`✅ Test user created with ID: ${testUserId}`);
        console.log('   Username: testuser');
        console.log('   Password: password123');
      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          console.log('ℹ️  Test user already exists');
        } else {
          console.error('❌ Error creating test user:', error.message);
        }
      }
    }

    console.log('\n🎉 Database initialization complete!');

    // Close database connection
    await db.close();

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase();
}

export { initializeDatabase };
