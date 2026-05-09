# VBoard Coding Conventions

This directory is the **authoritative reference** for code patterns, naming conventions, and architectural decisions in the VBoard codebase. Every pattern documented here reflects actual code in the repository — not aspirational guidelines.

## When to Use These Docs

- **Adding a new feature** → Start with [Feature Guide](./feature-guide.md)
- **Wondering how to name something** → [Naming Conventions](./naming.md)
- **Writing domain logic** → [Domain Layer](./domain-layer.md)
- **Writing use cases** → [Application Layer](./application-layer.md)
- **Writing DB/infrastructure code** → [Infrastructure Layer](./infrastructure-layer.md)
- **Writing HTTP/WebSocket handlers** → [Presentation Layer](./presentation-layer.md)
- **Writing tests** → [Testing](./testing.md)
- **General code style questions** → [Style Guide](./style.md)
- **Understanding the monorepo layout** → [Project Structure](./project-structure.md)

## Architecture Overview

VBoard uses **Feature-First Clean Architecture** — code is organized by business feature (`board`, `todo`, etc.), and each feature follows a strict 4-layer pattern:

```
Domain → Application → Infrastructure → Presentation
```

Dependencies flow inward. The domain layer has zero knowledge of databases, HTTP, or frameworks. See [Project Structure](./project-structure.md) for the full layout.

## Reference Documents

| Document                                          | Description                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| [Project Structure](./project-structure.md)       | Monorepo layout, package responsibilities, dependency graph             |
| [Feature Guide](./feature-guide.md)               | Step-by-step guide for adding a new feature (with copy-paste templates) |
| [Naming Conventions](./naming.md)                 | File, class, type, variable, and directory naming                       |
| [Domain Layer](./domain-layer.md)                 | Entities, value objects, errors, branded types, factory pattern         |
| [Application Layer](./application-layer.md)       | Ports, DTOs, use cases (queries/commands), UoW, Result handling         |
| [Infrastructure Layer](./infrastructure-layer.md) | Drizzle repositories, mappers, transaction context                      |
| [Presentation Layer](./presentation-layer.md)     | Controllers, Zod schemas, auth macros, error→HTTP mapping               |
| [Testing](./testing.md)                           | Test structure, mocks, coverage thresholds, testing patterns            |
| [Style Guide](./style.md)                         | Import order, type imports, comments, TypeScript config, exports        |
