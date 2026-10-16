#!/usr/bin/env node
import 'reflect-metadata';
import {DataSeeder} from '@core/infrastructure/mongodb/migration/DataSeeder.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {Command} from 'commander';
import {config as loadDotenv} from 'dotenv';

loadDotenv();

const program = new Command();

program
  .name('seeder')
  .description('CLI tool for database seeding');

program
  .command('populate')
  .description('Populate database with seed data')
  .action(async (): Promise<void> => {
    await dependencyContainer.get<DataSeeder>(DataSeeder).populate();
  });

await program.parseAsync(process.argv);
