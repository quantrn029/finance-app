/**
 * Database Restore Script
 * Restore database from a backup file
 * Usage: node scripts/restore-db.js [backup-filename]
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DB_PATH = path.join(__dirname, '../prisma/dev.db');
const BACKUP_DIR = path.join(__dirname, '../backups');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Get backup file from argument or list available backups
const backupFile = process.argv[2];

if (!fs.existsSync(BACKUP_DIR)) {
    console.log('❌ No backups directory found!');
    process.exit(1);
}

const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('dev-backup-') && f.endsWith('.db'))
    .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime,
        size: (fs.statSync(path.join(BACKUP_DIR, f)).size / 1024).toFixed(2)
    }))
    .sort((a, b) => b.time.getTime() - a.time.getTime());

if (backups.length === 0) {
    console.log('⚠️  No backups found in', BACKUP_DIR);
    process.exit(1);
}

console.log('\n📦 Available backups:\n');
backups.forEach((backup, i) => {
    console.log(`${i + 1}. ${backup.name}`);
    console.log(`   Date: ${backup.time.toLocaleString('vi-VN')}`);
    console.log(`   Size: ${backup.size} KB\n`);
});

let backupToRestore;

if (backupFile) {
    backupToRestore = path.join(BACKUP_DIR, backupFile);
    if (!fs.existsSync(backupToRestore)) {
        console.log('❌ Backup file not found:', backupFile);
        process.exit(1);
    }
    performRestore(backupToRestore);
} else {
    rl.question('Enter backup number to restore (or 0 to cancel): ', (answer) => {
        const index = parseInt(answer) - 1;

        if (answer === '0' || isNaN(index) || index < 0 || index >= backups.length) {
            console.log('❌ Restore cancelled');
            rl.close();
            process.exit(0);
        }

        backupToRestore = backups[index].path;
        performRestore(backupToRestore);
        rl.close();
    });
}

function performRestore(backupPath) {
    // Backup current database before restore
    if (fs.existsSync(DB_PATH)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const currentBackup = path.join(BACKUP_DIR, `pre-restore-${timestamp}.db`);
        fs.copyFileSync(DB_PATH, currentBackup);
        console.log('✅ Current database backed up to:', currentBackup);
    }

    // Restore
    try {
        fs.copyFileSync(backupPath, DB_PATH);
        console.log('✅ Database restored successfully!');
        console.log(`   From: ${backupPath}`);
        console.log(`   To: ${DB_PATH}`);
        console.log('\n⚠️  Remember to run: npx prisma generate');
    } catch (error) {
        console.error('❌ Restore failed:', error.message);
        process.exit(1);
    }
}
