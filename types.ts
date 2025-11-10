
export interface ChatMessage {
  id: string;
  sender: 'user' | 'model';
  text: string;
  sources?: { uri: string; title: string }[];
}