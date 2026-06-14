import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EnglishTestType,
  ExperienceType,
  PreferredEmailTone,
  SkillCategory,
  StudentDegreeLevel,
  StudentDocumentType,
  StudentInterestedDegree,
} from '@prisma/client';

const FundingNeedValues = {
  FULLY_FUNDED: 'FULLY_FUNDED',
  PARTIAL_FUNDED: 'PARTIAL_FUNDED',
  SELF_FUNDED: 'SELF_FUNDED',
  ANY: 'ANY',
} as const;

class OnboardingBasicDto {
  @IsString() fullName!: string;
  @IsOptional() @IsString() preferredName?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsString() currentCountry!: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsUrl() linkedin?: string;
  @IsOptional() @IsUrl() personalWebsite?: string;
  @IsOptional() @IsUrl() github?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() dateOfBirth?: string;
}

class AdditionalAcademicDto {
  @IsEnum(StudentDegreeLevel) currentDegreeLevel!: StudentDegreeLevel;
  @IsString() currentUniversity!: string;
  @IsString() department!: string;
  @IsString() majorSubject!: string;
  @IsOptional() @IsString() faculty?: string;
  @IsOptional() @IsString() currentYear?: string;
  @Type(() => Number) @IsInt() expectedGraduationYear!: number;
  @IsOptional() @Type(() => Number) @IsNumber() cgpa?: number;
  @IsOptional() @IsString() gradingScale?: string;
  @IsOptional() @IsString() thesisTitle?: string;
  @IsOptional() @IsString() supervisorName?: string;
}

class OnboardingAcademicDto {
  @IsEnum(StudentDegreeLevel) currentDegreeLevel!: StudentDegreeLevel;
  @IsString() currentUniversity!: string;
  @IsString() department!: string;
  @IsString() majorSubject!: string;
  @IsOptional() @IsString() faculty?: string;
  @IsOptional() @IsString() currentYear?: string;
  @Type(() => Number) @IsInt() expectedGraduationYear!: number;
  @IsOptional() @Type(() => Number) @IsNumber() cgpa?: number;
  @IsOptional() @IsString() gradingScale?: string;
  @IsOptional() @IsString() thesisTitle?: string;
  @IsOptional() @IsString() supervisorName?: string;
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AdditionalAcademicDto)
  @IsArray()
  additionalEducation?: AdditionalAcademicDto[];
}

class OnboardingResearchDto {
  @IsString() primaryResearchArea!: string;
  @IsOptional() @IsArray() secondaryResearchAreas?: string[];
  @IsOptional() @IsArray() keywords?: string[];
  @IsOptional() @IsArray() preferredResearchTopics?: string[];
  @IsEnum(StudentInterestedDegree) interestedDegree!: StudentInterestedDegree;
  @IsArray() preferredStudyCountries!: string[];
  @IsOptional() @IsArray() preferredUniversities?: string[];
  @IsOptional() @IsString() preferredIntake?: string;
  @IsArray() @IsEnum(FundingNeedValues, { each: true }) fundingNeed!: string[];
}

class SkillItemDto {
  @IsEnum(SkillCategory) category!: SkillCategory;
  @IsString() name!: string;
  @IsOptional() @IsString() level?: string;
}

class ExperienceItemDto {
  @IsEnum(ExperienceType) type!: ExperienceType;
  @IsString() title!: string;
  @IsOptional() @IsString() organization?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsString() description?: string;
}

class ProjectItemDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() technologies?: string[];
  @IsOptional() @IsUrl() link?: string;
}

class PublicationItemDto {
  @IsString() title!: string;
  @IsOptional() @IsString() journalOrConference?: string;
  @IsOptional() @Type(() => Number) @IsInt() year?: number;
  @IsOptional() @IsString() doi?: string;
  @IsOptional() @IsUrl() url?: string;
  @IsOptional() @IsString() publishedAt?: string;
  @IsOptional() @IsString() description?: string;
}

