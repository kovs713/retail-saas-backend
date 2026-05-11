import { AuthGuard } from '@/common/guards';
import { LoggerService } from '@/core/logger/logger.service';
import { TargetDocumentType } from './doc-preprocessor.enum';
import { DocPreprocessorService } from './doc-preprocessor.service';
import { PreprocessDocumentDto } from './dto';

import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('Document preprocessing')
@ApiBearerAuth('JWT')
@Controller('documents')
@UseGuards(AuthGuard)
export class DocPreprocessorController {
  private readonly logger: LoggerService = new LoggerService(
    DocPreprocessorController.name,
  );

  constructor(
    private readonly docPreprocessorService: DocPreprocessorService,
  ) {}

  @Post('preprocess')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Preprocess and convert uploaded document',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        targetType: {
          type: 'string',
          enum: Object.values(TargetDocumentType),
          default: TargetDocumentType.TXT,
        },
        sourceType: {
          type: 'string',
          enum: ['txt', 'md', 'json', 'docx', 'pdf'],
        },
        removeNoise: { type: 'boolean', default: true },
        normalizeWhitespace: { type: 'boolean', default: true },
        lowercase: { type: 'boolean', default: false },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Processed file',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request payload',
  })
  @ApiResponse({
    status: 502,
    description: 'Doc preprocessor unavailable',
  })
  async preprocessDocument(
    @UploadedFile()
    file: Express.Multer.File,
    @Body()
    dto: PreprocessDocumentDto,
    @Res({ passthrough: true })
    response: Response,
  ): Promise<StreamableFile> {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    this.logger.log(`Forwarding file ${file.originalname} to doc preprocessor`);
    const result = await this.docPreprocessorService.preprocess(file, dto);

    response.setHeader('Content-Type', result.contentType);
    response.setHeader('Content-Disposition', result.contentDisposition);

    return new StreamableFile(result.buffer);
  }
}
