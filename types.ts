export interface Tag {
  id: string;
  name: string;
}

export interface FeedItem {
  id: string;
  type: 'rss' | 'spark';
  title: string;
  link?: string;
  content: string;
  summary_ai?: string;
  is_read: boolean;
  is_spark: boolean;
  tags: Tag[];
  createdAt: string;
}

export interface RssFeed {
  id: string;
  url: string;
  name: string;
}
