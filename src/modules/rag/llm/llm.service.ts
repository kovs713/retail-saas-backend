import { AppLogger } from '@/app/core/logger/app-logger.service';
import { ChatGroqClient } from '@/common/types/providers.type';

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGroq } from '@langchain/groq';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class LLMService {
  private readonly logger = new AppLogger(LLMService.name);

  constructor(@Inject(ChatGroqClient) private readonly chatGroqClient: ChatGroq) {}

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

  getLLM(): ChatGroq {
    return this.chatGroqClient;
  }
}
