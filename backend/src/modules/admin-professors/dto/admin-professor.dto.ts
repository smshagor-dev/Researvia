import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AcceptingStudents, DataSource, ProfessorPosition, VerificationStatus } from '@prisma/client';

export class AdminProfessorFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  university?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ enum: VerificationStatus })
  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional({ enum: AcceptingStudents })
  @IsOptional()
  @IsEnum(AcceptingStudents)
  acceptingStudents?: AcceptingStudents;

  @ApiPropertyOptional({ enum: DataSource })
  @IsOptional()
  @IsEnum(DataSource)
  sourceType?: DataSource;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdAtFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdAtTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  updatedAtFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  updatedAtTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 25;

  @ApiPropertyOptional({
    enum: ['createdAt', 'updatedAt', 'name', 'university', 'country', 'verificationStatus', 'lastSyncedAt', 'dataQualityScore'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class AdminProfessorUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  universityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string | null;

  @ApiPropertyOptional({ enum: ProfessorPosition })
  @IsOptional()
  @IsEnum(ProfessorPosition)
  position?: ProfessorPosition | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string | null;

  @ApiPropertyOptional({ enum: AcceptingStudents })
  @IsOptional()
  @IsEnum(AcceptingStudents)
  acceptingStudents?: AcceptingStudents;

  @ApiPropertyOptional({ enum: VerificationStatus })
  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional({ enum: DataSource })
  @IsOptional()
  @IsEnum(DataSource)
  sourceType?: DataSource;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  dataQualityScore?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  lastSyncedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  lastVerifiedAt?: string | null;
}

export class AdminProfessorListDto {
  id!: string;
  name!: string;
  university!: string | null;
  country!: string | null;
  department!: string | null;
  researchAreas!: string[];
  verifiedEmailCount!: number;
  verificationStatus!: VerificationStatus;
  isPublic!: boolean;
  sourceType!: DataSource;
  dataQualityScore!: number | null;
  lastSyncedAt!: Date | null;
  createdAt!: Date;
}

export class AdminProfessorDetailDto extends AdminProfessorListDto {
  updatedAt!: Date;
  acceptingStudents!: AcceptingStudents;
  fullName!: string;
  firstName!: string | null;
  lastName!: string | null;
  title!: string | null;
  position!: ProfessorPosition | null;
  bio!: string | null;
  lastVerifiedAt!: Date | null;
  universityId!: string;
  departmentId!: string | null;
  emails!: Array<{
    id: string;
    email: string;
    isPrimary: boolean;
    isVerified: boolean;
    verificationStatus: VerificationStatus;
    verifiedAt: Date | null;
  }>;
}
