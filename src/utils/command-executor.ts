import { exec } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

const MAX_COMMAND_OUTPUT_BUFFER = 10 * 1024 * 1024
const SCRIPT_FILE_PERMISSIONS = 0o755
const COMMAND_PROMPT_PREFIX = '  ▶ '

export interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
}

interface ExecError extends Error {
  stdout?: string
  stderr?: string
  code?: number
}

export async function executeCommand(command: string): Promise<CommandResult> {
  const tempScriptPath = join(tmpdir(), `context-composer-${Date.now()}.sh`)

  try {
    writeFileSync(tempScriptPath, command, { mode: SCRIPT_FILE_PERMISSIONS })

    const { stdout, stderr } = await execAsync(`bash ${tempScriptPath}`, {
      cwd: process.cwd(),
      encoding: 'utf8',
      maxBuffer: MAX_COMMAND_OUTPUT_BUFFER,
    })

    return {
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: 0,
    }
  } catch (error) {
    const execError = error as ExecError

    return {
      stdout: execError.stdout || '',
      stderr: execError.stderr || '',
      exitCode: execError.code || 1,
    }
  } finally {
    try {
      unlinkSync(tempScriptPath)
    } catch {}
  }
}

type TagCase = 'pascal' | 'kebab'

export function formatCommandOutput(
  command: string,
  result: CommandResult,
  tagCase: TagCase,
  indentSpaces: number,
): string {
  const tagName = tagCase === 'pascal' ? 'Command' : 'command'
  const combinedOutput = (result.stdout + result.stderr).trimEnd()
  const indent = ' '.repeat(indentSpaces)

  const lines = [
    `${indent}<${tagName}>`,
    `${indent}${COMMAND_PROMPT_PREFIX}${command}`,
  ]

  if (combinedOutput) {
    const outputLines = combinedOutput.split('\n')
    outputLines.forEach(line => {
      lines.push(`${indent}  ${line}`)
    })
  }

  lines.push(`${indent}</${tagName}>`)

  return lines.join('\n')
}
