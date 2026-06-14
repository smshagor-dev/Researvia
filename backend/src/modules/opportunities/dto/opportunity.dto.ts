import {
  ApplicationStatus,
  InterviewStatus,
  OpportunityStatus,
  OpportunityType,
  OpportunityVerificationStatus,
} from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  opportunityId!: string;

  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateApplicationDto {
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateInterviewDto {
  @IsString()
  applicationId!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsString()
  @MaxLength(100)
  timezone!: string;

  @IsOptional()
  @IsUrl()
  meetingLink?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(InterviewStatus)
  status?: InterviewStatus;
}

export class UpdateInterviewDto {
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsUrl()
  meetingLink?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(InterviewStatus)
  status?: InterviewStatus;
}

export class UpdateOpportunityDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(OpportunityType)
  type?: OpportunityType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsUrl()
  officialUrl?: string;

  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @IsOptional()
  @IsEnum(OpportunityVerificationStatus)
  verificationStatus?: OpportunityVerificationStatus;

  @IsOptional()
  @IsEnum(OpportunityStatus)
  status?: OpportunityStatus;

  @IsOptional()
  @IsBoolean()
  isFullyFunded?: boolean;
}
