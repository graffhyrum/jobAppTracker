# AGENTS.md

## Commands

```bash
# Development
bun run dev                    # Start dev server with watch
bun run build                  # Build for production

# Testing
bun test                       # Run all unit tests
bun test <file>               # Run single test file
bun test --coverage           # Unit tests with coverage
bun test:e2e                  # Headless E2E tests
bun test:e2e:ui               # Headed E2E tests
bun test:all                  # All tests (unit + E2E)

# Code Quality
bun vet                       # Full check (fix + typecheck + test:all)
bun lint                      # Lint with Biome
bun fix                       # Auto-fix linting issues
bun typecheck                 # TypeScript type checking
```

## Code Style

- **Indentation**: Tabs (configured in biome.json)
- **Quotes**: Double quotes for strings
- **Imports**: Auto-organize imports enabled
- **Architecture**: Hexagonal with dependency inversion
- **Error Handling**: NeverThrow Result types, no exceptions
- **Classes**: Use revealing modules, not ES6 class syntax
- **Validation**: ArkType schemas at boundaries
- **Testing**: Place tests next to source files (*.test.ts)
- **Type Safety**: Prefer `unknown` over `any`, use utility types

## Key Patterns

- Define ports in `src/domain/ports/`, implement adapters in infrastructure and tests
- Rich domain entities with behavior methods
- Pure functions over classes where possible
- Always return Result<T, E> or ResultAsync<T, E> from business logic

## Changesets

After completing a task successfully, use the @changeset-sync agent to generate changelog artifacts in `.changeset/` directory.