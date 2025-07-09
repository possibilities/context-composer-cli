# Context Composer CLI

A simple tool for composing context

## Usage

## Command line

Create prompt fragments in markdown documents:

```
▶ tree
.
├── readmd.md
├── roles
│   ├── typescript-cli.md
│   └── typescript-ui.md
├── rules
│   ├── dotfiles.md
│   ├── nextjs-app.md
│   ├── nextjs-components.md
│   └── typescript.md
├── shared
│   ├── common.md
│   ├── project
│   │   └── common.md
│   ├── query
│   │   └── prompt-me.md
│   ├── repo
│   ├── roles
│   │   └── engineer.md
│   ├── rules
│   │   ├── comments.md
│   │   └── general.md
│   └── ui
│       └── common.md
├── work-on-dotfiles.md
├── work-on-project.md
├── work-on-typescript-cli.md
├── work-on-ui-app.md
└── work-on-ui-components.md
```

[View my prompt fragments](https://github.com/possibilities/prompts)

Link markdown together using the `@@` directive:

```markdown
@@shared/common.md
@@rules/typescipt.md
```

Then generate tags using the CLI:

```
▶ context-composer work-on-typescript-cli.md
---
description: Work on Typescript CLI
allowed-tools: Bash(tree:*), Bash(git:*), Bash(jq:*), Bash(meta-composer:*)
---
<Project>
    Project files and structure:
    !`tree --gitignore --dirsfirst`
    Current project changes since last commit:
    !`git diff HEAD`
    Current project git status:
    !`git status --porcelain`
    Information about project and dependencies:
    !`meta-composer project get-info`
</Project>
<Roles>
    - You are an experienced software engineer who is product focused
        - Prioritize people, users, product, and design
        - Embrace simplicity and mindfulness in your creations. Focus on:
            - Minimalism: Highlight what truly matters and remove the unnecessary
            - Beginner’s Mind: Approach each task with curiosity and openness
            - Elegance: Let your work reflect clarity and intention through clean, thoughtful design
    - Before doing any work think deeply and make a clear plan to follow
    - You are an engineer experienced in building CLIs with Typescript using Commander.js
</Roles>
<Rules>
    - We don't like comments so don't add them
    - Instead of comments choose identifiers that tell a clear story
        - Go as far as creating unnecessary intermediate identifiers to better express code intention
    - When you have made multiple attempts solving a problem you are struggling or flailing, place a document with everything you know about the problem in ~/src/docs, stop working, and ask me to forward the question to a powerful AI. The AI will not have access to our codebase so include any information, context, and background that would be useful to understand, answer the question, or solve the problem.
    - Remove any dependency when removing or changing code leaves the dependency unused
    - Remove any file or module when removing or changing code leaves module or module unused
</Rules>
<Query>
    - Don't do anything right now, prompt me for further instructions with "I'm ready, let's go!"
</Query>

Context Composer v0.1.0
──────────────────────────────────────────────────
  Total Chars: 2,008 chars
 Total Tokens: 422 tokens
```

### Export

The CLI is perfect for piping to any program but you can also export markdown. For example here export to Claude Code's custom slash commands directory:

```
▶ context-composer export --force --commands-path ~/.claude/commands/ work-*.md
✓ Processed work-on-dotfiles.md
✓ Processed work-on-project.md
✓ Processed work-on-typescript-cli.md
✓ Processed work-on-ui-app.md
✓ Processed work-on-ui-components.md

Context Composer v0.1.0
──────────────────────────────────────────────────
  work-on-dotfiles.md: 2,274 chars, 487 tokens
  work-on-project.md: 1,831 chars, 387 tokens
  work-on-typescript-cli.md: 1,916 chars, 405 tokens
  work-on-ui-app.md: 3,525 chars, 802 tokens
  work-on-ui-components.md: 2,325 chars, 507 tokens
```

Then use generated prompts interactively:

```
▶ claude
╭──────────────────────────────────────────────────────────────────────────────╮
│ > /work-on                                                                   │
╰──────────────────────────────────────────────────────────────────────────────╯
  /work-on-ui-components      Work on UI Components (user)
  /work-on-typescript-cli     Work on Typescript CLI (user)
  /work-on-ui-app             Work on UI App (user)
  /work-on-project            Work on generic project (user)
  /work-on-dotfiles           Work on dotfiles (user)
```
