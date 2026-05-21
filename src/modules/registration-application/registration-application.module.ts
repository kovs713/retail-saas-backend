import { RegistrationApplication } from './entities';
import { RegistrationApplicationPublicController } from './registration-application-public.controller';
import { RegistrationApplicationController } from './registration-application.controller';
import { RegistrationApplicationService } from './registration-application.service';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([RegistrationApplication])],
  providers: [RegistrationApplicationService],
  exports: [RegistrationApplicationService],
  controllers: [
    RegistrationApplicationController,
    RegistrationApplicationPublicController,
  ],
})
export class RegistrationApplicationModule {}
