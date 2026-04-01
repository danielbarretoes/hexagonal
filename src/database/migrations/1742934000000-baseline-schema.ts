import { MigrationInterface, QueryRunner } from 'typeorm';

const APP_RUNTIME_ROLE = 'hexagonal_app_runtime';
const TENANT_SETTING = "nullif(current_setting('app.current_organization_id', true), '')::uuid";
const INVITATION_SETTING = "nullif(current_setting('app.current_invitation_id', true), '')::uuid";
const DEFAULT_PERMISSIONS = [
  ['0f8fad5b-d9cb-469f-a165-708677289501', 'iam.users.read', 'Read IAM users'],
  ['0f8fad5b-d9cb-469f-a165-708677289502', 'iam.users.write', 'Create or update IAM users'],
  ['0f8fad5b-d9cb-469f-a165-708677289503', 'iam.organizations.read', 'Read organizations'],
  [
    '0f8fad5b-d9cb-469f-a165-708677289504',
    'iam.organizations.write',
    'Create or update organizations',
  ],
  ['0f8fad5b-d9cb-469f-a165-708677289505', 'iam.members.read', 'Read organization memberships'],
  ['0f8fad5b-d9cb-469f-a165-708677289506', 'iam.members.write', 'Manage organization memberships'],
  ['0f8fad5b-d9cb-469f-a165-708677289507', 'observability.http_logs.read', 'Read tenant HTTP logs'],
] as const;
const DEFAULT_ROLES = [
  ['7c9e6679-7425-40de-944b-e07fc1f90a11', 'owner', 'Owner'],
  ['7c9e6679-7425-40de-944b-e07fc1f90a12', 'admin', 'Admin'],
  ['7c9e6679-7425-40de-944b-e07fc1f90a13', 'manager', 'Manager'],
  ['7c9e6679-7425-40de-944b-e07fc1f90a14', 'member', 'Member'],
  ['7c9e6679-7425-40de-944b-e07fc1f90a15', 'guest', 'Guest'],
] as const;
const ROLE_PERMISSION_CODES: Record<string, readonly string[]> = {
  owner: DEFAULT_PERMISSIONS.map(([, code]) => code),
  admin: DEFAULT_PERMISSIONS.map(([, code]) => code),
  manager: [
    'iam.users.read',
    'iam.organizations.read',
    'iam.members.read',
    'observability.http_logs.read',
  ],
  member: ['iam.organizations.read'],
  guest: [],
};

