import { Command } from 'commander'
import { composeTags } from 'tag-composer'
import packageJson from '../package.json' assert { type: 'json' }
import {
  countTokens,
  countCharacters,
  formatNumber,
} from './utils/token-counter.js'

const tagSortOrder = ['roles', 'rules', 'instructions', 'query']

function displayStats(output: string, version: string): void {
  const charCount = countCharacters(output)
  const tokenCount = countTokens(output)

  const banner = `📦 Context Composer v${version}`
  const separator = '─'.repeat(banner.length)

  process.stderr.write('\n')
  process.stderr.write('\n')
  process.stderr.write(`${banner}\n`)
  process.stderr.write(`${separator}\n`)
  process.stderr.write(`  Total Chars: ${formatNumber(charCount)} chars\n`)
  process.stderr.write(` Total Tokens: ${formatNumber(tokenCount)} tokens\n`)
}

async function main() {
  const program = new Command()

  program
    .name('context-composer')
    .description('Context Composer CLI')
    .version(packageJson.version)
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
        indentSpaces: process.stdout.isTTY ? 2 : 0,
        rootTag: false,
        liftAllTagsToRoot: true,
        inlineCommonTags: true,
        convertPathToTagStrategy: 'last',
        sortTagsToBottom: tagSortOrder,
      })

      process.stdout.write(output)

      if (process.stdout.isTTY) {
        displayStats(output, packageJson.version)
      }
    })

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
      if (error.message.startsWith('Error: ')) {
        console.error(error.message)
      } else {
        console.error('Error:', error.message)
      }
    } else {
      console.error('Error:', error)
    }
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
