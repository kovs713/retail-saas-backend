import { ChatGroqClient } from '@/common/types';
import { LLMModule } from './llm.module';
import { LLMService } from './llm.service';

import { ConfigService } from '@nestjs/config';

describe('LLMModule', () => {
  it('forRootAsync should return a dynamic module', () => {
    const dynamicModule = LLMModule.forRootAsync();

    expect(dynamicModule.module).toBe(LLMModule);
    expect(dynamicModule.providers).toBeDefined();
    expect(dynamicModule.exports).toContain(LLMService);
  });

  it('should configure ChatGroq client provider', () => {
    const dynamicModule = LLMModule.forRootAsync();

    const chatGroqProvider = dynamicModule.providers?.find(
      (p) => typeof p === 'object' && 'provide' in p && p.provide === ChatGroqClient,
    );

    expect(chatGroqProvider).toBeDefined();
  });

  it('should inject ConfigService for ChatGroq configuration', () => {
    const dynamicModule = LLMModule.forRootAsync();

    const chatGroqProvider = dynamicModule.providers?.find(
      (p) => typeof p === 'object' && 'provide' in p && p.provide === ChatGroqClient,
    );

    expect((chatGroqProvider as any)?.inject).toContain(ConfigService);
  });

  it('should include LoggerService and LLMService as providers', () => {
    const dynamicModule = LLMModule.forRootAsync();

    expect(dynamicModule.providers).toBeDefined();
  });
});
