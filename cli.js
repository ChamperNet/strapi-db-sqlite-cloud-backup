#!/usr/bin/env node

import { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'
import { backupDatabase } from './backup.js'

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
    const cwd = process.cwd()
    config({ path: path.resolve(cwd, '.env') }) // Load .env variables from the current working directory
    backupDatabase() // Run backup
  })

program.parse(process.argv)
