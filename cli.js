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
    const templatePath = path.resolve(__dirname, 'template.env')
    const destinationPath = path.resolve(process.cwd(), '.env')
    const backupDir = path.resolve(process.cwd(), 'backups')

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
  })

program
  .command('run')
  .description('Run the backup script')
  .action(() => {
    console.log('Running the backup script...')
    config({ path: path.resolve(process.cwd(), '.env') }) // Load .env variables from the current working directory
    backupDatabase() // Run backup
  })

program.parse(process.argv)
