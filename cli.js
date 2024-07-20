#!/usr/bin/env node

import { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { backupDatabase } from './backup.js'

// Получаем путь к текущему файлу и директории
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const program = new Command()
program.version('1.0.0')

program
  .command('init')
  .description('Initialize the backup configuration')
  .action(() => {
    const cwd = process.cwd()
    const templatePath = path.resolve(__dirname, 'template.env')
    const destinationPath = path.resolve(cwd, '.env')
    const backupDir = path.resolve(cwd, 'backups')
    const ecosystemPath = path.resolve(cwd, 'ecosystem.config.js')

    // Create .env file
    if (!fs.existsSync(destinationPath)) {
      fs.copyFileSync(templatePath, destinationPath)
      console.log('.env file has been created. Please fill in the required values.')
    } else {
      console.log('.env file already exists.')
    }

    // Ensure the backups directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
      console.log('Backups directory has been created.')
    } else {
      console.log('Backups directory already exists.')
    }

    // Create ecosystem.config.js
    if (!fs.existsSync(ecosystemPath)) {
      const ecosystemConfig = `
module.exports = {
  apps: [
    {
      name: 'backup',
      script: 'node_modules/strapi-db-sqlite-cloud-backup/backup.js',
      args: 'run',
      cron_restart: '0 */3 * * *', // Run every 3 hours
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
      `
      fs.writeFileSync(ecosystemPath, ecosystemConfig.trim())
      console.log('ecosystem.config.js file has been created.')
    } else {
      console.log('ecosystem.config.js file already exists.')
    }
  })

program
  .command('run')
  .description('Run the backup script')
  .action(() => {
    console.log('Running the backup script...')
    const cwd = process.cwd()
    config({ path: path.resolve(cwd, '.env') }) // Load .env variables from the current working directory
    backupDatabase() // Run backup
  })

program.parse(process.argv)
