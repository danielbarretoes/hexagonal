import { Module } from '@nestjs/common';
import { EmailAccessModule } from './email-access.module';

@Module({
  imports: [EmailAccessModule],
  exports: [EmailAccessModule],
})
export class EmailModule {}
