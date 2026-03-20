export type Category = 'A LA UNE' | 'POLITIQUE' | 'ECONOMIE' | 'TECH' | 'CULTURE' | 'SPORT';

export type Language = 'FR' | 'EN' | 'AR';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: Category;
  date: string;
  author: string;
  imageUrl: string;
  readTime: string;
  isBreaking?: boolean;
}

export interface RadioState {
  isPlaying: boolean;
  isSpeaking: boolean;
  currentArticleIndex: number;
  voice: string;
}
