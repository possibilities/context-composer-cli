export interface ProcessingError {
  filename: string
  message: string
  originalError?: unknown
}

export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    let message = error.message

    if (message.startsWith('Error: ')) {
      message = message.slice(7)
    }
    return message
  }
  return String(error)
}

export function isCommanderError(
  error: unknown,
): error is Error & { code: string } {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as any).code === 'string'
  )
}

export function isHelpOrVersionError(error: unknown): boolean {
  if (!isCommanderError(error)) return false

  const helpCodes = [
    'commander.help',
    'commander.helpDisplayed',
    'commander.version',
  ]
  return helpCodes.includes(error.code)
}

export function writeError(message: string): void {
  process.stderr.write(`✗ ${message}\n`)
}

export function writeSuccess(message: string): void {
  process.stderr.write(`✓ ${message}\n`)
}

export function writeInfo(message: string): void {
  process.stderr.write(`${message}\n`)
}
