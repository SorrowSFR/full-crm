import { IsString, IsOptional, IsObject } from 'class-validator';

export class ColumnMappingDto {
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, string>;
}

export class CreateCampaignDto {
  @IsString()
  agent_reference: string;

  @IsObject()
  column_mapping: ColumnMappingDto;
}

