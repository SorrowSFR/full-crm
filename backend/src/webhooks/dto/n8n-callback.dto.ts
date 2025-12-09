import { IsString, IsOptional, IsObject, IsEnum, IsISO8601 } from 'class-validator';

export enum LeadOutcomeEnum {
  QUALIFIED = 'qualified',
  SITE_VISIT_SCHEDULED = 'site_visit_scheduled',
  MEETING_SCHEDULED = 'meeting_scheduled',
  NO_ANSWER = 'no_answer',
  FAILED = 'failed',
  VALIDATION_ERROR = 'validation_error',
}

export class N8nCallbackDto {
  @IsString()
  campaign_id: string;

  @IsString()
  lead_id: string;

  @IsString()
  phone: string;

  @IsEnum(LeadOutcomeEnum)
  outcome: LeadOutcomeEnum;

  @IsOptional()
  @IsObject()
  site_visit_details?: {
    datetime: string;
    location: string;
  };

  @IsOptional()
  @IsObject()
  meeting_details?: {
    datetime: string;
    location: string;
  };

  @IsISO8601()
  timestamp: string;
}

