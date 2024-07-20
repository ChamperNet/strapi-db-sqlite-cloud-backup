/*
 * Copyright (C) 2024
 * Iskakov Timur
 * Champer.ru
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { google } from 'googleapis'
import axios from 'axios'
import winston from 'winston'
import { config } from 'dotenv'

// Загружаем переменные окружения из .env файла
config()

// Получаем путь к текущему файлу и директории
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Путь к базе данных
const dbPath = path.resolve(__dirname, '..', 'backend', '.tmp', 'data.db')

// Путь для временного хранения резервной копии
const backupDir = path.resolve(__dirname, 'backups')
const backupPath = path.resolve(backupDir, `backup-${Date.now()}.db`)

// Пути к лог-файлам
const errorLogPath = path.resolve(backupDir, 'errors.log')
const outputLogPath = path.resolve(backupDir, 'output.log')

// Настройка формата логов, аналогичного Laravel
const logFormat = winston.format.printf(({ timestamp, level, message, ...metadata }) => {
  let logMessage = `${timestamp} [${level.toUpperCase()}] ${message}`
  if (Object.keys(metadata).length) {
    logMessage += ` ${JSON.stringify(metadata)}`
  }
  return logMessage
})

// Инициализация логгера
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.File({ filename: errorLogPath, level: 'error' }),
    new winston.transports.File({ filename: outputLogPath, level: 'info' })
  ]
})

// Максимальное количество резервных копий
const MAX_BACKUPS = 24

// Функция для создания резервной копии базы данных
function backupDatabase () {
  // Убедитесь, что директория backup существует
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  fs.copyFile(dbPath, backupPath, (err) => {
    if (err) {
      logger.error(`Ошибка при создании резервной копии базы данных: ${err}`)
      return
    }

    logger.info(`Резервная копия базы данных создана: ${backupPath}`)

    // Загрузка на облачное хранилище
    if (process.env.GOOGLE_DRIVE_ENABLED === 'true') {
      uploadToGoogleDrive()
    }

    if (process.env.YANDEX_DISK_ENABLED === 'true') {
      uploadToYandexDisk()
    }

    // Проверка количества резервных копий
    manageBackups()
  })
}

// Функция для загрузки файла на Google Drive
function uploadToGoogleDrive () {
  const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID
  const GOOGLE_CREDENTIALS = JSON.parse(fs.readFileSync(path.resolve(__dirname, process.env.GOOGLE_CREDENTIALS_PATH)))

  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  })

  const drive = google.drive({ version: 'v3', auth })

  const fileMetadata = {
    name: path.basename(backupPath),
    parents: [GOOGLE_DRIVE_FOLDER_ID]
  }

  const media = {
    mimeType: 'application/x-sqlite3',
    body: fs.createReadStream(backupPath)
  }

  drive.files.create(
    {
      resource: fileMetadata,
      media,
      fields: 'id'
    },
    (err, file) => {
      if (err) {
        logger.error(`Ошибка при загрузке файла на Google Drive: ${err}`)
      } else {
        logger.info(`Файл загружен на Google Drive с ID: ${file.data.id}`)
      }
    }
  )
}

// Функция для загрузки файла на Yandex Disk
async function uploadToYandexDisk () {
  const YANDEX_TOKEN = process.env.YANDEX_TOKEN
  const fileName = path.basename(backupPath)

  try {
    // Получение URL для загрузки
    const response = await axios.get('https://cloud-api.yandex.net/v1/disk/resources/upload', {
      params: {
        path: `/backups/${fileName}`,
        overwrite: 'true'
      },
      headers: {
        Authorization: `OAuth ${YANDEX_TOKEN}`
      }
    })

    if (response.status !== 200) {
      throw new Error(`Unexpected response status: ${response.status}`)
    }

    const uploadUrl = response.data.href

    // Загрузка файла
    const fileStream = fs.createReadStream(backupPath)
    const uploadResponse = await axios.put(uploadUrl, fileStream, {
      headers: {
        'Content-Type': 'application/x-sqlite3'
      }
    })

    if (uploadResponse.status !== 201) {
      throw new Error(`Unexpected upload response status: ${uploadResponse.status}`)
    }

    logger.info('Файл загружен на Yandex Disk')
  } catch (err) {
    logger.error(`Ошибка при загрузке файла на Yandex Disk: ${err.message}`, {
      response: err.response ? err.response.data : null
    })
  }
}

// Функция для управления количеством резервных копий
function manageBackups () {
  fs.readdir(backupDir, (err, files) => {
    if (err) {
      logger.error(`Ошибка при чтении директории резервных копий: ${err}`)
      return
    }

    const backups = files
      .filter(file => file.startsWith('backup-') && file.endsWith('.db'))
      .map(file => ({ file, time: fs.statSync(path.join(backupDir, file)).mtime.getTime() }))
      .sort((a, b) => a.time - b.time)

    if (backups.length > MAX_BACKUPS) {
      const backupsToDelete = backups.slice(0, backups.length - MAX_BACKUPS)
      backupsToDelete.forEach((backup) => {
        fs.unlink(path.join(backupDir, backup.file), (err) => {
          if (err) {
            logger.error(`Ошибка при удалении старой резервной копии: ${err}`)
          } else {
            logger.info(`Старая резервная копия удалена: ${backup.file}`)
          }
        })
      })
    }
  })
}

// Запуск резервного копирования при запуске скрипта
if (process.argv.includes('run')) {
  // Если скрипт запускается с параметром "run", выполняем разовое копирование
  backupDatabase()
}
