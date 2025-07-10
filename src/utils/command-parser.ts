import bashParser from 'bash-parser'

interface ASTNodeWithName {
  type: string
  name?: { text: string }
}

export function extractCommandsFromBash(commandString: string): string[] {
  const uniqueCommands = new Set<string>()

  try {
    const syntaxTree = bashParser(commandString)
    collectCommandNamesFromNode(syntaxTree, uniqueCommands)
  } catch {
    return []
  }

  return Array.from(uniqueCommands).sort()
}

function collectCommandNamesFromNode(
  node: unknown,
  commandSet: Set<string>,
): void {
  if (!node || typeof node !== 'object') return

  const astNode = node as ASTNodeWithName
  const isCommandNode =
    astNode.type === 'Command' || astNode.type === 'SimpleCommand'

  if (isCommandNode && astNode.name?.text) {
    commandSet.add(astNode.name.text)
  }

  if (Array.isArray(node)) {
    node.forEach(childNode =>
      collectCommandNamesFromNode(childNode, commandSet),
    )
  } else {
    Object.values(node).forEach(childValue =>
      collectCommandNamesFromNode(childValue, commandSet),
    )
  }
}
