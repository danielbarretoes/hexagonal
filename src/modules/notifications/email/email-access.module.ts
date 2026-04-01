import { Module } from '@nestjs/common';
import { EmailModule } from './email.module';

@Module({
  imports: [EmailModule],
  exports: [EmailModule],
})
export class EmailAccessModule {}
