import {
  Controller,
  Post,
  Body,
  Param,
  Sse,
  Logger,
  MessageEvent,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ChatService } from './chat.service';

class ChatRequestDto {
  session_id: string;
  message: string;
}

class HitlResponseDto {
  session_id: string;
  approved: boolean;
  reason?: string;
}

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);
  constructor(private readonly chatService: ChatService) {}
  
  /**
   * SSE 流式对话端点
   *
   * @Sse() 装饰器会自动设置 Content-Type: text/event-stream
   * 返回的 Observable 每次 next() 都会向客户端推送一个 SSE 事件
   */
  @Sse(':agentId/stream')
  stream(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    // @Body() body: ChatRequestDto,
    @Query('session_id') sessionId: string,
    @Query('message') message: string
  ): Observable<MessageEvent> {
    this.logger.log('查看当前传递的参数', sessionId, message)
    return this.chatService
      .streamChat(agentId, sessionId, message)
      // .streamChat(agentId, body.session_id, body.message)
      .pipe(
        map((msg) => ({
          type: msg.event,
          data: msg.data,
        })),
      );
  }

  @Post('hitl/respond')
  hitlRespond(@Body() body: HitlResponseDto) {
    return this.chatService.hitlRespond(
      body.session_id,
      body.approved,
      body.reason,
    );
  }
}
