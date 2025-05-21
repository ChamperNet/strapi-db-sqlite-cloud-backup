/*
 * Copyright (C) 2024
 * Iskakov Timur
 * Champer.ru
 */
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import axios from 'axios';
import winston from 'winston';
import { config } from 'dotenv';

// Load environment variables from the .env file
config();

// Get the current working directory
const cwd = process.cwd();

// Path for temporary storage of the backup copy
const backupDir = path.resolve(cwd, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}
const backupPath = path.resolve(backupDir, `backup-${Date.now()}.db`);

// Paths to log files
const errorLogPath = path.resolve(backupDir, 'errors.log');
const outputLogPath = path.resolve(backupDir, 'output.log');

// Setting up a log format (similar to Laravel)
const logFormat = winston.format.printf(
  ({ timestamp, level, message, ...metadata }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}] ${message}`;
    if (Object.keys(metadata).length) {
      logMessage += ` ${JSON.stringify(metadata)}`;
    }
    return logMessage;
  });

// Logger initialization
const logger = winston.createLogger({
  level: 'debug', // Set to 'debug' to see all messages
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat,
  ),
  transports: [
    new winston.transports.File({ filename: errorLogPath, level: 'error' }),
    new winston.transports.File({ filename: outputLogPath, level: 'debug' }), // Set to 'debug' to see all messages
  ],
});

logger.info('Starting backup process...');

// Maximum number of backups
const MAX_BACKUPS = 24;

// Function to create a database backup
export function backupDatabase() {
  logger.info('Backup database function started.');

  // Проверка наличия переменных окружения
  logger.debug(`DB_PATH: ${process.env.DB_PATH}`);
  logger.debug(`DB_NAME: ${process.env.DB_NAME}`);
  if (!process.env.DB_PATH || !process.env.DB_NAME) {
    logger.error('DB_PATH and DB_NAME must be defined in .env file');
    throw new Error('DB_PATH and DB_NAME must be defined in .env file');
  }

  // Database path
  const dbPath = path.resolve(cwd, process.env.DB_PATH, process.env.DB_NAME);
  logger.info(`Database path: ${dbPath}`);

  fs.copyFile(dbPath, backupPath, (err) => {
    if (err) {
      logger.error(`Error when creating a database backup: ${err}`);
      return;
    }

    logger.info(`The database backup was created: ${backupPath}`);

    // Upload to cloud storage
    if (process.env.GOOGLE_DRIVE_ENABLED === 'true') {
      logger.info('Uploading to Google Drive...');
      uploadToGoogleDrive();
    }

    if (process.env.YANDEX_DISK_ENABLED === 'true') {
      logger.info('Uploading to Yandex Disk...');
      uploadToYandexDisk();
    }

    // Checking the number of backups
    manageBackups();
  });
}

// Function for uploading a file to Google Drive
function uploadToGoogleDrive() {
  const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const GOOGLE_CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH;

  logger.debug(`GOOGLE_DRIVE_FOLDER_ID: ${GOOGLE_DRIVE_FOLDER_ID}`);
  logger.debug(`GOOGLE_CREDENTIALS_PATH: ${GOOGLE_CREDENTIALS_PATH}`);

  if (!GOOGLE_DRIVE_FOLDER_ID || !GOOGLE_CREDENTIALS_PATH) {
    logger.error(
      'Google Drive folder ID and credentials path must be defined in .env file');
    return;
  }

  const GOOGLE_CREDENTIALS = JSON.parse(
    fs.readFileSync(path.resolve(cwd, GOOGLE_CREDENTIALS_PATH)));

  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: path.basename(backupPath),
    parents: [GOOGLE_DRIVE_FOLDER_ID],
  };

  const media = {
    mimeType: 'application/x-sqlite3',
    body: fs.createReadStream(backupPath),
  };

  drive.files.create(
    {
      resource: fileMetadata,
      media,
      fields: 'id',
    },
    (err, file) => {
      if (err) {
        logger.error(`Error when uploading file to Google Drive: ${err}`);
      } else {
        logger.info(`File uploaded to Google Drive with ID: ${file.data.id}`);
      }
    },
  );
}

// Function for uploading a file to Yandex Disk
async function uploadToYandexDisk() {
  const YANDEX_TOKEN = process.env.YANDEX_TOKEN;
  const fileName = path.basename(backupPath);

  // Path to file on the cloud
  const cloudPath = process.env.YANDEX_BACKUP_PATH;

  logger.debug(`YANDEX_BACKUP_PATH: ${cloudPath}`);

  if (!YANDEX_TOKEN || !cloudPath) {
    logger.error(
      'Yandex Disk token and backup path must be defined in .env file');
    return;
  }

  try {

    // Getting all the existing backups in the directory
    const listResponse = await axios.get(
      'https://cloud-api.yandex.net/v1/disk/resources', {
        params: { path: cloudPath },
        headers: { Authorization: `OAuth ${YANDEX_TOKEN}` },
      });

    const allBackups = listResponse.data._embedded?.items?.filter(item =>
      item.name.startsWith('backup-') && item.name.endsWith('.db'),
    ) || [];

    logger.info(`Found ${allBackups.length} backups on Yandex Disk`);

    // Deleting all the old backups files in this folder
    if (allBackups.length >= MAX_BACKUPS) {
      const sorted = allBackups.sort((a, b) => new Date(a.created) - new Date(b.created))
      const toDelete = sorted.slice(0, allBackups.length - MAX_BACKUPS + 1) // +1 for the new one

      for (const file of toDelete) {
        try {
          await axios.delete('https://cloud-api.yandex.net/v1/disk/resources', {
            params: { path: `${cloudPath}/${file.name}` },
            headers: { Authorization: `OAuth ${YANDEX_TOKEN}` }
          })
          logger.info(`Deleted old backup from Yandex Disk: ${file.name}`)
        } catch (err) {
          logger.error(`Failed to delete old backup ${file.name}: ${err.message}`)
        }
      }
    }

    // Getting the download URL
    const response = await axios.get(
      'https://cloud-api.yandex.net/v1/disk/resources/upload', {
        params: {
          path: `${cloudPath}/${fileName}`,
          overwrite: 'true',
        },
        headers: {
          Authorization: `OAuth ${YANDEX_TOKEN}`,
        },
      });

    if (response.status !== 200) {
      throw new Error(`Unexpected response status: ${response.status}`);
    }

    const uploadUrl = response.data.href;

    // Uploading a file
    const fileStream = fs.createReadStream(backupPath);
    const uploadResponse = await axios.put(uploadUrl, fileStream, {
      headers: {
        'Content-Type': 'application/x-sqlite3',
      },
    });

    if (uploadResponse.status !== 201) {
      throw new Error(
        `Unexpected upload response status: ${uploadResponse.status}`);
    }

    logger.info('File uploaded to Yandex Disk');
  } catch (err) {
    logger.error(`Error uploading file to Yandex Disk: ${err.message}`, {
      response: err.response ? err.response.data : null,
    });
  }
}

// Function to manage the number of backups
function manageBackups() {
  logger.info('Managing backups...');
  fs.readdir(backupDir, (err, files) => {
    if (err) {
      logger.error(`Error reading backup directory: ${err}`);
      return;
    }

    const backups = files.filter(
      file => file.startsWith('backup-') && file.endsWith('.db')).
      map(file => ({
        file, time: fs.statSync(path.join(backupDir, file)).
          mtime.
          getTime(),
      })).
      sort((a, b) => a.time - b.time);

    if (backups.length > MAX_BACKUPS) {
      const backupsToDelete = backups.slice(0, backups.length - MAX_BACKUPS);
      backupsToDelete.forEach((backup) => {
        fs.unlink(path.join(backupDir, backup.file), (err) => {
          if (err) {
            logger.error(`Error when deleting old backup: ${err}`);
          } else {
            logger.info(`Old backups was deleted: ${backup.file}`);
          }
        });
      });
    }
  });
}

// Run the backup function if the file is executed directly
if (process.argv.includes('run')) {
  logger.info('Running the backup script via pm2...');
  backupDatabase();
}
