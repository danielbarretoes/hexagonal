export interface WebhooksRuntimeOptions {
  readonly enabled: boolean;
  readonly timeoutMs: number;
  readonly secretEncryptionKey: string;
  readonly requireHttps: boolean;
  readonly allowPrivateTargets: boolean;
}

export const WEBHOOKS_RUNTIME_OPTIONS = Symbol('WEBHOOKS_RUNTIME_OPTIONS');
