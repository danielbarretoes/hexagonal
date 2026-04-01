import { Module } from '@nestjs/common';
import { OrganizationsAccessModule } from './organizations/organizations-access.module';

@Module({
  imports: [OrganizationsAccessModule],
  exports: [OrganizationsAccessModule],
})
export class IamAuthorizationAccessModule {}
