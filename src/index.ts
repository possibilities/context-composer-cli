import { Command } from 'commander'
import { composeTags } from 'tag-composer'
import prompts from 'prompts'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import packageJson from '../package.json' assert { type: 'json' }
import { countTokens, formatNumber } from './utils/token-counter.js'

const tagSortOrder = ['roles', 'rules', 'instructions', 'query']

const defaultComposeOptions = {
  rootTag: false,
  tagCase: 'pascal' as const,
  liftAllTagsToRoot: true,
  inlineCommonTags: true,
  convertPathToTagStrategy: 'last' as const,
  sortTagsToBottom: tagSortOrder,
}

const SEPARATOR_LENGTH = 50

function formatBanner(title: string): { banner: string; separator: string } {
  const separator = '─'.repeat(
    title.length > SEPARATOR_LENGTH ? title.length : SEPARATOR_LENGTH,
  )
  return { banner: title, separator }
}

function displayStats(output: string, version: string): void {
  const charCount = output.length
  const tokenCount = countTokens(output)

  const { banner, separator } = formatBanner(`Context Composer v${version}`)

  process.stderr.write('\n')
  process.stderr.write('\n')
  process.stderr.write(`${banner}\n`)
  process.stderr.write(`${separator}\n`)
  process.stderr.write(`  Total Chars: ${formatNumber(charCount)} chars\n`)
  process.stderr.write(` Total Tokens: ${formatNumber(tokenCount)} tokens\n`)
}

interface FileStats {
  filename: string
  charCount: number
  tokenCount: number
}

interface ValidationResult {
  success: boolean
  filename: string
  error?: string
}

function formatErrorMessage(error: unknown): string {
  let errorMessage = error instanceof Error ? error.message : String(error)
  if (errorMessage.startsWith('Error: ')) {
    errorMessage = errorMessage.slice(7)
  }
  return errorMessage
}

function validateFile(filePath: string): ValidationResult {
  const filename = basename(filePath)
  try {
    composeTags(filePath, {
      ...defaultComposeOptions,
      indentSpaces: 0,
    })
    return { success: true, filename }
  } catch (error) {
    return {
      success: false,
      filename,
      error: formatErrorMessage(error),
    }
  }
}

function validateFiles(files: string[]): ValidationResult[] {
  return files.map(file => validateFile(file))
}

function displayMultiFileStats(fileStats: FileStats[], version: string): void {
  const { banner, separator } = formatBanner(`Context Composer v${version}`)

  process.stderr.write('\n')
  process.stderr.write(`${banner}\n`)
  process.stderr.write(`${separator}\n`)

  fileStats.forEach(file => {
    process.stderr.write(
      `  ${file.filename}: ${formatNumber(file.charCount)} chars, ${formatNumber(file.tokenCount)} tokens\n`,
    )
  })
}

async function main(): Promise<void> {
  const program = new Command()

  program
    .name('context-composer')
    .description('Context Composer CLI')
    .version(packageJson.version)

  program
    .argument('<file>', 'markdown file to process')
    .action((file: string) => {
      const command = program
      if (command.args.length > 1) {
        console.error(
          'Error: Too many arguments. Only one file can be processed at a time.',
        )
        process.exit(1)
      }
      const output = composeTags(file, {
        ...defaultComposeOptions,
        indentSpaces: process.stdout.isTTY ? 4 : 0,
      })

      process.stdout.write(output)

      if (process.stdout.isTTY) {
        displayStats(output, packageJson.version)
      }
    })

  program
    .command('validate')
    .description('Validate multiple markdown files')
    .argument('<files...>', 'markdown files to validate')
    .action((files: string[]) => {
      const results = validateFiles(files)
      const failures = results.filter(r => !r.success)

      if (failures.length === 0) {
        process.stderr.write(
          `✓ All ${files.length} file(s) validated successfully\n`,
        )
      } else {
        failures.forEach(failure => {
          process.stderr.write(`✗ ${failure.filename}: ${failure.error}\n`)
        })
        process.stderr.write(
          `\n${failures.length} of ${files.length} file(s) failed validation\n`,
        )
        process.exit(1)
      }
    })

  program
    .command('dump')
    .description('Process multiple markdown files and save to directory')
    .argument('<files...>', 'markdown files to process')
    .option(
      '-c, --commands-path <path>',
      'output directory for processed files',
      process.cwd(),
    )
    .option('-f, --force', 'overwrite existing files without prompting')
    .action(
      async (
        files: string[],
        options: { commandsPath: string; force?: boolean },
      ) => {
        const validationResults = validateFiles(files)
        const failures = validationResults.filter(r => !r.success)

        if (failures.length > 0) {
          process.stderr.write('Validation failed for the following files:\n')
          failures.forEach(failure => {
            process.stderr.write(`✗ ${failure.filename}: ${failure.error}\n`)
          })
          process.stderr.write(
            `\n${failures.length} of ${files.length} file(s) failed validation\n`,
          )
          process.stderr.write('No files were processed.\n')
          process.exit(1)
        }

        const fileStats: FileStats[] = []

        if (!existsSync(options.commandsPath)) {
          mkdirSync(options.commandsPath, { recursive: true })
        }

        for (const file of files) {
          try {
            const filename = basename(file)
            const outputPath = join(options.commandsPath, filename)

            if (existsSync(outputPath) && !options.force) {
              const response = await prompts({
                type: 'confirm',
                name: 'overwrite',
                message: `File ${filename} already exists. Overwrite?`,
                initial: false,
              })

              if (!response.overwrite) {
                process.stderr.write(`Skipping ${filename}\n`)
                continue
              }
            }

            const output = composeTags(file, {
              ...defaultComposeOptions,
              indentSpaces: 0,
            })

            writeFileSync(outputPath, output)
            process.stderr.write(`✓ Processed ${filename}\n`)

            fileStats.push({
              filename,
              charCount: output.length,
              tokenCount: countTokens(output),
            })
          } catch (error) {
            process.stderr.write(
              `✗ Error processing ${file}: ${formatErrorMessage(error)}\n`,
            )
          }
        }

        if (fileStats.length > 0) {
          displayMultiFileStats(fileStats, packageJson.version)
        }
      },
    )

  try {
    program.exitOverride()
    program.configureOutput({
      writeErr: str => process.stderr.write(str),
    })

    await program.parseAsync(process.argv)
  } catch (error) {
    if (error instanceof Error) {
      const commanderError = error as Error & { code?: string }
      if (
        commanderError.code === 'commander.help' ||
        commanderError.code === 'commander.helpDisplayed' ||
        commanderError.code === 'commander.version'
      ) {
        process.exit(0)
      }
      console.error(formatErrorMessage(error))
    } else {
      console.error('Error:', error)
    }
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
