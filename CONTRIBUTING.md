# Contributing to Tab Cleanser

Thank you for your interest in contributing! Here's how you can help.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/tab-cleanser.git
   cd tab-cleanser
   ```

2. **Install dependencies**
   ```bash
   # Desktop app
   cd desktop && npm install
   
   # Browser extension
   cd ../extension && npm install
   ```

3. **Build and run**
   ```bash
   # Desktop app (requires Rust)
   cd desktop && npm run tauri dev
   
   # Extension
   cd extension && npm run build
   # Then load dist/ as unpacked extension in Chrome
   ```

## Workflow

### Branching Strategy

We use **GitHub Flow**:

1. `main` - Always deployable, protected
2. Feature branches - `feature/your-feature-name`
3. Bug fixes - `fix/bug-description`
4. Hotfixes - `hotfix/critical-issue`

### Making Changes

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes** with clear, atomic commits
4. **Test** your changes locally
5. **Push** to your fork:
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request** with a clear description

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(extension): add tab grouping support
fix(ai): respect user-configured batch size
docs: update installation instructions
```

## Pull Request Guidelines

- Keep PRs focused and small
- Include tests for new features
- Update documentation if needed
- Ensure all checks pass
- Request review from maintainers

## Code Style

- **TypeScript**: Use strict mode, prefer const over let
- **Rust**: Follow rustfmt conventions, run `cargo clippy`
- **Comments**: Explain "why" not "what"

## Reporting Issues

- Use the issue templates
- Include reproduction steps
- Attach screenshots if relevant
- Mention your OS and browser version

## Questions?

Open a Discussion or reach out to maintainers.

Thank you for contributing! 🎉
