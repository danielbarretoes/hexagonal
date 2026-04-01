import { Injectable } from '@nestjs/common';
import type {
  TransactionalEmailMessage,
  TransactionalEmailPort,
} from '../../../../../shared/domain/ports/transactional-email.port';

@Injectable()
export class NoopTransactionalEmailAdapter implements TransactionalEmailPort {
  async send(_message: TransactionalEmailMessage): Promise<void> {
    return Promise.resolve();
  }
}
