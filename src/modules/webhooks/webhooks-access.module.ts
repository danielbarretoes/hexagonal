import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getAppConfig } from '../../config/env/app-config';
import { WEBHOOK_DELIVERY_CLIENT_TOKEN } from '../../shared/application/ports/webhook-delivery-client.token';
import { WEBHOOK_ENDPOINT_REPOSITORY_TOKEN } from '../../shared/application/ports/webhook-endpoint-repository.token';
import { WEBHOOK_EVENT_PUBLISHER_PORT } from '../../shared/application/ports/webhook-event-publisher.token';
import { WEBHOOK_SECRET_CIPHER_TOKEN } from '../../shared/application/ports/webhook-secret-cipher.token';
import { JobsAccessModule } from '../jobs/jobs-access.module';
import { AuditLogsAccessModule } from '../observability/audit-logs/audit-logs-access.module';
import { CreateWebhookEndpointUseCase } from './application/use-cases/create-webhook-endpoint.use-case';
import { DeleteWebhookEndpointUseCase } from './application/use-cases/delete-webhook-endpoint.use-case';
import { GetPaginatedWebhookEndpointsUseCase } from './application/use-cases/get-paginated-webhook-endpoints.use-case';
import {
  WEBHOOKS_RUNTIME_OPTIONS,
  type WebhooksRuntimeOptions,
} from './application/ports/webhooks-runtime-options.token';
import { PublishWebhookEventService } from './application/publish-webhook-event.service';
import { AesWebhookSecretCipherAdapter } from './infrastructure/adapters/aes-webhook-secret-cipher.adapter';
import { FetchWebhookDeliveryClientAdapter } from './infrastructure/adapters/fetch-webhook-delivery-client.adapter';
import { NoopWebhookEventPublisherAdapter } from './infrastructure/adapters/noop-webhook-event-publisher.adapter';
import { WebhookEndpointTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/webhook-endpoint.entity';
import { WebhookEndpointTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/webhook-endpoint.typeorm-repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEndpointTypeOrmEntity]),
    JobsAccessModule,
    AuditLogsAccessModule,
  ],
  providers: [
    {
      provide: WEBHOOKS_RUNTIME_OPTIONS,
      useFactory: (): WebhooksRuntimeOptions => ({
        ...getAppConfig().webhooks,
      }),
    },
    { provide: WEBHOOK_ENDPOINT_REPOSITORY_TOKEN, useClass: WebhookEndpointTypeOrmRepository },
    { provide: WEBHOOK_SECRET_CIPHER_TOKEN, useClass: AesWebhookSecretCipherAdapter },
    { provide: WEBHOOK_DELIVERY_CLIENT_TOKEN, useClass: FetchWebhookDeliveryClientAdapter },
    WebhookEndpointTypeOrmRepository,
    AesWebhookSecretCipherAdapter,
    FetchWebhookDeliveryClientAdapter,
    CreateWebhookEndpointUseCase,
    DeleteWebhookEndpointUseCase,
    GetPaginatedWebhookEndpointsUseCase,
    NoopWebhookEventPublisherAdapter,
    PublishWebhookEventService,
    {
      provide: WEBHOOK_EVENT_PUBLISHER_PORT,
      useFactory: (
        webhooksRuntimeOptions: WebhooksRuntimeOptions,
        noopPublisher: NoopWebhookEventPublisherAdapter,
        publishWebhookEventService: PublishWebhookEventService,
      ) => (webhooksRuntimeOptions.enabled ? publishWebhookEventService : noopPublisher),
      inject: [
        WEBHOOKS_RUNTIME_OPTIONS,
        NoopWebhookEventPublisherAdapter,
        PublishWebhookEventService,
      ],
    },
  ],
  exports: [
    CreateWebhookEndpointUseCase,
    DeleteWebhookEndpointUseCase,
    GetPaginatedWebhookEndpointsUseCase,
    WEBHOOKS_RUNTIME_OPTIONS,
    WEBHOOK_EVENT_PUBLISHER_PORT,
    WEBHOOK_ENDPOINT_REPOSITORY_TOKEN,
    WEBHOOK_SECRET_CIPHER_TOKEN,
    WEBHOOK_DELIVERY_CLIENT_TOKEN,
  ],
})
export class WebhooksAccessModule {}
