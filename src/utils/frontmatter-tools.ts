import {
  extractEmbeddedCommands,
  extractFrontmatter,
} from './markdown-processor.js'

function formatCommandsAsAllowedTools(commands: string[]): string {
  const bashTools = commands.map(cmd => `Bash(${cmd}:*)`).join(', ')
  return `allowed-tools: ${bashTools}`
}

function insertAllowedToolsIntoFrontmatterLines(
  lines: string[],
  allowedToolsLine: string,
): void {
  const existingAllowedToolsIndex = lines.findIndex(line =>
    line.startsWith('allowed-tools:'),
  )

  if (existingAllowedToolsIndex !== -1) {
    lines[existingAllowedToolsIndex] = allowedToolsLine
    return
  }

  const descriptionLineIndex = lines.findIndex(line =>
    line.startsWith('description:'),
  )

  const insertPosition =
    descriptionLineIndex !== -1 ? descriptionLineIndex + 1 : 0
  lines.splice(insertPosition, 0, allowedToolsLine)
}

export function injectAllowedToolsIntoContent(content: string): string {
  const embeddedCommands = extractEmbeddedCommands(content)
  if (embeddedCommands.length === 0) return content

  const allowedToolsLine = formatCommandsAsAllowedTools(embeddedCommands)
  const { frontmatter, body } = extractFrontmatter(content)

  if (!frontmatter) {
    return `---\n${allowedToolsLine}\n---\n${content}`
  }

  const frontmatterLines = frontmatter.split('\n')
  insertAllowedToolsIntoFrontmatterLines(frontmatterLines, allowedToolsLine)

  const updatedFrontmatter = `---\n${frontmatterLines.join('\n')}\n---\n`
  return updatedFrontmatter + body
}
