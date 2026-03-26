# Hexagonal Architecture Guide

This document describes how this repository implements **Hexagonal Architecture** (also known as Ports & Adapters) in practice. It covers the mental model, folder structure, layer responsibilities, and common patterns used across the codebase.

---

## Table of Contents

1. [Core Concept](#1-core-concept)
2. [Bounded Contexts & Features](#2-bounded-contexts--features)
3. [Global Folder Semantics](#3-global-folder-semantics)
4. [Feature Structure](#4-feature-structure)
5. [Layer Responsibilities](#5-layer-responsibilities)
6. [Ports & Adapters Pattern](#6-ports--adapters-pattern)
7. [Primary vs Secondary Adapters](#7-primary-vs-secondary-adapters)
8. [Exception Handling](#8-exception-handling)
9. [Request Lifecycle](#9-request-lifecycle)
10. [Multi-Tenancy & RLS](#10-multi-tenancy--rls)
11. [Soft Delete Pattern](#11-soft-delete-pattern)
12. [Database & Migrations](#12-database--migrations)
13. [Shared Kernel Guidelines](#13-shared-kernel-guidelines)
14. [Adding a New Feature](#14-adding-a-new-feature)
15. [Adding a New Table](#15-adding-a-new-table)
16. [Contributor Rules](#16-contributor-rules)
17. [Breaking the Architecture](#17-breaking-the-architecture)
18. [Quality Gates](#18-quality-gates)

---

## 1. Core Concept

The core principle: **dependencies must point inward**.

```plain
┌─────────────────────────────────────────────────────────────┐
│                        PRESENTATION                          │
│                    (Primary / Driving)                       │
│                   Receives HTTP requests                     │
└────────────────────────────┬────────────────────────────────┘
                             │ calls
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                         APPLICATION                          │
│                    Use Cases & Orchestration                 │
└────────────────────────────┬────────────────────────────────┘
                             │ calls
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                            DOMAIN                            │
│                      (Core / Business)                       │
│                   Pure logic, no dependencies                │
└─────────────────────────────────────────────────────────────┘
                             ▲
                             │ implements
┌─────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE                         │
│                  (Secondary / Driven)                        │
│                   Database, External Services                │
└─────────────────────────────────────────────────────────────┘
```

### Layer responsibilities

| Layer            | Responsibility                         | Knows about                   |
| ---------------- | -------------------------------------- | ----------------------------- |
| `domain`         | Business rules, entities, domain ports | Nothing external              |
| `application`    | Use cases, orchestration               | Domain                        |
| `infrastructure` | Persistence, external services         | Domain, databases, frameworks |
| `presentation`   | HTTP adapters, DTOs                    | Application                   |

### Dependency rules

```plain
presentation  ──►  application  ──►  domain
infrastructure ──►  domain
```

**Note:** The `infrastructure ──►  domain` arrow means infrastructure **depends on domain** to know which interfaces it must implement. However, domain is completely unaware that infrastructure exists. This is the essence of hexagonal architecture: the core has no knowledge of its outer layers.

**Forbidden:** Domain must not import NestJS, TypeORM, Express, or any database framework.

---

## 2. Bounded Contexts & Features

This project uses two bounded contexts:

- **`iam`** — Identity & Access Management
- **`observability`** — HTTP logging and monitoring

### IAM Features

- `auth` — Authentication flows
- `users` — User lifecycle management
- `organizations` — Organization management

### Observability Features

- `http-logs` — HTTP request/response logging

### Shared Kernels

- `src/modules/iam/shared` — Contracts shared within IAM (e.g., password hashing, IAM exceptions)
- `src/shared` — Cross-context primitives (e.g., generic pagination, base exceptions)

> **Rule:** Shared kernels exist only for concepts genuinely reused by multiple features. Do not create fake shared folders.

---

## 3. Global Folder Semantics

### `src/common`

Technical cross-cutting concerns only. **Never put business rules here.**

Examples: HTTP filters, tracing, tenant context, interceptors, database subscribers

### `src/shared`

Global shared kernel across bounded contexts.

Examples: generic pagination primitive, base domain exception class, generic HTTP contracts

### `src/modules/iam/shared`

IAM-specific shared kernel.

Examples: IAM business exceptions, password hasher contract shared by `auth` and `users`

---

## 4. Feature Structure

A feature module follows this shape:

```plain
<feature>/
├── application/
│   ├── ports/
│   │   └── *.token.ts           (DI symbols)
│   └── use-cases/
│       └── *.use-case.ts
├── domain/
│   ├── entities/
│   │   └── *.entity.ts
│   ├── ports/
│   │   └── *.port.ts            (interfaces)
│   └── exceptions/
│       └── *.exception.ts
├── infrastructure/
│   └── persistence/
│       └── typeorm/
│           ├── entities/
│           ├── mappers/
│           └── repositories/
├── presentation/
│   ├── controllers/
│   │   └── *.controller.ts
│   └── dto/
│       ├── *.request.dto.ts
│       └── *.response.dto.ts
└── <feature>.module.ts
```

> **Rule:** Create folders only when they are needed. Empty folders indicate a missing abstraction.

---

## 5. Layer Responsibilities

### Domain

**Allowed:**

- Entities (pure classes with business logic)
- Value objects
- Invariants
- Domain ports (interfaces)
- Domain exceptions

**Forbidden:**

- `@Injectable()`
- `@Entity()`
- `Repository`
- HTTP `Request` / `Response`
- NestJS exceptions (`ConflictException`, `NotFoundException`, etc.)

### Application

**Allowed:**

- Use case orchestration
- Calling domain ports
- Coordinating domain objects
- Deciding which business exception to throw
- Port tokens (DI symbols like `USER_REPOSITORY_TOKEN`)

**Forbidden:**

- SQL or database queries
- Direct TypeORM repository access
- HTTP response formatting

### Infrastructure

**Allowed:**

- ORM entities (`@Entity()`, `@Column()`, etc.)
- Repository adapters (implementations of domain ports)
- Adapter implementations (e.g., `BcryptPasswordHasherAdapter`, `JwtServiceAdapter`)
- Persistence transactions
- Tenant/RLS database plumbing

> **Note:** Only **implementations** go here. **Ports** (interfaces) go in Domain, and **tokens** (DI symbols) go in Application.

### Presentation

**Allowed:**

- Controllers
- DTO validation (class-validator decorators)
- Guards
- Translating HTTP input to use case commands (mapping DTOs to plain command objects)

> **Note:** Presentation adapters are **primary (driving)** — they receive incoming requests and call the application layer.

**Forbidden:**

- Business rules that belong in domain or application

**Recommended:**

- Mapping DTOs to plain command objects before calling use cases (keeps application layer free of presentation decorators)

---

## 6. Ports & Adapters Pattern

This project distinguishes between two types of ports:

### Domain Ports (Interfaces)

Define the behavior the core needs. Live in `domain/ports/`.

```typescript
// domain/ports/user.repository.port.ts
export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  create(props: CreateUserProps & { id: string }): Promise<User>;
  // ...
}
```

### Application Port Tokens (DI Symbols)

Injection tokens used by NestJS to wire implementations. Live in `application/ports/`.

```typescript
// application/ports/user-repository.token.ts
export const USER_REPOSITORY_TOKEN = Symbol('USER_REPOSITORY_TOKEN');
```

### How They Connect

```plain
┌─────────────────────────────────────────────────────────────┐
│                      Use Case                               │
│   constructor(                                              │
│     @Inject(USER_REPOSITORY_TOKEN)                         │
│     private readonly repo: UserRepositoryPort              │
│   ) {}                                                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ injects (port interface)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 UserTypeOrmRepository                       │
│   implements UserRepositoryPort                             │
└─────────────────────────────────────────────────────────────┘
```

The **token** tells NestJS which **implementation** to inject for the **port**.

> **Rule:** Tokens must not live in `*.module.ts`. Keep them in `application/ports/`.

### Quick Reference

| Component               | Location                      | What it is                                    |
| ----------------------- | ----------------------------- | --------------------------------------------- |
| `UserRepositoryPort`    | `domain/ports/`               | Interface defining `findById`, `create`, etc. |
| `USER_REPOSITORY_TOKEN` | `application/ports/`          | DI symbol for NestJS injection                |
| `UserTypeOrmRepository` | `infrastructure/persistence/` | Implementation using TypeORM                  |

| Component                     | Location                   | What it is                           |
| ----------------------------- | -------------------------- | ------------------------------------ |
| `PasswordHasherPort`          | `domain/ports/`            | Interface defining `hash`, `compare` |
| `PASSWORD_HASHER_PORT`        | `application/ports/`       | DI symbol for NestJS injection       |
| `BcryptPasswordHasherAdapter` | `infrastructure/adapters/` | Implementation using bcrypt          |

---

## 7. Primary vs Secondary Adapters

### Primary (Driving) Adapters — Presentation

Receive incoming requests and call the application layer.

```plain
HTTP Request → Controller → Use Case → ...
```

Examples: REST controllers, GraphQL resolvers, CLI commands, message handlers

### Secondary (Driven) Adapters — Infrastructure

Are called by the application to perform tasks.

```plain
... → Use Case → Repository → Database
... → Use Case → EmailService → SMTP
```

Examples: TypeORM repositories, Redis caches, external API clients (Stripe, SendGrid)

### Why the Names?

Hexagonal Architecture (Alistair Cockburn) originally used "sides":

- **Left side:** Primary (initiates the action)
- **Right side:** Secondary (responds to the action)

### When to Add Subfolders Inside Presentation?

Adding `api` or `http` inside `presentation` is **redundant** if your only exposure is REST:

```plain
presentation/
  ├── controllers/
  └── dto/
```

> `presentation` already implies exposure. Saying `presentation/api/controllers` repeats concepts.

**Only add subfolders if you expose the application multiple ways:**

```plain
presentation/
  ├── http/              (REST API)
  ├── grpc/              (Microservices)
  └── cli/               (Terminal commands)
```

### Where Do DTOs Belong?

DTOs belong in **Presentation** — they are the contract between the client and your API. If the frontend changes a field name, only `presentation/dto` should change.

### Mappers: Location & Purpose

Mappers are the "glue" that prevents your database from contaminating your domain. They transform **TypeORM entities** (with database decorators) into **domain entities** (pure classes).

#### Why inside `persistence`?

1. **Cohesion:** The mapper only exists because TypeORM exists. If you switch to MongoDB, the TypeORM mapper dies.
2. **Encapsulation:** The application layer should not know mappers exist. The repository uses them internally.

#### Golden Rule

> "The Mapper belongs to whoever knows both sides of the coin."

- Domain does **not** know about the database
- Application does **not** know about the database
- Infrastructure knows the database **and** the domain

**Conclusion:** The mapper lives in **Infrastructure**, next to the persistence technology it transforms.

#### When to Move Mappers Outside `persistence`?

Only for non-database transformations, e.g., `infrastructure/external-services/stripe/mappers/StripeResponseMapper.ts`.

#### Complete Flow

```plain
1. Controller receives CreateUserDto (presentation)
2. Controller maps DTO to RegisterUserCommand (plain object/interface)
3. Use Case receives RegisterUserCommand, creates User domain entity (application)
4. Repository receives User entity
5. Repository uses UserMapper to transform User → UserTypeOrmEntity
6. UserTypeOrmEntity is saved to database
```

```plain
Controller (Presentation)
  │ receives DTO
  ▼
Controller maps DTO → RegisterUserCommand
  │
  ▼ (plain command, no decorators)
Use Case (Application)
  │ creates domain entity
  ▼
Repository (Infrastructure)
  │ uses mapper
  ▼
UserMapper (persistence/typeorm)
  │ transforms
  ▼
UserTypeOrmEntity ──► PostgreSQL
```

#### Why map DTO to Command? (Recommended Practice)

**Note:** This is a recommended practice, not a strict rule. Many hexagonal projects pass DTOs directly to use cases successfully.

**Reason:** DTOs may contain `class-validator` decorators, which are presentation concerns. Mapping to a plain command keeps the application layer free of presentation dependencies.

**When to skip:** For simple CRUD endpoints where the overhead is not worth it.

```typescript
// presentation/controllers/users.controller.ts
async register(@Body() dto: RegisterUserDto) {
  const command: RegisterUserCommand = {
    email: dto.email,
    password: dto.password,
    firstName: dto.firstName,
    lastName: dto.lastName,
  };
  return this.registerUserUseCase.execute(command);
}
```

```typescript
// application/use-cases/register-user.use-case.ts
interface RegisterUserCommand {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

async execute(command: RegisterUserCommand): Promise<User> {
  // command is a plain object, no decorators
  // ...
}
```

---

## 8. Exception Handling

### Domain Exceptions vs NestJS Exceptions

**Inside domain and application layers, throw business exceptions:**

```typescript
// domain/exceptions/user-already-exists.exception.ts
export class UserAlreadyExistsException extends DomainException {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
  }
}
```

**Forbidden inside core logic:**

- `ConflictException`
- `NotFoundException`
- `UnauthorizedException`

### Why?

- NestJS exceptions are HTTP concerns
- Domain and application should remain reusable outside HTTP (CLI, queues, tests)
- The presentation layer maps domain exceptions to RFC 7807 Problem Details responses

### Exception Mapping

```plain
Use Case throws UserNotFoundException
        │
        ▼
Exception Filter catches it
        │
        ▼
Maps to HTTP 404 with RFC 7807 body
```

---

## 9. Request Lifecycle

For a typical authenticated request:

```plain
1. Tracing middleware adds x-trace-id
2. Controller validates DTO with class-validator
3. JWT Guard authenticates request
4. Tenant Interceptor validates organization membership
5. Use Case executes business logic
6. Repository adapter queries PostgreSQL
7. Domain exceptions map to RFC 7807 responses
8. HTTP logs persist for both success and error responses
```

### API Versioning

The project uses NestJS native URI versioning:

- Global prefix: `/api`
- Versioning type: `URI`
- Current version: `v1`

Routes are exposed as:

- `/api/v1/users`
- `/api/v1/auth/login`
- `/api/v1/http-logs`

---

## 10. Multi-Tenancy & RLS

### How It Works

1. PostgreSQL migration enables **Row-Level Security (RLS)** on tenant-scoped tables
2. Policies depend on `app.current_organization_id`
3. Request lifecycle validates the effective tenant before storing in request context
4. Repository opens a transaction and sets the local DB role + session setting
5. Database enforces tenant filtering automatically

### Current Tenant-Scoped Table

`members` — links users to organizations with roles

### Requirements for New Tenant-Scoped Tables

If you add another tenant-scoped table, you must:

- Add schema changes (RLS enablement)
- Add PostgreSQL policies
- Add repository transaction/session setup
- Add tests

### HTTP Logs Access

- Requires authentication
- Requires `x-organization-id` header
- Requires privileged role (`owner`, `admin`, or `manager`)

Repository filtering uses the **validated effective tenant** from request context, not the raw header value.

---

## 11. Soft Delete Pattern

### Aggregates Using Soft Delete

- `users`
- `organizations`

### Implementation

**Domain entity** exposes:

```typescript
softDelete(): User
restore(): User
```

**TypeORM entity** uses:

```typescript
@DeleteDateColumn()
deletedAt: Date | null;
```

**Repository** uses:

```typescript
softDelete(id: string): Promise<void>
restore(id: string): Promise<User>
```

---

## 12. Database & Migrations

Hexagonal architecture does not eliminate the need for disciplined database lifecycle management.

### Environments

- **Development:** `.env`
- **Tests:** `.env.test`

### Rules

- Schema changes must happen through **migrations**, never `synchronize: true`
- Each migration should be reversible
- See [Database Workflow](./database-workflow.md) for operational details

---

## 13. Shared Kernel Guidelines

### What Belongs Where

| Location                 | Contents                                                          |
| ------------------------ | ----------------------------------------------------------------- |
| `src/shared`             | Generic pagination, base exception class, cross-context contracts |
| `src/modules/iam/shared` | IAM exceptions, password hasher contract                          |
| `src/common`             | Technical concerns (tracing, tenant context, RFC 7807 mapping)    |

### Feature-Local Items (Do Not Share)

- `UserResponseDto`
- `OrganizationResponseDto`
- `HttpLogResponseDto`

Only promote to shared when they become genuinely cross-context contracts.

---

## 14. Adding a New Feature

Follow this order:

### Step 1: Create the Feature Folder

```plain
src/modules/iam/invitations/
```

### Step 2: Model the Domain

Start with:

- Entity (aggregate root)
- Value objects (if needed)
- Repository port (interface)
- Domain exceptions

### Step 3: Add Use Cases

Typical first use cases:

- `create`
- `getById`
- `paginate`
- `delete` / `restore` (if lifecycle requires soft delete)

### Step 4: Implement Adapters

- TypeORM entity
- Mapper
- Repository adapter (implements the domain port)

### Step 5: Expose HTTP

- Request DTOs
- Controller methods
- Guards (if needed)

### Step 6: Register Module

In `<feature>.module.ts`:

- `TypeOrmModule.forFeature([...entities])`
- Providers (use cases, repository adapter)
- Controllers
- Exports (only when needed)

### Step 7: Add Migrations

If schema changes occur, create a migration.

### Step 8: Add Tests

Minimum:

- Domain test for invariants
- Use case test where risk is non-trivial
- E2E test if public API changes

---

## 15. Adding a New Table

Before adding a table, answer:

1. Is it an aggregate root or a child entity?
2. Is it tenant-scoped?
3. Does it need soft delete?
4. Does it require unique constraints?
5. Does it require RLS?

Then implement:

- TypeORM entity
- Migration
- Indexes
- Foreign keys
- Delete strategy
- Tests

---

## 16. Contributor Rules

- Prefer adding code where the concept already belongs instead of creating new shared folders
- Keep modules thin and compositional
- Keep domain immutable where practical
- **Do not let controllers call TypeORM directly**
- **Do not let repositories return ORM entities to use cases**
- Map persistence entities to domain entities explicitly
- Avoid empty folders (they indicate a missing abstraction)

---

## 17. Breaking the Architecture

You likely broke hexagonal architecture if:

- A domain file imports NestJS or TypeORM
- A use case imports a repository adapter directly
- A controller contains business branching logic
- A business exception becomes a NestJS HTTP exception inside core logic
- A module file becomes the only place where tokens/contracts exist
- `common` starts collecting business concepts

---

## 18. Quality Gates

Before merging or releasing, run:

```bash
npm run lint
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

If schema behavior matters, also verify migrations and RLS behavior through the PostgreSQL-backed e2e suite.

---

Last updated: 2026-03-26
