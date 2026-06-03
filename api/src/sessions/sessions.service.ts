/**
 * =============================================================
 * 【学习任务】阶段 6 — 会话管理服务
 *
 * 你需要理解：
 *   1. Session 与 Message 的一对多关系
 *   2. 为什么消息历史要存 PostgreSQL 而不只存 Redis
 *      （Redis 是短期缓存，PostgreSQL 是持久化存储）
 * =============================================================
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './session.entity';
import { Message, MessageRole } from './message.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  async getOrCreateSession(agentId: string, sessionId?: string): Promise<Session> {
    if (sessionId) {
      const existing = await this.sessionRepo.findOne({
        where: { id: sessionId },
      });
      if (existing) return existing;
    }
    return this.sessionRepo.save(
      this.sessionRepo.create({ agent_id: agentId }),
    );
  }

  async saveMessage(
    sessionId: string,
    role: MessageRole,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<Message> {
    return this.messageRepo.save(
      this.messageRepo.create({ session_id: sessionId, role, content, metadata }),
    );
  }

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    return this.messageRepo.find({
      where: { session_id: sessionId },
      order: { created_at: 'ASC' },
    });
  }

  async listSessionsByAgent(agentId: string): Promise<Session[]> {
    return this.sessionRepo.find({
      where: { agent_id: agentId },
      order: { updated_at: 'DESC' },
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.sessionRepo.delete(sessionId);
  }
}
