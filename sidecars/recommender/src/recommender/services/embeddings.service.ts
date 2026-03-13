import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingsService {
  private readonly model =
    process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';

  private readonly client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  async embedOne(text: string): Promise<number[]> {
    const [vector] = await this.embedMany([text]);
    return vector;
  }

  async embedManyOptional(texts: string[]): Promise<Array<number[] | null>> {
    const nonEmpty = texts
      .map((text, index) => ({ text: text.trim(), index }))
      .filter((entry) => entry.text.length > 0);

    if (nonEmpty.length === 0) {
      return texts.map(() => null);
    }

    const vectors = await this.embedMany(nonEmpty.map((entry) => entry.text));
    const result: Array<number[] | null> = texts.map(() => null);

    nonEmpty.forEach((entry, i) => {
      result[entry.index] = vectors[i];
    });

    return result;
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for embedding generation');
    }

    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
    });

    return response.data.map((item) => item.embedding);
  }
}
