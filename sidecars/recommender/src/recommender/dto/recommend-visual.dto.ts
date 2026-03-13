import { IsInt, IsString, Max, Min } from 'class-validator';

export class RecommendVisualDto {
  @IsString()
  cardId!: string;

  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 12;
}
