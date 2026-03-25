/**
 * User repository injection token.
 * Kept outside Nest modules so application code does not depend on framework composition files.
 */

export const USER_REPOSITORY_TOKEN = Symbol('USER_REPOSITORY_TOKEN');
