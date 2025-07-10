declare module 'bash-parser' {
  interface WordNode {
    type: 'Word'
    text: string
  }

  interface CommandNode {
    type: 'Command' | 'SimpleCommand'
    name?: WordNode
    [key: string]: unknown
  }

  interface ASTNode {
    type: string
    [key: string]: unknown
  }

  function parse(script: string): ASTNode

  export = parse
}
