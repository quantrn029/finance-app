const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');

// Path to backup script
const backupScript = path.join(__dirname, 'backup-db.js');

// Schedule: every day at 02:00 AM local time
cron.schedule('0 2 * * *', () => {
    console.log('🕑 Running scheduled backup...');
    exec(`node ${backupScript}`, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Scheduled backup failed:', error.message);
            return;
        }
        if (stderr) {
            console.error('⚠️ Backup stderr:', stderr);
        }
        console.log('✅ Scheduled backup completed');
        console.log(stdout);
    });
});

console.log('⏰ Backup scheduler started – will run daily at 02:00 AM');
