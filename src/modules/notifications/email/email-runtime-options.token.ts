export interface EmailRuntimeOptions {
  readonly enabled: boolean;
  readonly provider: 'ses';
  readonly sesRegion: string;
  readonly fromEmail: string;
  readonly fromName: string;
  readonly brandName: string;
  readonly appPublicUrl: string;
  readonly passwordResetPath: string;
  readonly emailVerificationPath: string;
  readonly invitationPath: string;
  readonly welcomePath: string;
}

export const EMAIL_RUNTIME_OPTIONS = Symbol('EMAIL_RUNTIME_OPTIONS');
