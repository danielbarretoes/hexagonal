export interface OpaqueTokenParts {
  id: string;
  secret: string;
  token: string;
}

export function createOpaqueToken(): OpaqueTokenParts {
  const id = crypto.randomUUID();
  const secret = crypto.randomUUID();

  return {
    id,
    secret,
    token: `${id}.${secret}`,
  };
}

export function parseOpaqueToken(token: string): { id: string; secret: string } | null {
  const [id, secret] = token.split('.');

  if (!id || !secret) {
    return null;
  }

  return { id, secret };
}
