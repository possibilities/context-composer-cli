import { executeCommand, formatCommandOutput } from './command-executor.js'

const EMBEDDED_COMMAND_REGEX = /!\`([^`]+)\`/g

type TagCase = 'pascal' | 'kebab'

interface TextContext {
  beforeMatch: string
  afterMatch: string
  textBeforeOnSameLine: string
  textAfterOnSameLine: string
  lastNewlineBeforeMatch: number
  firstNewlineAfterMatch: number
}

function extractSurroundingContext(
  content: string,
  matchIndex: number,
  matchLength: number,
): TextContext {
  const beforeMatch = content.substring(0, matchIndex)
  const afterMatch = content.substring(matchIndex + matchLength)

  const lastNewlineBeforeMatch = beforeMatch.lastIndexOf('\n')
  const textBeforeOnSameLine = beforeMatch.substring(lastNewlineBeforeMatch + 1)

  const firstNewlineAfterMatch = afterMatch.indexOf('\n')
  const textAfterOnSameLine =
    firstNewlineAfterMatch === -1
      ? afterMatch
      : afterMatch.substring(0, firstNewlineAfterMatch)

  return {
    beforeMatch,
    afterMatch,
    textBeforeOnSameLine,
    textAfterOnSameLine,
    lastNewlineBeforeMatch,
    firstNewlineAfterMatch,
  }
}

function buildFormattedReplacement(
  formattedOutput: string,
  hasTextBefore: boolean,
  hasTextAfter: boolean,
): string {
  let replacement = ''

  if (hasTextBefore) {
    replacement = '\n' + formattedOutput
  } else {
    replacement = formattedOutput
  }

  if (hasTextAfter) {
    replacement += '\n'
  }

  return replacement
}

function reconstructContentWithReplacement(
  context: TextContext,
  replacement: string,
): string {
  const newBeforeMatch =
    context.beforeMatch.substring(0, context.lastNewlineBeforeMatch + 1) +
    (context.textBeforeOnSameLine.trim() ? context.textBeforeOnSameLine : '')

  const newAfterMatch =
    (context.textAfterOnSameLine.trim() ? context.textAfterOnSameLine : '') +
    (context.firstNewlineAfterMatch === -1
      ? ''
      : context.afterMatch.substring(context.firstNewlineAfterMatch))

  return newBeforeMatch + replacement + newAfterMatch
}

function calculateOffsetAdjustment(
  replacement: string,
  fullMatchLength: number,
  hasTextBefore: boolean,
  textBeforeLength: number,
): number {
  const lengthDifference = replacement.length - fullMatchLength

  if (hasTextBefore) {
    return lengthDifference
  } else {
    return lengthDifference - textBeforeLength
  }
}

export async function replaceEmbeddedCommands(
  content: string,
  tagCase: TagCase,
): Promise<string> {
  const matches = Array.from(content.matchAll(EMBEDDED_COMMAND_REGEX))

  if (matches.length === 0) {
    return content
  }

  let resultContent = content
  let offset = 0

  for (const match of matches) {
    const fullMatch = match[0]
    const command = match[1]
    const originalIndex = match.index! + offset

    try {
      const result = await executeCommand(command)

      if (result.exitCode !== 0) {
        throw new Error(
          `Command failed with exit code ${result.exitCode}: ${command}\n` +
            `Output: ${result.stdout}${result.stderr}`,
        )
      }

      const formattedOutput = formatCommandOutput(command, result, tagCase)
      const context = extractSurroundingContext(
        resultContent,
        originalIndex,
        fullMatch.length,
      )

      const hasTextBefore = context.textBeforeOnSameLine.trim().length > 0
      const hasTextAfter = context.textAfterOnSameLine.trim().length > 0

      const replacement = buildFormattedReplacement(
        formattedOutput,
        hasTextBefore,
        hasTextAfter,
      )
      resultContent = reconstructContentWithReplacement(context, replacement)

      offset += calculateOffsetAdjustment(
        replacement,
        fullMatch.length,
        hasTextBefore,
        context.textBeforeOnSameLine.length,
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to execute embedded command: ${errorMessage}`)
    }
  }

  return resultContent
}
