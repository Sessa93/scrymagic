import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class IngestScryfallDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20000)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(256)
  batchSize: number = 32;
}
