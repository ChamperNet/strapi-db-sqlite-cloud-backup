/*
 * Copyright (C) 2024
 * Iskakov Timur
 * Champer.ru
 */

module.exports = {
  apps: [
    {
      name: 'backup',
      script: 'backup.js',
      cron_restart: '0 */6 * * *', // Запуск каждые 6 часов
      watch: false,
      env: {
        NODE_ENV: 'production',
        // Переменные окружения для скрипта
        GOOGLE_DRIVE_ENABLED: process.env.GOOGLE_DRIVE_ENABLED,
        YANDEX_DISK_ENABLED: process.env.YANDEX_DISK_ENABLED,
        GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID,
        GOOGLE_CREDENTIALS_PATH: process.env.GOOGLE_CREDENTIALS_PATH,
        YANDEX_TOKEN: process.env.YANDEX_TOKEN
      }
    }
  ]
}