class OnboardingSkillsDto {
  @ValidateNested({ each: true })
  @Type(() => SkillItemDto)
  @IsArray()
  skills!: SkillItemDto[];

  @ValidateNested({ each: true })
  @Type(() => ExperienceItemDto)
  @IsOptional()
  @IsArray()
  experiences?: ExperienceItemDto[];

  @ValidateNested({ each: true })
  @Type(() => ProjectItemDto)
  @IsOptional()
  @IsArray()
  projects?: ProjectItemDto[];

  @ValidateNested({ each: true })
  @Type(() => PublicationItemDto)
  @IsOptional()
  @IsArray()
  publications?: PublicationItemDto[];
}

class PreferenceDto {
  @IsOptional() @IsString() shortBio?: string;
  @IsOptional() @IsString() careerGoal?: string;
  @IsOptional() @IsString() whyInterestedInResearch?: string;
  @IsOptional() @IsEnum(PreferredEmailTone) preferredEmailTone?: PreferredEmailTone;
  @IsOptional() @IsString() emailSignature?: string;
  @IsOptional() @IsString() defaultSendingEmailAccountId?: string;
  @IsOptional() @IsEnum(StudentInterestedDegree) targetDegree?: StudentInterestedDegree;
  @IsOptional() @IsArray() targetCountries?: string[];
  @IsOptional() @IsString() targetIntake?: string;
  @IsOptional() @IsString() budgetRange?: string;
  @IsOptional() @IsEnum(EnglishTestType) englishTest?: EnglishTestType;
  @IsOptional() @Type(() => Number) @IsNumber() englishScore?: number;
  @IsOptional() @Type(() => Number) @IsNumber() greScore?: number;
  @IsOptional() @Type(() => Number) @IsNumber() gmatScore?: number;
  @IsOptional() @Type(() => Number) @IsInt() publicationCount?: number;
}

export class StudentOnboardingDto {
  @ValidateNested() @Type(() => OnboardingBasicDto) basic!: OnboardingBasicDto;
  @ValidateNested() @Type(() => OnboardingAcademicDto) academic!: OnboardingAcademicDto;
  @ValidateNested() @Type(() => OnboardingResearchDto) research!: OnboardingResearchDto;
  @ValidateNested() @Type(() => OnboardingSkillsDto) skills!: OnboardingSkillsDto;
  @ValidateNested() @Type(() => PreferenceDto) @IsOptional() preferences?: PreferenceDto;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) onboardingStep?: number;
  @IsOptional() @IsBoolean() onboardingCompleted?: boolean;
}

export class UpdateStudentBasicDto extends OnboardingBasicDto {}
export class UpdateStudentAcademicDto extends OnboardingAcademicDto {}
export class UpdateStudentResearchDto extends OnboardingResearchDto {}
export class UpdateStudentSkillsDto extends OnboardingSkillsDto {}
export class UpdateStudentPreferencesDto extends PreferenceDto {}

export class UpdateStudentProfileDto {
  @IsOptional() @ValidateNested() @Type(() => OnboardingBasicDto) basic?: OnboardingBasicDto;
  @IsOptional() @ValidateNested() @Type(() => OnboardingAcademicDto) academic?: OnboardingAcademicDto;
  @IsOptional() @ValidateNested() @Type(() => OnboardingResearchDto) research?: OnboardingResearchDto;
  @IsOptional() @ValidateNested() @Type(() => OnboardingSkillsDto) skills?: OnboardingSkillsDto;
  @IsOptional() @ValidateNested() @Type(() => PreferenceDto) preferences?: PreferenceDto;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) onboardingStep?: number;
  @IsOptional() @IsBoolean() onboardingCompleted?: boolean;
}

export class UploadStudentDocumentDto {
  @IsEnum(StudentDocumentType) type!: StudentDocumentType;
}
