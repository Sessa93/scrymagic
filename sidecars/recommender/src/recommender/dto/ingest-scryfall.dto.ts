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
  @Max(1024)
  batchSize: number = 64;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(16)
  workerCount: number = 1;
}
