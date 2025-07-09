export interface StatsDisplay {
  charCount: number
  tokenCount: number
  filename?: string
}

const DEFAULT_SEPARATOR_LENGTH = 50

export function formatNumber(num: number): string {
  return num.toLocaleString()
}

export function createBanner(text: string): string {
  return text
}

export function createSeparator(
  length: number = DEFAULT_SEPARATOR_LENGTH,
): string {
  return '─'.repeat(length)
}

export function displayBanner(title: string, separatorLength?: number): void {
  const separator = createSeparator(separatorLength ?? title.length)
  process.stderr.write('\n')
  process.stderr.write(`${title}\n`)
  process.stderr.write(`${separator}\n`)
}

export function displaySingleFileStats(
  stats: StatsDisplay,
  version: string,
): void {
  const banner = `Context Composer v${version}`

  process.stderr.write('\n')
  process.stderr.write('\n')
  process.stderr.write(`${banner}\n`)
  process.stderr.write(`${createSeparator(banner.length)}\n`)
  process.stderr.write(
    `  Total Chars: ${formatNumber(stats.charCount)} chars\n`,
  )
  process.stderr.write(
    ` Total Tokens: ${formatNumber(stats.tokenCount)} tokens\n`,
  )
}

export function displayMultiFileStats(
  stats: StatsDisplay[],
  version: string,
): void {
  displayBanner(`Context Composer v${version}`)

  stats.forEach(stat => {
    const filename = stat.filename || 'unknown'
    process.stderr.write(
      `  ${filename}: ${formatNumber(stat.charCount)} chars, ${formatNumber(stat.tokenCount)} tokens\n`,
    )
  })
}
