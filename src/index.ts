import { Command } from 'commander'
import { composeTags } from 'tag-composer'
import packageJson from '../package.json' assert { type: 'json' }

async function main() {
  const program = new Command()

  program
    .name('context-composer')
    .description('Context Composer CLI')
    .version(packageJson.version)
    .argument('<file>', 'markdown file to process')
    .action((file: string) => {
      process.stdout.write(
        composeTags(file, {
          indentSpaces: 2,
          rootTag: false,
          convertPathToTagStrategy: 'tail',
          liftAllTagsToRoot: true,
          inlineCommonTags: true,
        }),
      )
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
