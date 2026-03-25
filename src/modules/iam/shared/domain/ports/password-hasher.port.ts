/**
 * Password hasher port.
 * Shared IAM technical contract used by authentication and user lifecycle flows.
 */

export interface PasswordHasherPort {
  hash(plainText: string): Promise<string>;
  compare(plainText: string, hash: string): Promise<boolean>;
}
