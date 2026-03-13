import { Module } from '@nestjs/common';
import { RecommenderController } from './recommender.controller';
import { RecommenderService } from './recommender.service';
import { PgVectorService } from './services/pg-vector.service';
import { EmbeddingsService } from './services/embeddings.service';
import { ScryfallBulkService } from './services/scryfall-bulk.service';

@Module({
  controllers: [RecommenderController],
  providers: [
    RecommenderService,
    PgVectorService,
    EmbeddingsService,
    ScryfallBulkService,
  ],
})
export class RecommenderModule {}
