import { Inject, Injectable } from '@nestjs/common';
import type { TransactionalEmailMessage } from '../../../../../shared/domain/ports/transactional-email.port';
import { EMAIL_RUNTIME_OPTIONS, type EmailRuntimeOptions } from '../../email-runtime-options.token';

export interface RenderedTransactionalEmail {
  subject: string;
  textBody: string;
  htmlBody: string;
}

@Injectable()
export class TransactionalEmailTemplateFactory {
  constructor(
    @Inject(EMAIL_RUNTIME_OPTIONS)
    private readonly emailConfig: EmailRuntimeOptions,
  ) {}

  render(message: TransactionalEmailMessage): RenderedTransactionalEmail {
    switch (message.type) {
      case 'password_reset':
        return this.renderPasswordReset(message);
      case 'email_verification':
        return this.renderEmailVerification(message);
      case 'organization_invitation':
        return this.renderOrganizationInvitation(message);
      case 'welcome':
        return this.renderWelcome(message);
    }
  }

  private renderPasswordReset(
    message: Extract<TransactionalEmailMessage, { type: 'password_reset' }>,
  ): RenderedTransactionalEmail {
    const recipientName = this.escapeHtml(message.recipientName);
    const resetUrl = this.buildPublicUrl(
      this.emailConfig.passwordResetPath,
      'token',
      message.resetToken,
    );
    const brandName = this.escapeHtml(this.emailConfig.brandName);
    const subject = `${this.emailConfig.brandName}: reset your password`;
    const textBody = [
      `Hi ${message.recipientName},`,
      '',
      `We received a request to reset your password for ${this.emailConfig.brandName}.`,
      `Use this link within ${message.expiresInMinutes} minutes:`,
      resetUrl,
    ].join('\n');

    return {
      subject,
      textBody,
      htmlBody: this.wrapHtmlBody(subject, [
        `Hi ${recipientName},`,
        `We received a request to reset your password for ${brandName}.`,
        `Use this link within ${message.expiresInMinutes} minutes:`,
        this.renderLink('Reset password', resetUrl),
      ]),
    };
  }

  private renderEmailVerification(
    message: Extract<TransactionalEmailMessage, { type: 'email_verification' }>,
  ): RenderedTransactionalEmail {
    const recipientName = this.escapeHtml(message.recipientName);
    const verificationUrl = this.buildPublicUrl(
      this.emailConfig.emailVerificationPath,
      'token',
      message.verificationToken,
    );
    const brandName = this.escapeHtml(this.emailConfig.brandName);
    const subject = `${this.emailConfig.brandName}: verify your email`;
    const textBody = [
      `Hi ${message.recipientName},`,
      '',
      `Verify your email address for ${this.emailConfig.brandName}.`,
      `Use this link within ${message.expiresInHours} hours:`,
      verificationUrl,
    ].join('\n');

    return {
      subject,
      textBody,
      htmlBody: this.wrapHtmlBody(subject, [
        `Hi ${recipientName},`,
        `Verify your email address for ${brandName}.`,
        `Use this link within ${message.expiresInHours} hours:`,
        this.renderLink('Verify email', verificationUrl),
      ]),
    };
  }

  private renderOrganizationInvitation(
    message: Extract<TransactionalEmailMessage, { type: 'organization_invitation' }>,
  ): RenderedTransactionalEmail {
    const organizationName = this.escapeHtml(message.organizationName);
    const roleCode = this.escapeHtml(message.roleCode);
    const invitationUrl = this.buildPublicUrl(
      this.emailConfig.invitationPath,
      'token',
      message.invitationToken,
    );
    const subject = `${this.emailConfig.brandName}: invitation to join ${message.organizationName}`;
    const textBody = [
      'You have been invited to join an organization.',
      `Organization: ${message.organizationName}`,
      `Role: ${message.roleCode}`,
      `Accept within ${message.expiresInDays} days:`,
      invitationUrl,
    ].join('\n');

    return {
      subject,
      textBody,
      htmlBody: this.wrapHtmlBody(subject, [
        'You have been invited to join an organization.',
        `Organization: ${organizationName}`,
        `Role: ${roleCode}`,
        `Accept within ${message.expiresInDays} days:`,
        this.renderLink('Accept invitation', invitationUrl),
      ]),
    };
  }

  private renderWelcome(
    message: Extract<TransactionalEmailMessage, { type: 'welcome' }>,
  ): RenderedTransactionalEmail {
    const recipientName = this.escapeHtml(message.recipientName);
    const brandName = this.escapeHtml(this.emailConfig.brandName);
    const signInUrl = new URL(
      this.emailConfig.welcomePath,
      this.emailConfig.appPublicUrl,
    ).toString();
    const subject = `${this.emailConfig.brandName}: welcome aboard`;
    const textBody = [
      `Hi ${message.recipientName},`,
      '',
      `Welcome to ${this.emailConfig.brandName}.`,
      'You can sign in here:',
      signInUrl,
    ].join('\n');

    return {
      subject,
      textBody,
      htmlBody: this.wrapHtmlBody(subject, [
        `Hi ${recipientName},`,
        `Welcome to ${brandName}.`,
        'You can sign in here:',
        this.renderLink('Go to sign in', signInUrl),
      ]),
    };
  }

  private wrapHtmlBody(title: string, paragraphs: string[]): string {
    const body = paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('');
    return `<!doctype html><html><body><h1>${this.escapeHtml(title)}</h1>${body}</body></html>`;
  }

  private renderLink(label: string, url: string): string {
    return `<a href="${this.escapeHtml(url)}">${this.escapeHtml(label)}</a>`;
  }

  private buildPublicUrl(path: string, queryKey: string, token: string): string {
    const url = new URL(path, this.emailConfig.appPublicUrl);
    url.searchParams.set(queryKey, token);
    return url.toString();
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
