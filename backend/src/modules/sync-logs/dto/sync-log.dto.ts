import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SyncLogsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  queueName?: string;

  @IsOptional()
  @IsIn(['queued', 'running', 'completed', 'failed', 'partial'])
  status?: 'queued' | 'running' | 'completed' | 'failed' | 'partial';
}

