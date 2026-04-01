export interface PasswordResetEmailMessage {
  type: 'password_reset';
  to: string;
  recipientName: string;
  resetToken: string;
  expiresInMinutes: number;
}

export interface EmailVerificationMessage {
  type: 'email_verification';
  to: string;
  recipientName: string;
  verificationToken: string;
  expiresInHours: number;
}

export interface OrganizationInvitationEmailMessage {
  type: 'organization_invitation';
  to: string;
  organizationName: string;
  roleCode: string;
  invitationToken: string;
  expiresInDays: number;
}

export interface WelcomeEmailMessage {
  type: 'welcome';
  to: string;
  recipientName: string;
}

export type TransactionalEmailMessage =
  | PasswordResetEmailMessage
  | EmailVerificationMessage
  | OrganizationInvitationEmailMessage
  | WelcomeEmailMessage;

export interface TransactionalEmailPort {
  send(message: TransactionalEmailMessage): Promise<void>;
}
