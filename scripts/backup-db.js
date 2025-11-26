/**
 * Database Backup Script
 * Automatically backs up SQLite database with timestamp
 * Run before migrations to preserve data
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../prisma/dev.db');
const BACKUP_DIR = path.join(__dirname, '../backups');

// Create backups directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('✅ Created backups directory');
}

// Generate timestamp for backup file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupPath = path.join(BACKUP_DIR, `dev-backup-${timestamp}.db`);

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
    console.log('⚠️  No database found at', DB_PATH);
    console.log('Skipping backup (fresh installation)');
    process.exit(0);
}

// Copy database file
try {
    fs.copyFileSync(DB_PATH, backupPath);

    const stats = fs.statSync(backupPath);
    const fileSizeInKB = (stats.size / 1024).toFixed(2);

    console.log('✅ Database backed up successfully!');
    console.log(`   Source: ${DB_PATH}`);
    console.log(`   Backup: ${backupPath}`);
    console.log(`   Size: ${fileSizeInKB} KB`);

    // Clean up old backups (keep last 10)
    const backups = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('dev-backup-') && f.endsWith('.db'))
        .map(f => ({
            name: f,
            path: path.join(BACKUP_DIR, f),
            time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

    if (backups.length > 10) {
        const toDelete = backups.slice(10);
        toDelete.forEach(backup => {
            fs.unlinkSync(backup.path);
            console.log(`🗑️  Deleted old backup: ${backup.name}`);
        });
    }

    console.log(`📦 Total backups: ${Math.min(backups.length, 10)}`);

} catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
}
