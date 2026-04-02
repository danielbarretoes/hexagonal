# Frontend Integration Guide

Practical guide for frontend teams integrating with this template as a SaaS backend.

This backend is token-based, versioned under `/api/v1`, and mixes two kinds of routes:

- global routes, such as login, self-register, refresh, and organization listing
- tenant-scoped routes, such as users, members, API keys, webhooks, usage metrics, and HTTP logs

Use Swagger at `/docs` for the exact schema, and use this guide for the runtime rules that matter in a real UI.

## 1. Base URL And Versioning

- base path: `/api/v1`
- Swagger UI: `/docs` when `SWAGGER_ENABLED=true`
- health endpoints are not versioned and live at `/api/health/live` and `/api/health/ready`

Example:

```text
http://localhost:3000/api/v1
```

## 2. Authentication Model

The template does not use cookie sessions by default. The frontend exchanges credentials for tokens and then sends the access token on protected routes.

Main auth endpoints:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`
- `POST /auth/email-verification/request`
- `POST /auth/email-verification/confirm`

Login response:

```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "session-id.secret"
}
```

Headers for authenticated frontend requests:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

## 3. Tenant Header Rules

Most application screens are tenant-scoped. For those routes, JWT clients must send the selected organization id in `x-organization-id`.

Example:

```http
Authorization: Bearer <accessToken>
x-organization-id: 3c6f6cb9-1f8f-4e8e-b5d8-9b4f3d28122d
Content-Type: application/json
```

Frontend rule of thumb:

- after login, call `GET /organizations`
- let the user choose the active organization
- store the selected `organizationId` in app state
- attach `x-organization-id` to every tenant-scoped request made with JWT auth

Routes that usually need `x-organization-id`:

- `/users`
- `/members`
- `/organization-invitations`
- `/api-keys`
- `/webhooks`
- `/usage-metrics/api-keys`
- `/http-logs`
- tenant-scoped `/organizations/:id`

## 4. Idempotency Rules

Some POST routes are protected by `@Idempotent()`. These routes now require the `Idempotency-Key` header.

Recommended frontend behavior:

- generate a new UUID per user intent
- reuse the same key only when retrying the exact same request
- do not reuse a key across different forms, tenants, or payloads

Example:

```http
Idempotency-Key: 49b0f0b2-0f70-4cb7-9f9a-cd2f626cccb0
```

Current idempotent endpoints:

- `POST /users/self-register`
- `POST /organizations`
- `POST /users`
- `POST /members`
- `POST /organization-invitations`
- `POST /api-keys`
- `POST /auth/password-reset/request`
- `POST /auth/email-verification/request`
- `POST /webhooks`

When the backend replays a stored success response, it adds:

```http
Idempotency-Replayed: true
```

## 5. Common Frontend Flows

### Self-register and first organization

1. `POST /users/self-register`
2. `POST /auth/login`
3. `GET /organizations`
4. If the list is empty, `POST /organizations`
5. Save the created or selected organization id
6. Use that id in `x-organization-id`

Example requests:

```http
POST /api/v1/users/self-register
Content-Type: application/json
Idempotency-Key: 64aaefca-0a90-4ba1-8531-e5230a1c3547
```

```json
{
  "email": "john@example.com",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

```http
POST /api/v1/organizations
Authorization: Bearer <accessToken>
Content-Type: application/json
Idempotency-Key: 8174a2d0-337f-4406-8641-c183195cf70d
```

```json
{
  "name": "Acme"
}
```

### Login and bootstrap the app shell

1. `POST /auth/login`
2. Persist `accessToken` and `refreshToken` according to your client security model
3. `GET /organizations`
4. Pick or restore the active organization
5. Use `x-organization-id` for the rest of the session

### Refresh tokens

Use `POST /auth/refresh` with the last `refreshToken` and replace both tokens with the new pair returned by the backend.

```json
{
  "refreshToken": "session-id.secret"
}
```

### Password reset

Request:

```http
POST /api/v1/auth/password-reset/request
Content-Type: application/json
Idempotency-Key: 1102b2a4-19d8-455f-a783-cc68f0ee4f6f
```

```json
{
  "email": "john@example.com"
}
```

Frontend expectation:

- the request endpoint returns `200` even when the email does not exist
- show a generic confirmation message such as "If the account exists, we sent reset instructions"
- do not build UI logic around whether a token was returned

Confirm:

```json
{
  "token": "one-time-reset-token",
  "newPassword": "NewPassword123"
}
```

### Email verification

`POST /auth/email-verification/request` requires a logged-in user and `Idempotency-Key`.

Frontend expectation:

- in production, the backend should email the token and usually returns an empty object
- in local or test environments, tokens may be exposed when `AUTH_EXPOSE_PRIVATE_TOKENS=true`
- do not make frontend production logic depend on `verificationToken`

### Organization invitations

Create:

```http
POST /api/v1/organization-invitations
Authorization: Bearer <accessToken>
x-organization-id: <organizationId>
Content-Type: application/json
Idempotency-Key: 8bb4ed4d-37ba-4a51-9bbb-c1bb53ff7f76
```

```json
{
  "email": "new-member@example.com",
  "roleCode": "member"
}
```

Accept:

```json
{
  "token": "organization-invitation-token"
}
```

Frontend expectation:

- invite creation may return `{}` in production when private tokens are not exposed
- a logged-in user accepts the invite through `POST /organization-invitations/accept`

## 6. Endpoint Reference For UI Work

### Identity and auth

| Route | Auth | Tenant header | Notes |
| --- | --- | --- | --- |
| `POST /users/self-register` | none | no | Idempotent |
| `POST /auth/login` | none | no | Returns access + refresh tokens |
| `POST /auth/refresh` | none | no | Rotates refresh token |
| `POST /auth/logout` | none | no | Revokes one refresh token |
| `POST /auth/logout-all` | bearer | no | Revokes all sessions for current user |
| `POST /auth/password-reset/request` | none | no | Idempotent, generic success |
| `POST /auth/password-reset/confirm` | none | no | Uses one-time token |
| `POST /auth/email-verification/request` | bearer | no | Idempotent |
| `POST /auth/email-verification/confirm` | none | no | Uses one-time token |

### Organizations and tenant selection

| Route | Auth | Tenant header | Notes |
| --- | --- | --- | --- |
| `GET /organizations` | bearer | no | Use this to populate organization picker |
| `POST /organizations` | bearer | no | Idempotent |
| `GET /organizations/:id` | bearer or API key | yes | Tenant-scoped |
| `PATCH /organizations/:id` | bearer or API key | yes | Tenant-scoped |
| `DELETE /organizations/:id` | bearer or API key | yes | Tenant-scoped |
| `PATCH /organizations/:id/restore` | bearer or API key | yes | Tenant-scoped |

### Users and memberships

| Route | Auth | Tenant header | Notes |
| --- | --- | --- | --- |
| `GET /users` | bearer or API key | yes | Paginated |
| `POST /users` | bearer or API key | yes | Idempotent |
| `GET /users/:id` | bearer or API key | yes | Tenant-scoped |
| `PATCH /users/:id` | bearer or API key | yes | Fails with `403` for shared identities |
| `DELETE /users/:id` | bearer or API key | yes | Fails with `403` for shared identities |
| `PATCH /users/:id/restore` | bearer or API key | yes | Fails with `403` for shared identities |
| `GET /members` | bearer or API key | yes | Lists tenant memberships |
| `POST /members` | bearer or API key | yes | Idempotent |
| `PATCH /members/:id/role` | bearer or API key | yes | Role update |
| `DELETE /members/:id` | bearer or API key | yes | Last-owner protections apply |
| `POST /organization-invitations` | bearer or API key | yes | Idempotent |
| `POST /organization-invitations/accept` | bearer | no | Uses invitation token |

### Machine access and observability

| Route | Auth | Tenant header | Notes |
| --- | --- | --- | --- |
| `GET /api-keys` | bearer | yes | Paginated |
| `POST /api-keys` | bearer | yes | Idempotent, secret returned once |
| `DELETE /api-keys/:id` | bearer | yes | Revokes owned key |
| `GET /usage-metrics/api-keys` | bearer | yes | Aggregated usage |
| `GET /http-logs` | bearer or API key | yes | Paginated operational logs |
| `GET /http-logs/trace/:traceId` | bearer or API key | yes | Correlation lookup |
| `GET /http-logs/:id` | bearer or API key | yes | Single log lookup |

### Webhooks

| Route | Auth | Tenant header | Notes |
| --- | --- | --- | --- |
| `GET /webhooks` | bearer | yes | Paginated |
| `POST /webhooks` | bearer | yes | Idempotent, secret returned once |
| `DELETE /webhooks/:id` | bearer | yes | Removes endpoint |

Webhook creation payload:

```json
{
  "name": "CRM sync",
  "url": "https://example.com/webhooks/iam",
  "events": [
    "iam.user.created",
    "iam.member.added"
  ]
}
```

Frontend expectation:

- treat webhook secrets like API key secrets: display once, let the user copy them, and never expect the backend to reveal them again
- production environments should use public HTTPS URLs
- localhost and private-network webhook targets are blocked by default in production

## 7. Response Patterns

### Pagination

Paginated endpoints return:

```json
{
  "items": [],
  "meta": {
    "totalItems": 25,
    "itemCount": 10,
    "itemsPerPage": 10,
    "totalPages": 3,
    "currentPage": 1,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### 204 responses

Delete, logout, and some confirmation endpoints respond with `204 No Content`. Frontend code should not try to parse JSON from those responses.

### Problem Details errors

The backend returns RFC 7807 style errors:

```json
{
  "type": "https://api.hexagonal.com/errors/conflict",
  "title": "UserAlreadyExistsException",
  "status": 409,
  "detail": "User already exists",
  "instance": "/api/v1/users/self-register",
  "timestamp": "2026-04-02T12:00:00.000Z",
  "traceId": "e4f437c6-798f-4fd6-9e5e-a9df3d1b6a5a"
}
```

Validation failures also include `invalid-params`.

Frontend rule of thumb:

- show `detail` to the user when it is a safe business error
- log `traceId` in client telemetry and support tooling
- handle `401`, `403`, `404`, `409`, and `422` as normal product states, not only as fatal exceptions

## 8. Recommended Frontend API Wrapper

Minimal `fetch` helper:

```ts
type ApiRequestOptions = RequestInit & {
  accessToken?: string;
  organizationId?: string;
  idempotencyKey?: string;
};

export async function api<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { accessToken, organizationId, idempotencyKey, headers, ...init } = options;

  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(organizationId ? { 'x-organization-id': organizationId } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      ...headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    throw await response.json();
  }

  return (await response.json()) as T;
}
```

## 9. Frontend Do And Do Not

Do:

- centralize token refresh and tenant header injection
- generate `Idempotency-Key` on protected POST create actions
- treat API key and webhook secrets as one-time reveal values
- keep UI copy generic for password reset request results
- use Swagger to generate types if your frontend stack supports it

Do not:

- depend on private token fields being present in production
- call tenant-scoped JWT routes without `x-organization-id`
- retry idempotent POST requests with a different key unless the user is starting a new action
- expect deleted or restored shared user identities to be manageable from one tenant admin screen
