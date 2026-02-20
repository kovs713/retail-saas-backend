import { AppLogger } from '@/common/logger/app-logger.service';
import { ChatGroqClient } from '@/common/types/providers.type';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGroq } from '@langchain/groq';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class LLMService {
  private readonly logger = new AppLogger(LLMService.name);

  constructor(
    @Inject(ChatGroqClient) private readonly chatGroqClient: ChatGroq,
  ) {}

  /**
   * Generate text response from a single prompt
   * @param prompt - The input prompt
   * @param systemMessage - Optional system message to set context
   * @returns Promise<string> - The generated response
   */
  async generateText(prompt: string, systemMessage?: string): Promise<string> {
    try {
      const messages = systemMessage
        ? [new SystemMessage(systemMessage), new HumanMessage(prompt)]
        : [new HumanMessage(prompt)];

      const response = await this.chatGroqClient.invoke(messages);
      return response.content as string;
    } catch (error) {
      this.logger.error(
        `Failed to generate text: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Generate text response with custom messages
   * @param messages - Array of messages (HumanMessage, SystemMessage, etc.)
   * @returns Promise<string> - The generated response
   */
  async generateWithMessages(
    messages: (HumanMessage | SystemMessage)[],
  ): Promise<string> {
    try {
      const response = await this.chatGroqClient.invoke(messages);
      return response.content as string;
    } catch (error) {
      this.logger.error(
        `Failed to generate with messages: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Get the underlying ChatGroq instance for advanced usage
   * @returns Promise<ChatGroq> - The LangChain ChatGroq instance
   */
  getLLM(): ChatGroq {
    return this.chatGroqClient;
  }
}
