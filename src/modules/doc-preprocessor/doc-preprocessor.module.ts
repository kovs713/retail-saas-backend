import { DocPreprocessorController } from './doc-preprocessor.controller';
import { DocPreprocessorService } from './doc-preprocessor.service';
import { DocPreprocessorOptions } from './doc-preprocessor.type';

import { DocPreprocessorConfig } from '@/common/types';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({})
export class DocPreprocessorModule {
  static forRoot(): DynamicModule {
    return {
      module: DocPreprocessorModule,
      controllers: [DocPreprocessorController],
      providers: [
        {
          provide: DocPreprocessorConfig,
          inject: [ConfigService],
          useFactory: (configService: ConfigService): DocPreprocessorOptions => ({
            docPreprocessorTimeoutMs: configService.getOrThrow<number>('DOC_PREPROCESSOR_TIMEOUT_MS'),
            docPreprocessorUrl: configService.getOrThrow<string>('DOC_PREPROCESSOR_URL'),
          }),
        },

        DocPreprocessorService,
      ],
      exports: [DocPreprocessorService],
    };
  }
}
