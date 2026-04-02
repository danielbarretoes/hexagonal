import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

export const TENANT_SCOPED_METADATA_KEY = 'http:tenant_scoped';

export function TenantScoped(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(TENANT_SCOPED_METADATA_KEY, true),
    ApiHeader({
      name: 'x-organization-id',
      required: false,
      description:
        'Required for JWT-authenticated tenant-scoped requests. Optional for API keys bound to a single organization.',
    }),
  );
}
