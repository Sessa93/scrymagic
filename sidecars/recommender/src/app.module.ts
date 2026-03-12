import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RecommenderModule } from './recommender/recommender.module';

@Module({
  imports: [RecommenderModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
