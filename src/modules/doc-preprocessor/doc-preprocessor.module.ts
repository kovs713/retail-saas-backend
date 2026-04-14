import { DocPreprocessorController } from './doc-preprocessor.controller';
import { DocPreprocessorService } from './doc-preprocessor.service';

import { Module } from '@nestjs/common';

@Module({
  controllers: [DocPreprocessorController],
  providers: [DocPreprocessorService],
  exports: [DocPreprocessorService],
})
export class DocPreprocessorModule {}
