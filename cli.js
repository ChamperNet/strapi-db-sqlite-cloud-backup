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
    const backupDir = path.resolve(cwd, 'backups')

    const templateEnvPath = path.resolve(__dirname, 'template.env')
    const destinationEnvPath = path.resolve(cwd, '.env')

    const ecosystemTemplate = path.resolve(__dirname, 'ecosystem.config.js')
    const ecosystemPath = path.resolve(cwd, 'ecosystem.config.js')

    const gitignoreTemplate = path.resolve(__dirname, '.gitignore')
    const gitignorePath = path.resolve(cwd, '.gitignore')

    // Create .env file
    if (!fs.existsSync(destinationEnvPath)) {
      fs.copyFileSync(templateEnvPath, destinationEnvPath)
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
      fs.copyFileSync(ecosystemTemplate, ecosystemPath)
      console.log('ecosystem.config.js file has been created.')
    } else {
      console.log('ecosystem.config.js file already exists.')
    }

    // Create .gitignore
    if (!fs.existsSync(gitignorePath)) {
      fs.copyFileSync(gitignoreTemplate, gitignorePath)
      console.log('.gitignore file has been created.')
    } else {
      console.log('.gitignore file already exists.')
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
