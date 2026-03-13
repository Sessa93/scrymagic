import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RecommendByTextDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsString()
  excludeCardId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 12;
}
