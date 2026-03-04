export interface FileMetadata {
  key: string;
  size: number;
  mimeType: string;
  uploadDate: Date;
  etag: string;
  bucket: string;
}

export interface UploadFileRequest {
  file: Express.Multer.File;
  bucket?: string;
}

export interface UploadFileResponse {
  url: string;
  key: string;
  metadata: FileMetadata;
}

export interface DownloadFileResponse {
  buffer: Buffer;
  metadata: FileMetadata;
}

export interface ListFilesRequest {
  prefix?: string;
  limit?: number;
  startAfter?: string;
}

export interface ListFilesResponse {
  files: FileMetadata[];
  nextToken?: string;
}

export interface DeleteFileRequest {
  key: string;
  bucket?: string;
}

export interface GetFileMetadataRequest {
  key: string;
  bucket?: string;
}
