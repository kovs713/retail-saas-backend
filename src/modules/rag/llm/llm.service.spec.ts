import { LLMService } from './llm.service';
import { ChatGroqClient } from '@/common/types/providers.type';

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGroq } from '@langchain/groq';
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('@/core/logger/app-logger.service', () => ({
  AppLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
}));

describe('LLMService', () => {
  let service: LLMService;
  let chatGroqClient: ChatGroq;

  const mockResponse = {
    content: 'Test response',
  };

  beforeEach(async () => {
    chatGroqClient = {
      invoke: jest.fn().mockResolvedValue(mockResponse),
    } as unknown as ChatGroq;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LLMService,
        {
          provide: ChatGroqClient,
          useValue: chatGroqClient,
        },
      ],
    }).compile();

    service = module.get<LLMService>(LLMService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateText', () => {
    it('should send prompt to Groq API', async () => {
      const prompt = 'Test prompt';

      const result = await service.generateText(prompt);

      expect(chatGroqClient.invoke).toHaveBeenCalled();
      expect(result).toBe('Test response');
    });

    it('should include system message when provided', async () => {
      const prompt = 'Test prompt';
      const systemMessage = 'You are a helpful assistant';

      await service.generateText(prompt, systemMessage);

      expect(chatGroqClient.invoke).toHaveBeenCalledWith([new SystemMessage(systemMessage), new HumanMessage(prompt)]);
    });

    it('should handle prompt without system message', async () => {
      const prompt = 'Test prompt';

      await service.generateText(prompt);

      expect(chatGroqClient.invoke).toHaveBeenCalledWith([new HumanMessage(prompt)]);
    });

    it('should return string content from response', async () => {
      const result = await service.generateText('Test');

      expect(typeof result).toBe('string');
    });
  });

  describe('generateWithMessages', () => {
    it('should handle conversation history', async () => {
      const messages: (HumanMessage | SystemMessage)[] = [
        new SystemMessage('You are helpful'),
        new HumanMessage('Hello'),
      ];

      const result = await service.generateWithMessages(messages);

      expect(chatGroqClient.invoke).toHaveBeenCalledWith(messages);
      expect(result).toBe('Test response');
    });

    it('should work with only human messages', async () => {
      const messages: (HumanMessage | SystemMessage)[] = [new HumanMessage('Hello')];

      await service.generateWithMessages(messages);

      expect(chatGroqClient.invoke).toHaveBeenCalledWith(messages);
    });
  });

  describe('getLLM', () => {
    it('should return ChatGroq client instance', () => {
      const llm = service.getLLM();

      expect(llm).toBe(chatGroqClient);
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const error = new Error('API error');
      (chatGroqClient.invoke as jest.Mock).mockRejectedValue(error);

      await expect(service.generateText('Test')).rejects.toThrow('API error');
    });
  });
});
