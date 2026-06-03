import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { MemoryType } from '../agent.entity';

export class CreateAgentDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  system_prompt?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsEnum(MemoryType)
  memory_type?: MemoryType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tools?: string[];

  @IsOptional()
  @IsString()
  collection_id?: string;
}
