# strapi-db-sqlite-cloud-backup

Script for scheduled backup to Yandex Drive or Google Drive of a temporary copy of the Strapi SQLite database.

## Installation

To use this package, you need to install it in your project:

```sh
npm install strapi-db-sqlite-cloud-backup
```

## Initialization

First, you need to initialize the backup configuration by creating a .env file with the necessary environment variables.
You can do this using the init command provided by the package:

```sh
npx strapi-db-sqlite-cloud-backup init
```

This will create a `.env` file in the root of your project. Fill in the required values:

```dotenv
GOOGLE_DRIVE_FOLDER_ID=your-google-drive-folder-id
GOOGLE_CREDENTIALS_PATH=./path/to/google-credentials.json
GOOGLE_DRIVE_ENABLED=false

YANDEX_TOKEN=your-yandex-o-auth-token
YANDEX_DISK_ENABLED=true
YANDEX_BACKUP_PATH=/backups

DB_PATH=../backend/.tmp
DB_NAME=data.db
```
## Usage
To run the backup script manually, use the `run` command:

```sh
npx strapi-db-sqlite-cloud-backup run
```
This command will perform a one-time backup of the database according to the steps outlined below.

## Workflow

The logic that this script follows includes several key steps:

1. Initialization of configurations and logger:

   - Environment variables are loaded from the .env file.
   - A logger is set up using the winston library.

2. Defining paths:

   - Paths to the database, backup directory, and log files are determined.

3. Creating a database backup:

   - The database file is copied to the backup directory.
   - A log message is recorded about the creation of the backup.
 
4. Uploading the backup to cloud storage (Google Drive and Yandex Disk):

   - If the environment variables `GOOGLE_DRIVE_ENABLED` and `YANDEX_DISK_ENABLED` are set to true, the backup is uploaded to the respective cloud storage services.
   - Log messages about the process and the result of the upload is recorded.

5. Managing the number of backups:

   - The number of backups in the backup directory is checked.
   - If the number of backups exceeds the set limit (`MAX_BACKUPS`), the oldest backups are deleted.
   - Log messages about the process and result of deleting old backups are recorded.

6. Starting the script via the `pm2` process manager:

7. To start the script at scheduled intervals and ensure it restarts in case of failures, you can use the `pm2` process manager. Create an `ecosystem.config.js` file in your project root with the following content:

```js
module.exports = {
  apps: [
    {
      name: 'backup',
      script: 'node_modules/strapi-db-sqlite-cloud-backup/backup.js',
      cron_restart: '0 */3 * * *', // Run every 3 hours
      watch: false,
      env: {
        NODE_ENV: 'production',
        // Environment variables for the script
        GOOGLE_DRIVE_ENABLED: process.env.GOOGLE_DRIVE_ENABLED,
        YANDEX_DISK_ENABLED: process.env.YANDEX_DISK_ENABLED,
        GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID,
        GOOGLE_CREDENTIALS_PATH: process.env.GOOGLE_CREDENTIALS_PATH,
        YANDEX_TOKEN: process.env.YANDEX_TOKEN,
        YANDEX_BACKUP_PATH: process.env.YANDEX_BACKUP_PATH,
        DB_PATH: process.env.DB_PATH,
        DB_NAME: process.env.DB_NAME
      }
    }
  ]
};
```

Then start the script using `pm2`:

```sh
pm2 start ecosystem.config.js
```

By following these steps,
you can set up scheduled backups of your Strapi SQLite database to either Google Drive or Yandex Disk.
