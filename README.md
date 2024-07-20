# strapi-db-sqlite-cloud-backup
Script for scheduled backup to Yandex Drive or Google Drive of a temporary copy of the Strapi SQLite database.

When you run the `npm run backup` command, it initiates the execution of the `backup.js` script. The logic that this script follows includes several key steps:

1. **Initialization of configurations and logger:**
   - Environment variables are loaded from the `.env` file.
   - A logger is set up using the `winston` library.

2. **Defining paths:**
   - Paths to the database, backup directory, and log files are determined.

3. **Creating a database backup:**
   - The database file is copied to the backup directory.
   - A log message is recorded about the creation of the backup.

4. **Uploading the backup to cloud storage (Google Drive and Yandex Disk):**
   - If the environment variables `GOOGLE_DRIVE_ENABLED` and `YANDEX_DISK_ENABLED` are set to `true`, the backup is uploaded to the respective cloud storage services.
   - Log messages about the process and the result of the upload are recorded.

5. **Managing the number of backups:**
   - The number of backups in the backup directory is checked.
   - If the number of backups exceeds the set limit (`MAX_BACKUPS`), the oldest backups are deleted.
   - Log messages about the process and result of deleting old backups are recorded.

6. **Starting the script via the pm2 process manager:**

The script is started through the pm2 process manager, which ensures that it runs at the scheduled intervals and restarts in case of failures.
