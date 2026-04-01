# Scaling Hexagonal Architecture

This document covers real production risks, senior-level improvements, and elite patterns to consider as your hexagonal architecture grows.

---

## Table of Contents

1. [Real Production Risks](#1-real-production-risks)
2. [Senior-Level Improvements](#2-senior-level-improvements)
3. [Top 1% Patterns](#3-top-1-patterns)

---

## 1. Real Production Risks

This document is intentionally about **scaling paths**, not the mandatory baseline for the template. A strong template should stay small and teachable first.

### 1.1 Missing "Application Services vs Use Cases"

**Current structure:**

```plain
application/
  use-cases/
```

**Problem:** As you scale, you'll have fine-grained use cases but shared logic between them.

**Risk:** Code duplication or logic placed in the wrong layer.

**Solution:** When scaling, introduce:

```plain
application/
  services/
    user-domain.service.ts
```

Use for:

- Reusable logic across use cases
- Complex orchestration
- Cross-cutting operations

---

### 1.2 Missing Domain Events

Domain events are not currently implemented.

**When you'll need them:**

- Audit logs
- Notifications
- Integrations with external systems
- Decoupling modules

**Examples:**

```typescript
// domain/events/user-registered.event.ts
export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly occurredAt: Date,
  ) {}
}
```

**Then in infrastructure:**

```typescript
// infrastructure/event-handlers/user-registered.handler.ts
@EventHandler(UserRegisteredEvent)
class SendWelcomeEmailHandler {
  async handle(event: UserRegisteredEvent) {
    // send email, notify external systems, etc.
  }
}
```

**Without this:** Use cases will couple to each other.

---

### 1.3 Transactions at Application Level

Transactions are not clearly defined at the application layer.

**Current state:** Repository opens transactions.

**Problem:** If a use case uses 2 repositories, you risk inconsistency.

**Recommendation:** Define explicitly:

```plain
application/
  ports/
    unit-of-work.port.ts
```

```typescript
// domain/ports/unit-of-work.port.ts
export interface UnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
```

```typescript
// infrastructure/persistence/typeorm/unit-of-work/typeorm-unit-of-work.adapter.ts
export class TypeOrmUnitOfWork implements UnitOfWork {
  async begin(): Promise<void> {
    this.transaction = await this.connection.startTransaction();
  }
  // ...
}
```

**This is critical in complex systems.**

---

### 1.4 DTO → Command (Be Consistent)

DTO → Command mapping is marked as "recommended but optional".

**Real risk:** Inconsistency across endpoints.

- Some use DTOs directly
- Others use commands
- No clear rule

**Recommendation:** Pick one:

1. **Always use commands** — strict consistency
2. **Only use commands for complex cases** — pragmatic approach

**Whatever you choose:** Do not mix arbitrarily.

---

### 1.5 Missing Anti-Corruption Layer (ACL)

When integrating external systems (Stripe, APIs, legacy services):

**Without ACL:** Domain gets contaminated with external concepts.

**Recommended structure:**

```plain
infrastructure/
  external/
    stripe/
      stripe.client.ts
      stripe.mapper.ts
      stripe.acl.ts
```

**ACL responsibility:**

```typescript
// infrastructure/external/stripe/stripe.acl.ts
export class StripeAcl {
  async charge(amount: Money, customerId: StripeCustomerId): Promise<ChargeResult> {
    // Translate domain concepts to Stripe API
    // Translate Stripe responses to domain concepts
  }
}
```

This keeps your domain pure and independent of external systems.

---

## 2. Senior-Level Improvements

### 2.1 Explicit Value Objects

Value objects are not fully developed.

**Examples:**

```typescript
// domain/value-objects/email.vo.ts
export class Email {
  private constructor(private readonly value: string) {}

  static create(email: string): Email {
    if (!isValidEmail(email)) {
      throw new InvalidEmailException(email);
    }
    return new Email(email.toLowerCase().trim());
  }

  get value(): string {
    return this.value;
  }
}
```

**Benefits:**

- Centralized validation
- Fewer bugs
- Richer domain model
- Immutable by default

**Other value objects to consider:**

```plain
domain/
  value-objects/
    email.vo.ts
    user-id.vo.ts
    organization-id.vo.ts
    money.vo.ts
```

---

### 2.2 Strong Typing for IDs

**Current state:** `id: string`

**Problem:** You can accidentally mix IDs of different entities.

**Solution:**

```typescript
// domain/value-objects/user-id.vo.ts
export class UserId {
  private readonly _brand: unique symbol;
  private constructor(public readonly value: string) {}

  static create(id: string): UserId {
    if (!isValidUUID(id)) {
      throw new InvalidIdException(id);
    }
    return new UserId(id);
  }

  static create(): UserId {
    return new UserId(crypto.randomUUID());
  }
}

// Type alias for convenience
export type UserId = Readonly<{ value: string }>;
```

**Usage:**

```typescript
// Prevents mixing IDs
function findUser(userId: UserId): Promise<User | null>;
function findOrganization(orgId: OrganizationId): Promise<Organization | null>;

// This would be a compile error:
// findUser(orgId)  // ❌ OrganizationId is not UserId
```

---

### 2.3 Base Use Case Pattern

Standardize use cases with an abstract base:

```typescript
// application/use-cases/base.use-case.ts
export abstract class UseCase<I extends object, O> {
  abstract execute(input: I): Promise<O>;

  protected async run(input: I): Promise<O> {
    // Centralized logging
    // Tracing
    // Validation
    return this.execute(input);
  }
}
```

**Benefits:**

- Consistency across use cases
- Centralized logging/tracing
- Uniform testing approach
- Easy to add cross-cutting concerns

---

### 2.4 Integrated Observability

You have an observability module, but it could connect deeper:

**In use cases:**

```typescript
class RegisterUserUseCase extends UseCase<RegisterUserCommand, User> {
  async execute(command: RegisterUserCommand): Promise<User> {
    this.logger.log({
      traceId: getTraceId(),
      useCase: 'RegisterUser',
      email: command.email,
    });

    // business logic...

    this.logger.log({
      traceId: getTraceId(),
      useCase: 'RegisterUser',
      userId: user.id,
      duration: getDuration(),
    });

    return user;
  }
}
```

**Structured logging enables:**

- Distributed tracing
- Performance analysis
- Audit trails
- Error tracking

For this repository, treat OpenTelemetry, ELK, Grafana, and similar stacks as an optional follow-up stage instead of a base-template requirement.

---

### 2.5 Pagination as Application Contract

Pagination is in `shared`, but formalize it as a standard:

```typescript
// application/contracts/pagination.query.ts
export interface PaginationQuery {
  page: number;
  limit: number;
}

// application/contracts/paginated.result.ts
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

**Standard usage across use cases:**

```typescript
async execute(query: PaginationQuery): Promise<PaginatedResult<User>>;
```

---

## 3. Top 1% Patterns

These patterns are valuable only after the baseline remains stable, understandable, and necessary for your real use cases.

### 3.1 Lightweight CQRS

Separate read and write operations:

```plain
application/
  commands/
    register-user.command.ts
    delete-user.command.ts
  queries/
    get-user-by-id.query.ts
    get-paginated-users.query.ts
```

**When to use:**

- Dashboards with complex reads
- Analytics
- Different data models for read vs write

**When NOT to use:**

- Simple CRUD
- Team unfamiliar with CQRS
- Overkill for most applications

---

### 3.2 Specification Pattern

For complex queries:

```typescript
// domain/specifications/user-by-email.spec.ts
export class UserByEmailSpecification {
  constructor(private readonly email: Email) {}

  isSatisfiedBy(user: User): boolean {
    return user.email.equals(this.email);
  }
}

// domain/specifications/active-users.spec.ts
export class ActiveUsersSpecification {
  isSatisfiedBy(user: User): boolean {
    return !user.isDeleted;
  }
}
```

**Usage in repository:**

```typescript
// application/queries/get-active-user-by-email.query.ts
async execute(email: Email): Promise<User | null> {
  const spec = new UserByEmailSpecification(email)
    .and(new ActiveUsersSpecification());

  return this.userRepository.findOne(spec);
}
```

**Benefit:** Keeps repository queries clean and composable.

---

### 3.3 Policy-Based Authorization

Given your IAM module, this is critical:

**Instead of:**

```typescript
if (user.role === 'admin') {
  // allow
}
```

**Use policies:**

```plain
domain/
  policies/
    can-manage-users.policy.ts
    can-view-organization.policy.ts
```

```typescript
// domain/policies/can-manage-users.policy.ts
export class CanManageUsersPolicy {
  constructor(private readonly currentUser: User) {}

  evaluate(): boolean {
    return ['admin', 'owner'].includes(this.currentUser.role);
  }
}
```

**Usage:**

```typescript
class DeleteUserUseCase extends UseCase<DeleteUserCommand, void> {
  async execute(command: DeleteUserCommand): Promise<void> {
    const policy = new CanManageUsersPolicy(this.currentUser);

    if (!policy.evaluate()) {
      throw new UnauthorizedException();
    }

    // business logic...
  }
}
```

**Benefits:**

- Testable authorization logic
- Reusable across use cases
- Clear separation of concerns

The template now includes persisted RBAC roles and module-level permissions as a baseline. The next step, if complexity grows, is to move from raw permission checks to explicit policy objects over those permissions.

---

### 3.4 Future Modularization

**Current structure:**

```plain
src/
  modules/
    iam/
    observability/
```

**When scaling, consider evolving to:**

```plain
src/
  contexts/
    iam/
      users/
      organizations/
      auth/
    billing/
    access-control/
```

**Why:**

- Bounded contexts become first-class citizens
- Each context can have its own architecture decisions
- Clearer ownership
- Easier to extract to microservices later

**Warning:** Only do this when you have multiple teams or clear bounded context boundaries. Premature modularization creates complexity.

---

Last updated: 2026-03-26
