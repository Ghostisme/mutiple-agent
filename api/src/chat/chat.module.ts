import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [HttpModule, SessionsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
