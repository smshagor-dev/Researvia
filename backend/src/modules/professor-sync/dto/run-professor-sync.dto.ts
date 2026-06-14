import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RunDiscoverySyncDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  universityIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  researchAreaIds?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(['openalex', 'orcid', 'crossref', 'ror'], { each: true })
  sourceTypes?: Array<'openalex' | 'orcid' | 'crossref' | 'ror'>;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limitPerCombination?: number;
}

