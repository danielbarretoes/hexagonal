# Hexagonal IAM Template

Reusable NestJS IAM foundation built with a strict hexagonal style.

It currently includes:

- `users`, `organizations`, and `auth` as explicit IAM features
- strict `domain -> application -> infrastructure/presentation` boundaries
- RFC 7807 problem details with `traceId`
- TypeORM adapters, PostgreSQL migrations, and real e2e tests
- JWT auth with password hashing
- soft delete + restore for `users` and `organizations`
- PostgreSQL RLS foundation for tenant-scoped `members`
- AsyncLocalStorage tenant context for request-scoped tenant propagation

## Project Map

```text
src/
├── app.module.ts
├── app.setup.ts
├── common/                         # technical cross-cutting concerns only
│   ├── http/
│   ├── infrastructure/
│   ├── observability/
│   └── tenant/
├── config/                         # runtime/framework configuration
│   ├── auth/
│   └── database/
├── database/
│   └── migrations/
├── modules/
│   └── iam/
│       ├── auth/
│       ├── organizations/
│       ├── users/
│       └── shared/                 # shared kernel inside IAM
└── shared/                         # global shared kernel
    ├── contracts/
    └── domain/
test/
├── app.e2e-spec.ts
├── rls.e2e-spec.ts
└── support/
```

## How The Project Works

### Request flow

1. HTTP request enters Nest controller in `presentation`
2. Controller validates DTO and calls a use case in `application`
3. Use case orchestrates business behavior using ports
4. Infrastructure adapters implement those ports with TypeORM, bcrypt, JWT, etc.
5. Domain objects stay framework-free
6. Errors are translated to RFC 7807 in the global HTTP filter

### Layer responsibilities

`domain`

- entities
- value objects
- domain ports
- domain exceptions
- no Nest, no TypeORM, no Express

`application`

- use cases
- application port tokens
- orchestration only
- can depend on domain and shared contracts

`infrastructure`

- TypeORM entities
- repository adapters
- security adapters
- external implementation details

`presentation`

- controllers
- request DTOs
- guards
- HTTP transport concerns

## Shared vs Common

`src/shared`

- global shared kernel
- reusable across bounded contexts

`src/modules/iam/shared`

- shared kernel only inside IAM
- reusable between `auth`, `users`, and `organizations`

`src/common`

- technical cross-cutting concerns
- HTTP filters, tracing, tenant context, interceptors, database subscribers
- never business rules

## Current IAM Design

### Users

- registration
- login
- paginated listing
- get by id
- soft delete
- restore

### Organizations

- create
- get by id
- paginated listing
- soft delete
- restore

### Auth

- JWT access token
- bcrypt password hashing
- JWT guard

### Memberships

- link user to organization
- tenant-scoped role value object
- PostgreSQL RLS on `members`

## Database Workflow

Commands:

- `npm run db:migrate`
- `npm run db:migrate:revert`
- `npm run db:migrate:show`

Key rules:

- prefer migrations over `synchronize`
- `DB_MIGRATIONS_RUN=true` lets runtime bootstrap from migrations
- e2e tests rebuild schema from migrations
- RLS currently applies to `members`, which is the tenant-scoped table in the current model

## Quality Gates

Run all of these before considering work complete:

- `npm run lint`
- `npm run build`
- `npm test -- --runInBand`
- `npm run test:e2e -- --runInBand`

## Adding A New Feature

When adding a new IAM feature such as `roles`, `invitations`, or `sessions`, follow this order:

1. Create the feature folder under `src/modules/iam/<feature>`
2. Model the domain first:
   - entities
   - value objects
   - domain ports
   - domain exceptions if needed
3. Add use cases in `application/use-cases`
4. Add DI tokens in `application/ports`
5. Implement adapters in `infrastructure`
6. Expose endpoints in `presentation`
7. Register everything in `<feature>.module.ts`
8. Add migration if schema changes
9. Add unit tests and e2e coverage

Do not:

- import Nest or TypeORM in domain
- put tokens inside `*.module.ts`
- put business rules in `common`
- create empty folders “for the future”
- bypass ports by importing adapters directly into use cases

## Adding A New Use Case To An Existing Feature

Checklist:

1. Decide if the rule belongs in domain or application orchestration
2. If persistence is needed, extend the domain port first
3. Update the infrastructure adapter implementing that port
4. Add the use case
5. Add or extend DTO/controller if exposed by HTTP
6. Add tests at the right level:
   - domain test for business rule
   - use case test if orchestration is non-trivial
   - e2e test if HTTP contract changes

## Multi-Tenancy Rules

- tenant context comes from request lifecycle
- `members` uses PostgreSQL RLS with `app.current_organization_id`
- repository code sets tenant context before tenant-scoped member queries
- if you add a new tenant-scoped table, extend migrations and repository code with the same pattern

## Error Handling Rules

Use domain exceptions in domain/application, not Nest HTTP exceptions.

Why:

- domain stays transport-agnostic
- HTTP is only one delivery mechanism
- the global filter maps business exceptions to RFC 7807 responses

So this is correct:

- `throw new UserAlreadyExistsException(email)`

And this is not correct inside domain/application:

- `throw new ConflictException(...)`

## Recommended Next Evolutions

If you want to push this template further:

- add richer value objects such as `Email` and `OrganizationName`
- add refresh tokens / sessions
- add more tenant-scoped tables with RLS
- add architecture tests beyond ESLint if desired
