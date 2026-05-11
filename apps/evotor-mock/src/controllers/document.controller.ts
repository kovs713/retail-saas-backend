import { AppService } from '../app.service';
import { MockDocument } from '../types';

import { Controller, Get, NotFoundException, Param } from '@nestjs/common';

@Controller()
export class DocumentController {
  constructor(private readonly appService: AppService) {}

  @Get('stores/:storeId/documents')
  getDocuments(
    @Param('storeId')
    storeId: string,
  ) {
    return {
      items: this.appService.getDocumentsByStoreId(storeId),
      paging: {},
    };
  }

  @Get('stores/:storeId/documents/:documentId')
  getDocument(
    @Param('storeId')
    storeId: string,
    @Param('documentId')
    documentId: string,
  ): MockDocument {
    const document = this.appService.getDocumentById(storeId, documentId);

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  @Get('stores/:storeId/devices/:deviceId/documents')
  getDeviceDocuments(
    @Param('storeId')
    storeId: string,
    @Param('deviceId')
    deviceId: string,
  ) {
    return {
      items: this.appService.getDocumentsByDeviceId(storeId, deviceId),
      paging: {},
    };
  }
}