export class BaselineSchema1742934000000 implements MigrationInterface {
  name = 'BaselineSchema1742934000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL,
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "first_name" character varying NOT NULL,
        "last_name" character varying NOT NULL,
        "email_verified_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "pk_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "pk_organizations_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL,
        "code" character varying(64) NOT NULL,
        "name" character varying(128) NOT NULL,
        "is_system" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_roles_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_roles_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid NOT NULL,
        "code" character varying(128) NOT NULL,
        "description" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_permissions_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_permissions_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        CONSTRAINT "pk_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "fk_role_permissions_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_role_permissions_permission_id" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "members" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        "joined_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_members_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_members_user_organization" UNIQUE ("user_id", "organization_id"),
        CONSTRAINT "fk_members_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_members_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_members_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "http_logs" (
        "id" uuid NOT NULL,
        "method" character varying(16) NOT NULL,
        "path" character varying(512) NOT NULL,
        "status_code" integer NOT NULL,
        "request_body" jsonb,
        "query_params" jsonb,
        "route_params" jsonb,
        "response_body" jsonb,
        "error_message" text,
        "error_trace" text,
        "duration_ms" integer NOT NULL,
        "user_id" uuid,
        "organization_id" uuid,
        "trace_id" character varying(128),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_http_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "auth_sessions" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "refresh_token_hash" character varying NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "revoked_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_auth_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "fk_auth_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_action_tokens" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "purpose" character varying(64) NOT NULL,
        "token_hash" character varying NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "consumed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_action_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "fk_user_action_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "organization_invitations" (
        "id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "email" character varying NOT NULL,
        "role_id" uuid NOT NULL,
        "token_hash" character varying NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "accepted_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_organization_invitations_id" PRIMARY KEY ("id"),
        CONSTRAINT "fk_organization_invitations_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_organization_invitations_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL,
        "action" character varying(128) NOT NULL,
        "actor_user_id" uuid,
        "organization_id" uuid,
        "resource_type" character varying(64) NOT NULL,
        "resource_id" character varying(128),
        "payload" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_audit_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_members_organization" ON "members" ("organization_id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_members_user" ON "members" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_members_role" ON "members" ("role_id")`);
    await queryRunner.query(`CREATE INDEX "idx_users_deleted_at" ON "users" ("deleted_at")`);
    await queryRunner.query(
      `CREATE INDEX "idx_organizations_deleted_at" ON "organizations" ("deleted_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_http_logs_created_at" ON "http_logs" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_http_logs_status_code" ON "http_logs" ("status_code")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_http_logs_user_id" ON "http_logs" ("user_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_http_logs_organization_id" ON "http_logs" ("organization_id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_http_logs_trace_id" ON "http_logs" ("trace_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_auth_sessions_user_id" ON "auth_sessions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_organization_created_at" ON "audit_logs" ("organization_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_action_tokens_user_purpose" ON "user_action_tokens" ("user_id", "purpose")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_organization_invitations_lookup" ON "organization_invitations" ("organization_id", "email")`,
    );

    for (const [id, code, description] of DEFAULT_PERMISSIONS) {
      await queryRunner.query(
        `
          INSERT INTO "permissions" ("id", "code", "description")
          VALUES ($1, $2, $3)
        `,
        [id, code, description],
      );
    }

    for (const [id, code, name] of DEFAULT_ROLES) {
      await queryRunner.query(
        `
          INSERT INTO "roles" ("id", "code", "name", "is_system")
          VALUES ($1, $2, $3, true)
        `,
        [id, code, name],
      );
    }

    const permissionIdByCode = new Map<string, string>(
      DEFAULT_PERMISSIONS.map(([id, code]) => [code, id]),
    );
    const roleIdByCode = new Map<string, string>(DEFAULT_ROLES.map(([id, code]) => [code, id]));

    for (const [roleCode, permissionCodes] of Object.entries(ROLE_PERMISSION_CODES)) {
      const roleId = roleIdByCode.get(roleCode);

      if (!roleId) {
        continue;
      }

      for (const permissionCode of permissionCodes) {
        const permissionId = permissionIdByCode.get(permissionCode);

        if (!permissionId) {
          continue;
        }

        await queryRunner.query(
          `
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            VALUES ($1, $2)
          `,
          [roleId, permissionId],
        );
      }
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_RUNTIME_ROLE}') THEN
          CREATE ROLE ${APP_RUNTIME_ROLE} NOLOGIN;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`GRANT USAGE ON SCHEMA public TO ${APP_RUNTIME_ROLE}`);
    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "users", "organizations", "members", "http_logs", "auth_sessions", "user_action_tokens", "organization_invitations", "audit_logs" TO ${APP_RUNTIME_ROLE}`,
    );
    await queryRunner.query(
      `GRANT SELECT ON TABLE "roles", "permissions", "role_permissions" TO ${APP_RUNTIME_ROLE}`,
    );
    await queryRunner.query(`GRANT ${APP_RUNTIME_ROLE} TO CURRENT_USER`);

    await queryRunner.query(`ALTER TABLE "members" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "members" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "http_logs" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "http_logs" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "organization_invitations" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "organization_invitations" FORCE ROW LEVEL SECURITY`);

    await queryRunner.query(`
      CREATE POLICY "members_tenant_select" ON "members"
      FOR SELECT
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "members_tenant_insert" ON "members"
      FOR INSERT
      TO ${APP_RUNTIME_ROLE}
      WITH CHECK ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "members_tenant_update" ON "members"
      FOR UPDATE
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
      WITH CHECK ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "members_tenant_delete" ON "members"
      FOR DELETE
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "http_logs_tenant_select" ON "http_logs"
      FOR SELECT
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "http_logs_insert_all" ON "http_logs"
      FOR INSERT
      TO ${APP_RUNTIME_ROLE}
      WITH CHECK (
        "organization_id" IS NULL
        OR "organization_id" = ${TENANT_SETTING}
      )
    `);

    await queryRunner.query(`
      CREATE POLICY "organization_invitations_tenant_select" ON "organization_invitations"
      FOR SELECT
      TO ${APP_RUNTIME_ROLE}
      USING (
        "organization_id" = ${TENANT_SETTING}
        OR "id" = ${INVITATION_SETTING}
      )
    `);

    await queryRunner.query(`
      CREATE POLICY "organization_invitations_tenant_insert" ON "organization_invitations"
      FOR INSERT
      TO ${APP_RUNTIME_ROLE}
      WITH CHECK ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "organization_invitations_tenant_update" ON "organization_invitations"
      FOR UPDATE
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
      WITH CHECK ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "organization_invitations_tenant_delete" ON "organization_invitations"
      FOR DELETE
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP POLICY IF EXISTS "organization_invitations_tenant_delete" ON "organization_invitations"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "organization_invitations_tenant_update" ON "organization_invitations"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "organization_invitations_tenant_insert" ON "organization_invitations"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "organization_invitations_tenant_select" ON "organization_invitations"`,
    );
    await queryRunner.query(`DROP POLICY IF EXISTS "http_logs_insert_all" ON "http_logs"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "http_logs_tenant_select" ON "http_logs"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "members_tenant_delete" ON "members"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "members_tenant_update" ON "members"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "members_tenant_insert" ON "members"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "members_tenant_select" ON "members"`);
    await queryRunner.query(`ALTER TABLE "organization_invitations" DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "http_logs" DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "members" DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`REVOKE ${APP_RUNTIME_ROLE} FROM CURRENT_USER`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_http_logs_trace_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_http_logs_organization_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_http_logs_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_http_logs_status_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_http_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_auth_sessions_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_organization_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_action_tokens_user_purpose"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_organization_invitations_lookup"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_deleted_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_organizations_deleted_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_members_role"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_members_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_members_organization"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "organization_invitations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_action_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "http_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP ROLE IF EXISTS ${APP_RUNTIME_ROLE}`);
  }
}
