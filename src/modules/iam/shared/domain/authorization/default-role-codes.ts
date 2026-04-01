export const DEFAULT_ROLE_CODES = ['owner', 'admin', 'manager', 'member', 'guest'] as const;

export type DefaultRoleCode = (typeof DEFAULT_ROLE_CODES)[number];
