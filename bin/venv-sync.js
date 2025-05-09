#!/usr/bin/env node

const { program } = require('commander');
const dotenv = require('dotenv');
const chalk = require('chalk');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

program
  .version('1.0.0')
  .description('Compare local .env variables with Vercel environment variables')
  .option('-e, --env <path>', 'Path to .env file', '.env')
  .option('-s, --select', 'Select from available .env files')
  .parse(process.argv);

const options = program.opts();

// Find all .env files in current directory
function findEnvFiles() {
  const files = fs.readdirSync(process.cwd());
  return files.filter(file => file.includes('.env'));
}

// Mask sensitive values
function maskValue(value) {
  if (!value) return '';
  const visibleChars = 6;
  return value.length > visibleChars 
    ? `${value.substring(0, visibleChars)}${'*'.repeat(value.length - visibleChars)}`
    : value;
}

// Read local .env file
function getLocalEnvVars(envPath) {
  try {
    if (!fs.existsSync(envPath)) {
      console.error(chalk.red(`Error: ${envPath} file not found`));
      process.exit(1);
    }
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    const envVars = {};
    
    lines.forEach((line, index) => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          if (!envVars[key]) {
            envVars[key] = [];
          }
          envVars[key].push({
            value: value.replace(/^['"]|['"]$/g, ''), // Remove quotes if present
            line: index + 1
          });
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.error(chalk.red(`Error reading ${envPath}: ${error.message}`));
    process.exit(1);
  }
}

// Get Vercel environment variables
function getVercelEnvVars() {
  try {
    const output = execSync('vercel env ls --no-color', { encoding: 'utf-8' });
    const lines = output.split('\n');
    
    const startIndex = lines.findIndex(line => line.includes('name') && line.includes('value') && line.includes('environments'));
    if (startIndex === -1) return {};

    const vercelVars = {};
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(/\s+/);
      if (parts[0]) {
        vercelVars[parts[0]] = {
          environments: parts.slice(3).filter(env => 
            ['Development', 'Preview', 'Production'].includes(env.replace(',', ''))
          )
        };
      }
    }
    
    return vercelVars;
  } catch (error) {
    if (error.message.includes('vercel: command not found')) {
      console.error(chalk.red('Error: Vercel CLI is not installed. Please install it with "npm i -g vercel"'));
    } else {
      console.error(chalk.red(`Error getting Vercel environment variables: ${error.message}`));
    }
    process.exit(1);
  }
}

async function handleVercelAddition(key, values, vercelVars) {
  if (values.length === 1) {
    const environments = ['Production', 'Preview', 'Development'];
    const envChoices = environments
      .filter(env => !vercelVars[key]?.environments.includes(env))
      .join(', ');
    
    if (envChoices) {
      const envAnswer = await question(
        chalk.cyan(`Which environment for ${key}? [${envChoices}]: `)
      );
      
      if (environments.includes(envAnswer)) {
        console.log(chalk.yellow(`\nRun this command to add the variable:`));
        console.log(chalk.gray(`vercel env add ${key} ${envAnswer.toLowerCase()}`));
      }
    }
  } else {
    console.log(chalk.yellow(`\nMultiple values found for ${key}:`));
    values.forEach((val, index) => {
      console.log(chalk.gray(`${index + 1}) Line ${val.line}: ${maskValue(val.value)}`));
    });
    
    const valueChoice = await question(
      chalk.cyan(`Which value would you like to use for ${key}? (1-${values.length}): `)
    );
    
    if (valueChoice >= 1 && valueChoice <= values.length) {
      const environments = ['Production', 'Preview', 'Development'];
      const envChoices = environments
        .filter(env => !vercelVars[key]?.environments.includes(env))
        .join(', ');
      
      if (envChoices) {
        const envAnswer = await question(
          chalk.cyan(`Which environment? [${envChoices}]: `)
        );
        
        if (environments.includes(envAnswer)) {
          console.log(chalk.yellow(`\nRun this command to add the variable:`));
          console.log(chalk.gray(`vercel env add ${key} ${envAnswer.toLowerCase()}`));
        }
      }
    }
  }
}

// Compare and display results
async function compareEnvVars() {
  let envPath = options.env;
  
  if (options.select) {
    const envFiles = findEnvFiles();
    if (envFiles.length === 0) {
      console.error(chalk.red('No .env files found in current directory'));
      process.exit(1);
    }
    
    console.log(chalk.bold('\nAvailable .env files:'));
    envFiles.forEach((file, index) => {
      console.log(chalk.gray(`${index + 1}) ${file}`));
    });
    
    const fileChoice = await question(
      chalk.cyan(`\nSelect .env file (1-${envFiles.length}): `)
    );
    
    if (fileChoice >= 1 && fileChoice <= envFiles.length) {
      envPath = envFiles[fileChoice - 1];
    } else {
      console.error(chalk.red('Invalid selection'));
      process.exit(1);
    }
  }

  const localVars = getLocalEnvVars(envPath);
  const vercelVars = getVercelEnvVars();

  console.log(chalk.bold('\nEnvironment variables in local .env but not in Vercel:'));
  console.log(chalk.gray('----------------------------------------'));

  // First, show all differences
  const missingVars = [];
  let found = false;

  for (const [key, values] of Object.entries(localVars)) {
    if (!vercelVars[key]) {
      found = true;
      missingVars.push({ key, values });
      
      if (values.length === 1) {
        console.log(chalk.yellow(`${key}=${maskValue(values[0].value)} (line ${values[0].line})`));
      } else {
        console.log(chalk.yellow(`${key} (multiple values):`));
        values.forEach(val => {
          console.log(chalk.gray(`  - ${maskValue(val.value)} (line ${val.line})`));
        });
      }
    }
  }

  if (!found) {
    console.log(chalk.green('All local environment variables are present in Vercel!'));
    rl.close();
    return;
  }

  // Then ask if user wants to proceed with adding to Vercel
  const proceed = await question(
    chalk.cyan('\nWould you like to add these variables to Vercel? [y/N]: ')
  );

  if (proceed.toLowerCase() === 'y') {
    console.log(chalk.bold('\nAdding variables to Vercel:'));
    console.log(chalk.gray('----------------------------------------'));
    
    for (const { key, values } of missingVars) {
      await handleVercelAddition(key, values, vercelVars);
    }
  }
  
  rl.close();
}

// Run the comparison
compareEnvVars(); 