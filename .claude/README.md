# Claude Code Configuration

This directory contains configuration for Claude Code features.

## Directory Structure

- `commands/` - Custom slash commands that extend Claude Code functionality
- `hooks/` - Shell scripts that run at specific points in the Claude Code lifecycle

## Getting Started

### Custom Commands

Create markdown files in `commands/` to define custom slash commands:

```markdown
# Example: commands/review.md
Review the current file for potential improvements and bugs.
```

Then use it with `/review` in the chat.

### Hooks

Create executable shell scripts in `hooks/` to run at specific events:

- `user-prompt-submit-hook.sh` - Runs before each user message is sent

Example:
```bash
#!/bin/bash
# hooks/user-prompt-submit-hook.sh
echo "User submitted a prompt"
```

Make hooks executable:
```bash
chmod +x .claude/hooks/user-prompt-submit-hook.sh
```

## Learn More

- [Claude Code Documentation](https://github.com/anthropics/claude-code)
- [Custom Commands Guide](https://github.com/anthropics/claude-code/blob/main/docs/custom-commands.md)
- [Hooks Guide](https://github.com/anthropics/claude-code/blob/main/docs/hooks.md)
