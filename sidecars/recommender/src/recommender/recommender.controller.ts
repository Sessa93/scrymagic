import { Body, Controller, Post } from '@nestjs/common';
import { RecommenderService } from './recommender.service';
import { RecommendByTextDto } from './dto/recommend-by-text.dto';
import { RecommendVisualDto } from './dto/recommend-visual.dto';
import { IngestScryfallDto } from './dto/ingest-scryfall.dto';

@Controller('recommender')
export class RecommenderController {
  constructor(private readonly recommenderService: RecommenderService) {}

  @Post('recommend/oracle')
  recommendByOracle(@Body() dto: RecommendByTextDto) {
    return this.recommenderService.recommendByOracle(dto);
  }

  @Post('recommend/flavor')
  recommendByFlavor(@Body() dto: RecommendByTextDto) {
    return this.recommenderService.recommendByFlavor(dto);
  }

  @Post('recommend/visual')
  recommendVisually(@Body() dto: RecommendVisualDto) {
    return this.recommenderService.recommendVisuallySimilar(dto);
  }

  @Post('ingest/scryfall')
  ingestScryfallBulk(@Body() dto: IngestScryfallDto) {
    return this.recommenderService.ingestScryfallBulk(dto);
  }
}
