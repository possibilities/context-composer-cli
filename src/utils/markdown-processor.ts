import { extractCommandsFromBash } from './command-parser.js'

const EMBEDDED_COMMAND_REGEX = /!\`([^`]+)\`/g

export function extractEmbeddedCommands(markdownContent: string): string[] {
  const allCommands = new Set<string>()
  const matches = markdownContent.matchAll(EMBEDDED_COMMAND_REGEX)

  for (const match of matches) {
    const commandString = match[1]
    const extractedCommands = extractCommandsFromBash(commandString)
    extractedCommands.forEach(cmd => allCommands.add(cmd))
  }

  return Array.from(allCommands).sort()
}

export function extractFrontmatter(content: string): {
  frontmatter: string | null
  body: string
  startIndex: number
  endIndex: number
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return {
      frontmatter: null,
      body: content,
      startIndex: 0,
      endIndex: 0,
    }
  }

  return {
    frontmatter: match[1],
    body: content.slice(match[0].length),
    startIndex: 0,
    endIndex: match[0].length,
  }
}
