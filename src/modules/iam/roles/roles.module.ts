import { Module } from '@nestjs/common';
import { RolesAccessModule } from './roles-access.module';

@Module({
  imports: [RolesAccessModule],
  exports: [RolesAccessModule],
})
export class RolesModule {}
