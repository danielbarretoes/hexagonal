import { DomainException } from '../../../../shared/domain/exceptions/domain.exception';

export class InvalidWebhookTargetException extends DomainException {
  constructor(reason: string) {
    super(`Webhook target is not allowed: ${reason}`, 'INVALID_WEBHOOK_TARGET');
  }
}
