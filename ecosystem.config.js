/*
 * Copyright (C) 2024
 * Iskakov Timur
 * Champer.ru
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

module.exports = {
  apps: [
    {
      name: 'backup',
      script: 'node_modules/strapi-db-sqlite-cloud-backup/backup.js',
      args: 'run',
      cron_restart: '0 */3 * * *', // Run every 3 hours
      watch: false,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    }
  ]
};
