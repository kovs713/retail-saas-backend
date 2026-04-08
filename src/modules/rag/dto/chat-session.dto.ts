export interface ChatMessageEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSessionDto {
  id: string;
  shopId: string;
  messages: ChatMessageEntry[];
  createdAt: string;
  updatedAt: string;
}
