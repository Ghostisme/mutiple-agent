/**
 * =============================================================
 * 【学习任务】阶段 1 — TypeORM 实体定义
 *
 * 你需要理解：
 *   1. @Entity() 如何映射到 PostgreSQL 表
 *   2. 各种列装饰器的含义：@PrimaryGeneratedColumn / @Column / @CreateDateColumn
 *   3. @Column({ type: 'simple-array' }) 如何存储数组
 *   4. enum 类型如何限制字段值
 * =============================================================
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MemoryType {
  BUFFER = 'buffer',
  WINDOW = 'window',
  SUMMARY = 'summary',
}

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', default: '你是一个有帮助的 AI 助手。' })
  system_prompt: string;

  @Column({ default: 'llama3.2' })
  model: string;

  @Column({ type: 'enum', enum: MemoryType, default: MemoryType.BUFFER })
  memory_type: MemoryType;

  /** 启用的工具列表，存为 PostgreSQL 数组 */
  @Column({ type: 'simple-array', default: '' })
  tools: string[];

  /** 绑定的 ChromaDB collection ID（等于 agent_id，可自定义） */
  @Column({ nullable: true })
  collection_id: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
