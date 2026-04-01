import { createOpaqueToken, parseOpaqueToken } from './opaque-token';

describe('opaque token helpers', () => {
  it('creates a token with id, secret, and combined token', () => {
    const token = createOpaqueToken();

    expect(token.id).toEqual(expect.any(String));
    expect(token.secret).toEqual(expect.any(String));
    expect(token.token).toBe(`${token.id}.${token.secret}`);
  });

  it('parses a valid opaque token', () => {
    const token = createOpaqueToken();

    expect(parseOpaqueToken(token.token)).toEqual({
      id: token.id,
      secret: token.secret,
    });
  });

  it('rejects malformed opaque tokens', () => {
    expect(parseOpaqueToken('')).toBeNull();
    expect(parseOpaqueToken('only-id')).toBeNull();
    expect(parseOpaqueToken('.missing-id')).toBeNull();
    expect(parseOpaqueToken('missing-secret.')).toBeNull();
  });
});
