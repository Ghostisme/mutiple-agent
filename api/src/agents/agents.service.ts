/**
 * =============================================================
 * 【学习任务】阶段 2 — NestJS Service 三层架构
 *
 * 你需要理解：
 *   1. @Injectable() 如何通过依赖注入提供服务
 *   2. Repository 模式：Service 不直接写 SQL，通过 Repository 操作
 *   3. 为什么要分 Controller / Service / Repository 三层
 *
 * 【你的任务】：
 *   这里是骨架，核心逻辑需要你来填充。
 *   找到每个 TODO 注释，实现对应方法体。
 * =============================================================
 */

import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './agent.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
  ) {}

  /**
   * TODO: 你来实现
   * 创建新 Agent，collection_id 默认等于生成的 id（即每个 Agent 有独立知识库）
   *
   * 提示：
   *   const agent = this.agentRepo.create(dto)
   *   const saved = await this.agentRepo.save(agent)
   *   // 用 saved.id 更新 collection_id（如果未指定）
   */
  async create(dto: CreateAgentDto): Promise<Agent> {
    throw new Error('TODO: 实现 create()');
  }

  /**
   * TODO: 你来实现
   * 查询所有激活的 Agent，按创建时间降序
   *
   * 提示：
   *   return this.agentRepo.find({
   *     where: { is_active: true },
   *     order: { created_at: 'DESC' },
   *   })
   */
  async findAll(): Promise<Agent[]> {
    throw new Error('TODO: 实现 findAll()');
  }

  /**
   * TODO: 你来实现
   * 查询单个 Agent，不存在时抛出 NotFoundException
   *
   * 提示：
   *   const agent = await this.agentRepo.findOne({ where: { id } })
   *   if (!agent) throw new NotFoundException(...)
   */
  async findOne(id: string): Promise<Agent> {
    throw new Error('TODO: 实现 findOne()');
  }

  /**
   * TODO: 你来实现
   * 更新 Agent 字段（只更新传入的字段）
   *
   * 提示：
   *   await this.agentRepo.update(id, dto)
   *   return this.findOne(id)
   */
  async update(id: string, dto: UpdateAgentDto): Promise<Agent> {
    throw new Error('TODO: 实现 update()');
  }

  /**
   * TODO: 你来实现
   * 软删除（将 is_active 设为 false，不实际删除数据）
   *
   * 提示：软删除保留历史记录，生产环境推荐使用
   */
  async remove(id: string): Promise<void> {
    throw new Error('TODO: 实现 remove()');
  }
}
