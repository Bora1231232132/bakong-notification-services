import { IsString, IsOptional } from 'class-validator'

export class UpdateWorkflowItemDto {
  @IsString()
  @IsOptional()
  title?: string

  @IsString()
  @IsOptional()
  description?: string
}
