import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateAcademicProfileDto {
  @IsOptional() @IsString() currentDegreeLevel?: string;
  @IsOptional() @IsString() currentUniversity?: string;
  @IsOptional() @IsString() currentDepartment?: string;
  @IsOptional() @IsString() targetDegree?: string;
  @IsOptional() @IsString() targetIntake?: string;
  @IsOptional() @Type(() => Number) @IsNumber() gpa?: number;
  @IsOptional() @IsString() gradingScale?: string;
  @IsOptional() @IsString() researchSummary?: string;
  @IsOptional() @Type(() => Number) @IsNumber() publicationsCount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() researchExperienceYears?: number;
  @IsOptional() @IsArray() preferredCountries?: string[];
  @IsOptional() @IsArray() preferredUniversities?: string[];
  @IsOptional() @IsArray() preferredFundingTypes?: string[];
  @IsOptional() @IsArray() preferredResearchAreas?: string[];
  @IsOptional() @IsBoolean() confirmParsedData?: boolean;
}

export class ParseCvDto {
  @IsString() rawText!: string;
  @IsOptional() @IsString() sourceFileName?: string;
}

export class RefreshMatchesDto {
  @IsOptional() @IsBoolean() force?: boolean;
  @IsOptional() @IsIn(['all', 'professor', 'scholarship']) targetType?: 'all' | 'professor' | 'scholarship';
}

export class MatchListQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100) perPage?: number;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minScore?: number;
}

export class AdminRecalculateMatchesDto {
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() targetType?: string;
  @IsOptional() @IsBoolean() force?: boolean;
  @IsOptional() @IsObject() filters?: Record<string, unknown>;
}
