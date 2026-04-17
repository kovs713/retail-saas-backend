export interface ChatMessageEntry {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSessionDto {
  id: string;
  shopId: string;
  userId: string;
  title: string;
  status: 'active' | 'archived';
  warmStatus: 'pending' | 'ready' | 'failed';
  warmProductSnapshotAt: string | null;
  warmProductSummary: Record<string, unknown> | null;
  messages: ChatMessageEntry[];
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSessionMetadataDto {
  id: string;
  title: string;
  status: 'active' | 'archived';
  warmStatus: 'pending' | 'ready' | 'failed';
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}
