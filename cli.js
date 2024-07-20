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

    if (!fs.existsSync(destinationPath)) {
      fs.copyFileSync(templatePath, destinationPath)
      console.log('.env file has been created. Please fill in the required values.')
    } else {
      console.log('.env file already exists.')
    }
  })

program
  .command('run')
  .description('Run the backup script')
  .action(() => {
    config() // Load .env variables
    backupDatabase() // Run backup
  })

program.parse(process.argv)
