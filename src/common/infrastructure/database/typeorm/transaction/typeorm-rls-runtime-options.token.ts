export interface TypeormRlsRuntimeOptions {
  readonly runtimeRole: string;
}

export const TYPEORM_RLS_RUNTIME_OPTIONS = Symbol('TYPEORM_RLS_RUNTIME_OPTIONS');
