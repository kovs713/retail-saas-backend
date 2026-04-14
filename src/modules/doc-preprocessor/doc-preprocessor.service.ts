import { LoggerService } from '@/core/logger/logger.service';
import { PreprocessDocumentDto, TargetDocumentType } from './dto';

import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface PreprocessResult {
  buffer: Buffer;
  contentType: string;
  contentDisposition: string;
}

@Injectable()
export class DocPreprocessorService {
  private readonly logger: LoggerService = new LoggerService(DocPreprocessorService.name);

  constructor(private readonly configService: ConfigService) {}

  async preprocess(file: Express.Multer.File, dto: PreprocessDocumentDto): Promise<PreprocessResult> {
    const serviceUrl = this.configService.getOrThrow<string>('DOC_PREPROCESSOR_URL');
    const timeoutMs = Number(this.configService.getOrThrow<number>('DOC_PREPROCESSOR_TIMEOUT_MS'));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(file.buffer)]), file.originalname);
    formData.append('target_type', dto.targetType ?? TargetDocumentType.TXT);

    if (dto.sourceType) {
      formData.append('source_type', dto.sourceType);
    }

    formData.append('remove_noise', String(dto.removeNoise ?? true));
    formData.append('normalize_whitespace', String(dto.normalizeWhitespace ?? true));
    formData.append('lowercase', String(dto.lowercase ?? false));

    try {
      const response = await fetch(`${serviceUrl}/preprocess-document`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Doc preprocessor failed: ${response.status} ${body}`);
        throw new BadGatewayException('Document preprocess failed');
      }

      return {
        buffer: Buffer.from(await response.arrayBuffer()),
        contentType: response.headers.get('content-type') ?? 'application/octet-stream',
        contentDisposition:
          response.headers.get('content-disposition') ??
          this.buildContentDisposition(file.originalname, dto.targetType),
      };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Doc preprocessor request failed: ${message}`);
      throw new BadGatewayException('Document preprocessor service unavailable');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildContentDisposition(filename: string, targetType?: TargetDocumentType): string {
    const safeName = filename.replace(/\.[^.]+$/, '');
    const extension = targetType ?? TargetDocumentType.TXT;
    return `attachment; filename="${safeName}.${extension}"`;
  }
}
