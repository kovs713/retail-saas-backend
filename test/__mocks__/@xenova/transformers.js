const { OllamaEmbeddings } = require('@langchain/ollama');

const mockEmbedQuery = jest.fn().mockResolvedValue(new Array(1024).fill(0).map(() => Math.random() - 0.5));
const mockEmbedDocuments = jest.fn().mockResolvedValue([new Array(1024).fill(0).map(() => Math.random() - 0.5)]);

class MockOllamaEmbeddings {
  constructor(options) {
    this.model = options?.model || 'embeddinggemma';
    this.baseUrl = options?.baseUrl || 'http://ollama:11435';
  }

  embedQuery = mockEmbedQuery;
  embedDocuments = mockEmbedDocuments;
}

module.exports = {
  OllamaEmbeddings: MockOllamaEmbeddings,
  mockEmbedQuery,
  mockEmbedDocuments,
};
