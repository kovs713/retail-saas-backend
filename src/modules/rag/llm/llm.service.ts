import { ChatGroqClient } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGroq } from '@langchain/groq';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class LLMService {
  private readonly logger = new LoggerService(LLMService.name);

  constructor(
    @Inject(ChatGroqClient)
    private readonly chatGroqClient: ChatGroq,
  ) {}

  async generateText(prompt: string, systemMessage?: string): Promise<string> {
    const messages = systemMessage
      ? [new SystemMessage(systemMessage), new HumanMessage(prompt)]
      : [new HumanMessage(prompt)];

    const response = await this.chatGroqClient.invoke(messages);
    return response.content as string;
  }

  async generateWithMessages(messages: (HumanMessage | SystemMessage)[]): Promise<string> {
    const response = await this.chatGroqClient.invoke(messages);
    return response.content as string;
  }

  async *generateStream(prompt: string, systemMessage?: string): AsyncGenerator<string> {
    const messages = systemMessage
      ? [new SystemMessage(systemMessage), new HumanMessage(prompt)]
      : [new HumanMessage(prompt)];

    const stream = await this.chatGroqClient.stream(messages);

    for await (const chunk of stream) {
      const content = chunk.content as string;
      if (content) {
        yield content;
      }
    }
  }

  getLLM(): ChatGroq {
    return this.chatGroqClient;
  }
}
