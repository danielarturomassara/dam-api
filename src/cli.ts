#!/usr/bin/env node
process.env.LOG_FORMAT = 'cli';
import 'reflect-metadata';
import { DataSeeder } from '@core/infrastructure/mongodb/migration/DataSeeder.js';
import { dependencyContainer } from '@src/dependencyContainer.js';
import { Command } from 'commander';

const program = new Command();
const dataSeeder = dependencyContainer.get<DataSeeder>(DataSeeder);

program
  .name('seeder')
  .description('CLI tool for database seeding');

program
  .command('populate')
  .description('Populate database with seed data')
  .action(async () => {
    await dataSeeder.populate();
  });

program.parse(process.argv);
