import { Command } from 'commander'
import { composeTags } from 'tag-composer'
import prompts from 'prompts'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import packageJson from '../package.json' assert { type: 'json' }
import { countTokens, formatNumber } from './utils/token-counter.js'
import { injectAllowedToolsIntoContent } from './utils/frontmatter-tools.js'

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

const SPACING_OPTIONS = {
  spaces: ['--spaces <number>', 'indentation spaces', '4'] as const,
  tagCase: [
    '--tag-case <case>',
    'case style for tag names (choices: pascal, kebab)',
    'pascal',
  ] as const,
  compact: ['--compact', 'use compact output with no indentation'] as const,
}

function formatBanner(title: string): { banner: string; separator: string } {
  const separator = '─'.repeat(
    title.length > SEPARATOR_LENGTH ? title.length : SEPARATOR_LENGTH,
  )
  return { banner: title, separator }
}

function calculateIndentSpaces(
  spaces: string | undefined,
  compact: boolean | undefined,
  isTTY: boolean,
): number {
  if (!isTTY) return 0
  if (compact) return 0
  if (spaces === undefined) return 4
  const parsed = parseInt(spaces, 10)
  if (isNaN(parsed) || parsed < 0) {
    throw new Error('--spaces must be a non-negative number')
  }
  return parsed
}

function parseTagCase(tagCase: string): 'pascal' | 'kebab' {
  if (tagCase !== 'pascal' && tagCase !== 'kebab') {
    throw new Error(
      `Invalid --tag-case value '${tagCase}'. Valid choices are: pascal, kebab`,
    )
  }
  return tagCase
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
    .showHelpAfterError()

  program
    .argument('<file>', 'markdown file to process')
    .option(
      SPACING_OPTIONS.spaces[0],
      'indentation spaces (ignored when output is piped)',
      SPACING_OPTIONS.spaces[2],
    )
    .option(...SPACING_OPTIONS.tagCase)
    .option(SPACING_OPTIONS.compact[0], SPACING_OPTIONS.compact[1])
    .option('--add-allowed-tools', 'inject allowed-tools (default)')
    .option('--no-add-allowed-tools', 'disable injection of allowed-tools')
    .action(
      (
        file: string,
        options: {
          spaces: string
          tagCase: string
          compact?: boolean
          addAllowedTools?: boolean
        },
      ) => {
        const command = program
        if (command.args.length > 1) {
          console.error(
            'Error: Too many arguments. Only one file can be processed at a time.',
          )
          process.exit(1)
        }

        try {
          const validatedTagCase = parseTagCase(options.tagCase)
          const indentSpaces = calculateIndentSpaces(
            options.spaces,
            options.compact,
            process.stdout.isTTY,
          )

          let output = composeTags(file, {
            ...defaultComposeOptions,
            indentSpaces,
            tagCase: validatedTagCase,
          })

          const parentProgramOptions = program.opts()
          if (parentProgramOptions.addAllowedTools !== false) {
            output = injectAllowedToolsIntoContent(output)
          }

          process.stdout.write(output)

          if (process.stdout.isTTY) {
            displayStats(output, packageJson.version)
          }
        } catch (error) {
          console.error(formatErrorMessage(error))
          process.exit(1)
        }
      },
    )

  program
    .command('validate')
    .description('validate markdown recursively')
    .argument('<files...>', 'markdown files to validate')
    .option(
      SPACING_OPTIONS.spaces[0],
      'indentation spaces (for consistency with other commands)',
      SPACING_OPTIONS.spaces[2],
    )
    .option(...SPACING_OPTIONS.tagCase)
    .option(
      SPACING_OPTIONS.compact[0],
      'use compact output (for consistency with other commands)',
    )
    .option('--add-allowed-tools', 'inject allowed-tools (default)')
    .option('--no-add-allowed-tools', 'disable injection of allowed-tools')
    .action(
      (
        files: string[],
        _options: {
          spaces: string
          tagCase: string
          compact?: boolean
          addAllowedTools?: boolean
        },
      ) => {
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
      },
    )

  program
    .command('export')
    .description('export rendered markdown')
    .argument('<files...>', 'markdown files to process')
    .option(
      '-c, --commands-path <path>',
      'output directory for processed files',
      process.cwd(),
    )
    .option('-f, --force', 'overwrite existing files without prompting')
    .option(SPACING_OPTIONS.spaces[0], SPACING_OPTIONS.spaces[1], '0')
    .option(...SPACING_OPTIONS.tagCase)
    .option(...SPACING_OPTIONS.compact)
    .option('--add-allowed-tools', 'inject allowed-tools (default)')
    .option('--no-add-allowed-tools', 'disable injection of allowed-tools')
    .action(
      async (
        files: string[],
        options: {
          commandsPath: string
          force?: boolean
          spaces: string
          tagCase: string
          compact?: boolean
          addAllowedTools?: boolean
        },
      ) => {
        try {
          const validatedTagCase = parseTagCase(options.tagCase)
          const indentSpaces = calculateIndentSpaces(
            options.spaces,
            options.compact,
            false,
          )

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

              let output = composeTags(file, {
                ...defaultComposeOptions,
                indentSpaces,
                tagCase: validatedTagCase,
              })

              const parentProgramOptions = program.opts()
              if (parentProgramOptions.addAllowedTools !== false) {
                output = injectAllowedToolsIntoContent(output)
              }

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
        } catch (error) {
          console.error(formatErrorMessage(error))
          process.exit(1)
        }
      },
    )

  try {
    program.exitOverride()
    program.configureOutput({
      writeErr: str => process.stderr.write(str),
      outputError: (str, write) => {
        const cleanedError = str.replace(/^error: /, '')
        write(cleanedError)
      },
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

      if (
        !commanderError.code ||
        !commanderError.code.startsWith('commander.')
      ) {
        console.error(formatErrorMessage(error))
      }
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
