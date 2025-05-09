# venv-sync

A command-line tool to compare local `.env` variables with Vercel environment variables. This tool helps you identify which environment variables exist in your local `.env` file but are missing from your Vercel project.

## Features

- Detects environment variables that exist locally but not in Vercel
- Handles multiple `.env` files with interactive selection
- Supports multiple values for the same variable
- Masks sensitive values (shows only first 6 characters)
- Two-step process: first shows differences, then handles Vercel additions
- Interactive prompts for selecting which value to use when duplicates exist

## Prerequisites

- Node.js installed
- Vercel CLI installed (`npm i -g vercel`)
- Logged in to Vercel CLI (`vercel login`)

## Installation

```bash
npm install -g venv-sync
```

## Usage

In your project directory that contains a `.env` file and is linked to a Vercel project:

```bash
venv-sync
```

To select from multiple `.env` files in the current directory:

```bash
venv-sync --select
```

To specify a specific `.env` file:

```bash
venv-sync -e path/to/.env
```

## Options

- `-e, --env <path>`: Specify the path to your .env file (default: ".env")
- `-s, --select`: Interactive selection of .env file when multiple exist
- `-V, --version`: Output the version number
- `-h, --help`: Display help for command

## Example Output

```
Environment variables in local .env but not in Vercel:
----------------------------------------
API_KEY=abcdef******** (line 3)

STRIPE_SECRET (multiple values):
  - sk_test****** (line 5)
  - sk_live****** (line 6)

Would you like to add these variables to Vercel? [y/N]: y

Adding variables to Vercel:
----------------------------------------
Which environment for API_KEY? [Production, Preview, Development]: Production

Run this command to add the variable:
vercel env add API_KEY production

Multiple values found for STRIPE_SECRET:
1) Line 5: sk_test******
2) Line 6: sk_live******
Which value would you like to use for STRIPE_SECRET? (1-2): 1
Which environment? [Production, Preview, Development]: Production

Run this command to add the variable:
vercel env add STRIPE_SECRET production
```

## Features Explained

### Two-Step Process
1. First, the tool shows all differences between your local `.env` and Vercel
2. Then, if differences are found, it asks if you want to proceed with adding variables to Vercel

### Multiple .env Files
If you have multiple `.env` files (e.g., `.env`, `.env.local`, `.env.development`), use the `--select` option to choose which file to check.

### Duplicate Variables
If your `.env` file has multiple entries for the same variable, the tool will:
1. Show all occurrences with their line numbers
2. When adding to Vercel, prompt you to choose which value to use

### Value Masking
For security, the tool only shows the first 6 characters of any value, masking the rest with asterisks.

### Vercel Environment Selection
For each variable you choose to add, the tool will:
1. Show which Vercel environments don't have the variable
2. Let you choose which environment to add it to
3. Show the command to add the variable

## License

MIT 