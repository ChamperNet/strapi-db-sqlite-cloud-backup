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
        NODE_ENV: 'production'
      }
    }
  ]
}
