import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './session.entity';
import { Message } from './message.entity';
import { SessionsService } from './sessions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Session, Message])],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
