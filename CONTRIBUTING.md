# Contributing to Nexus CLI

Thank you for your interest in contributing to Nexus CLI! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/nexus-cli.git
   cd nexus-cli
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/adverant/nexus-cli.git
   ```

## Development Setup

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Git

### Installation

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Start development mode
npm run dev:cli
```

### Environment Configuration

1. Copy `.env.example` to `.env`
2. Configure your local Adverant-Nexus instance connection:
   ```env
   NEXUS_API_URL=http://localhost:9092
   NEXUS_WS_URL=ws://localhost:9093
   ```

## Project Structure

```
nexus-cli/
├── packages/
│   ├── cli/              # Main CLI application
│   ├── sdk/              # Plugin SDK
│   └── types/            # Shared TypeScript types
├── examples/             # Example plugins and workflows
├── docs/                 # Documentation
├── .github/              # GitHub Actions and templates
└── scripts/              # Build and deployment scripts
```

## Development Workflow

### Creating a Feature Branch

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in the appropriate package
2. Add tests for new functionality
3. Update documentation as needed
4. Run linting and tests locally:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```

### Keeping Your Branch Updated

```bash
# Fetch upstream changes
git fetch upstream

# Rebase your branch on upstream/main
git rebase upstream/main
```

## Coding Standards

### TypeScript

- **Strict Mode**: All TypeScript must compile with strict mode enabled
- **Type Safety**: Avoid `any` types; use proper type annotations
- **No Unused Imports**: Remove all unused imports
- **Naming Conventions**:
  - Classes: `PascalCase`
  - Functions/Variables: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Interfaces: `PascalCase` (prefix with `I` only if necessary)
  - Types: `PascalCase`

### Code Style

- **Line Length**: Maximum 100 characters
- **Indentation**: 2 spaces (enforced by Prettier)
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Trailing Commas**: Always use in multi-line structures

### Documentation

- **TSDoc Comments**: All public APIs must have TSDoc comments
- **Complex Logic**: Add inline comments explaining why, not what
- **Examples**: Include usage examples in TSDoc when helpful

Example:
```typescript
/**
 * Executes a command with the given context and returns the result.
 *
 * @param command - The command string to execute
 * @param context - Execution context including auth, config, and state
 * @returns Promise resolving to command execution result
 * @throws {CommandExecutionError} If command execution fails
 *
 * @example
 * ```typescript
 * const result = await executor.execute('services health', context);
 * console.log(result.data);
 * ```
 */
async execute(command: string, context: CommandContext): Promise<CommandResult> {
  // Implementation
}
```

## Testing Guidelines

### Test Structure

- **Unit Tests**: Test individual functions/classes in isolation
- **Integration Tests**: Test interactions between components
- **E2E Tests**: Test complete user workflows

### Writing Tests

```typescript
// Good: Descriptive test names
describe('CommandRouter', () => {
  describe('route()', () => {
    it('should route service commands to ServiceHandler', async () => {
      // Test implementation
    });

    it('should throw ValidationError for invalid commands', async () => {
      // Test implementation
    });
  });
});
```

### Test Coverage

- Minimum 60% coverage for new code
- 80%+ coverage for critical paths
- 100% coverage for security-related code

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.spec.ts
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without feature changes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `ci`: CI/CD configuration changes

### Examples

```bash
# Feature
feat(cli): add workflow template support

Implement YAML-based workflow templates with parameter substitution
and step execution.

Closes #123

# Bug fix
fix(discovery): handle services with missing health endpoints

Services without /health endpoint now gracefully degrade to
UNKNOWN status instead of throwing errors.

Fixes #456

# Breaking change
feat(api)!: change command execution return type

BREAKING CHANGE: CommandResult.data is now typed based on command
response instead of always being `any`.
```

## Pull Request Process

### Before Submitting

1. **Rebase on main**: Ensure your branch is up to date
2. **Run tests**: All tests must pass
3. **Run linting**: Code must pass linting
4. **Update docs**: Include documentation changes
5. **Self-review**: Review your own changes first

### PR Title

Follow the same format as commit messages:
```
feat(cli): add workflow template support
```

### PR Description

Use the PR template provided. Include:

- **Description**: Clear explanation of changes
- **Motivation**: Why is this change needed?
- **Type of Change**: Feature, bug fix, breaking change, etc.
- **Testing**: How was this tested?
- **Screenshots**: If UI changes (for TUI features)
- **Checklist**: Ensure all items are checked

### Review Process

1. **Automated Checks**: CI/CD must pass
2. **Code Review**: At least one maintainer approval required
3. **Testing**: Verify tests cover new functionality
4. **Documentation**: Ensure docs are updated
5. **Breaking Changes**: Must be clearly documented

### Addressing Feedback

- **Be Responsive**: Respond to comments within 48 hours
- **Be Open**: Consider all feedback objectively
- **Update PR**: Push fixes to the same branch
- **Re-request Review**: After addressing all comments

## Release Process

Releases are handled by maintainers. The process is:

1. Update CHANGELOG.md
2. Bump version in package.json files
3. Create git tag
4. Publish to NPM registry
5. Create GitHub release with notes

## Questions or Issues?

- **Bugs**: [Create an issue](https://github.com/adverant/nexus-cli/issues/new?template=bug_report.md)
- **Features**: [Create an issue](https://github.com/adverant/nexus-cli/issues/new?template=feature_request.md)
- **Discussions**: [GitHub Discussions](https://github.com/adverant/nexus-cli/discussions)
- **Security**: See [SECURITY.md](SECURITY.md) for vulnerability reporting

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Nexus CLI!** 🚀
