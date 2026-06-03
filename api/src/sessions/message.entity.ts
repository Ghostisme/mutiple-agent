import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Session } from './session.entity';

export enum MessageRole {
  HUMAN = 'human',
  AI = 'ai',
  SYSTEM = 'system',
}

@Entity('messages')
@Index(['session_id', 'created_at'])  // 阶段8：复合索引优化查询
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  session_id: string;

  @Column({ type: 'enum', enum: MessageRole })
  role: MessageRole;

  @Column({ type: 'text' })
  content: string;

  /** 附加数据：如图表数据、工具调用结果等 */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Session, (session) => session.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: Session;
}
