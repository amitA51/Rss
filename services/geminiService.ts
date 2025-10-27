import { GoogleGenAI, Type } from "@google/genai";
import type { FeedItem, Tag, RssFeed } from '../types';
import { mockFeedItems, mockTags, mockRssFeeds, saveFeedItems, saveRssFeeds, saveTags } from './mockData';

// This is a placeholder for the API key which should be handled by the environment.
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  // In a real app, you might want to handle this more gracefully.
  console.warn("API_KEY is not set. AI features will not work.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- MOCK API FUNCTIONS ---

const ITEMS_PER_PAGE = 10;

export const getFeedItems = (page: number): Promise<FeedItem[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const sortedItems = [...mockFeedItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const start = (page - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const paginatedItems = sortedItems.slice(start, end);
      resolve(paginatedItems);
    }, 500);
  });
};

export const updateFeedItem = (id: string, updates: Partial<Pick<FeedItem, 'is_read' | 'summary_ai'>>): Promise<FeedItem> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = mockFeedItems.findIndex(item => item.id === id);
            if (index > -1) {
                mockFeedItems[index] = { ...mockFeedItems[index], ...updates };
                saveFeedItems();
                resolve(mockFeedItems[index]);
            } else {
                reject(new Error("Feed item not found"));
            }
        }, 100);
    });
};


export const getTags = (): Promise<Tag[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([...mockTags]);
    }, 200);
  });
};

export const addTag = (name: string): Promise<Tag> => {
    return new Promise((resolve, reject) => {
        if (mockTags.some(tag => tag.name.toLowerCase() === name.toLowerCase())) {
            return reject(new Error("Tag already exists"));
        }
        setTimeout(() => {
            const newTag: Tag = { id: `tag-${Date.now()}`, name };
            mockTags.push(newTag);
            saveTags();
            resolve(newTag);
        }, 200);
    });
};

export const removeTag = (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = mockTags.findIndex(tag => tag.id === id);
            if (index > -1) {
                mockTags.splice(index, 1);
                saveTags();
                resolve();
            } else {
                reject(new Error("Tag not found"));
            }
        }, 200);
    });
};

export const searchFeedItems = (query: string): Promise<FeedItem[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            if (!query) {
                resolve([]);
                return;
            }
            const lowerCaseQuery = query.toLowerCase();
            const results = mockFeedItems.filter(item => 
                item.title.toLowerCase().includes(lowerCaseQuery) ||
                item.content.toLowerCase().includes(lowerCaseQuery) ||
                item.tags.some(tag => tag.name.toLowerCase().includes(lowerCaseQuery))
            );
            resolve(results);
        }, 300);
    });
};

export const addSpark = (spark: { title: string, content: string, tags: Tag[] }): Promise<FeedItem> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const newSpark: FeedItem = {
                id: `spark-${Date.now()}`,
                type: 'spark',
                is_read: false,
                is_spark: true,
                createdAt: new Date().toISOString(),
                ...spark
            };
            mockFeedItems.unshift(newSpark);
            saveFeedItems();
            resolve(newSpark);
        }, 500);
    });
};

export const getFeeds = (): Promise<RssFeed[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve([...mockRssFeeds]);
        }, 300);
    });
};

export const addFeed = (url: string): Promise<RssFeed> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const urlObject = new URL(url);
            let name = urlObject.hostname.replace(/^www\./, '');
            name = name.charAt(0).toUpperCase() + name.slice(1);

            const newFeed: RssFeed = {
                id: `rss-${Date.now()}`,
                url,
                name,
            };
            mockRssFeeds.push(newFeed);
            saveRssFeeds();
            resolve(newFeed);
        }, 500);
    });
};

export const removeFeed = (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = mockRssFeeds.findIndex(feed => feed.id === id);
            if (index > -1) {
                mockRssFeeds.splice(index, 1);
                saveRssFeeds();
                resolve();
            } else {
                reject(new Error("Feed not found"));
            }
        }, 300);
    });
};

export const getAllItems = (): Promise<FeedItem[]> => {
  return new Promise(resolve => resolve([...mockFeedItems]));
};


// --- LIVE RSS FETCHING ---

const fetchAndParseRssFeed = async (feed: RssFeed): Promise<FeedItem[]> => {
    if (!API_KEY) throw new Error("API key not configured.");
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `Fetch and parse the RSS feed from this URL: ${feed.url}. For each item, extract the title, link, publication date (pubDate), a unique identifier (guid), and a plain text version of the description or content. Ensure the publication date is a valid ISO 8601 string. Return up to 10 recent items.`,
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        items: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    link: { type: Type.STRING },
                                    pubDate: { type: Type.STRING, description: 'The publication date in ISO 8601 format.' },
                                    content: { type: Type.STRING, description: 'Plain text content or description.' },
                                    guid: { type: Type.STRING, description: 'A unique identifier for the item.' }
                                },
                                required: ['title', 'link', 'pubDate', 'content', 'guid']
                            }
                        }
                    }
                }
            }
        });

        const rawText = response.text.trim();
        const jsonText = rawText.startsWith('```json') ? rawText.substring(7, rawText.length - 3).trim() : rawText;
        const data = JSON.parse(jsonText);

        if (!data.items || data.items.length === 0) {
            console.warn(`Feed "${feed.name}" returned no items from AI.`);
            return [];
        }

        return data.items.map((item: any): FeedItem => ({
            id: `rss-${btoa(item.guid || item.link)}`,
            type: 'rss',
            title: item.title,
            link: item.link,
            content: item.content.substring(0, 1500), // Truncate content
            is_read: false,
            is_spark: false,
            tags: [],
            createdAt: new Date(item.pubDate).toISOString(),
        }));
    } catch (error) {
        console.error(`Error processing feed ${feed.name} with AI:`, error);
        return [];
    }
};


export const refreshAllFeeds = async (): Promise<number> => {
    const allFeeds = await getFeeds();
    const fetchPromises = allFeeds.map(feed => fetchAndParseRssFeed(feed));
    
    const results = await Promise.all(fetchPromises);
    const newItems = results.flat();

    const existingIds = new Set(mockFeedItems.map(item => item.id));
    const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));

    if (uniqueNewItems.length > 0) {
        mockFeedItems.unshift(...uniqueNewItems);
        saveFeedItems();
    }
    
    return uniqueNewItems.length;
};


// --- GEMINI API FUNCTIONS ---

export const summarizeItemContent = async (content: string): Promise<string> => {
  if (!API_KEY) throw new Error("API key not configured.");
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the following text. Provide a concise summary in Hebrew. Then, generate 2-3 thought-provoking questions in Hebrew based on the text to encourage deeper thinking.
      Text: "${content}"`,
       config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  summary: { type: Type.STRING, description: 'The concise summary in Hebrew.' },
                  questions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'An array of 2-3 thought-provoking questions in Hebrew.'
                  }
              },
              required: ["summary", "questions"]
          }
      }
    });
    const rawText = response.text.trim();
    const jsonText = rawText.startsWith('```json') ? rawText.substring(7, rawText.length - 3).trim() : rawText;
    const result = JSON.parse(jsonText);
    const formattedSummary = `${result.summary}\n\n---\n\n*שאלות למחשבה:*\n${result.questions.map((q: string) => `- ${q}`).join('\n')}`;
    return formattedSummary;
  } catch (error) {
    console.error("Error calling Gemini API for summarization:", error);
    throw new Error("Failed to get summary from AI.");
  }
};

export const autoTagContent = async (content: string, availableTags: Tag[]): Promise<string[]> => {
    if (!API_KEY) throw new Error("API key not configured.");
    if (availableTags.length === 0) return [];
    
    const tagNames = availableTags.map(t => t.name);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Given the following text and a list of available tags, identify which tags apply.
            Text: "${content}"
            Available Tags: ${tagNames.join(', ')}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        tags: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: 'An applicable tag from the provided list.'
                            }
                        }
                    }
                }
            }
        });
        
        const rawText = response.text.trim();
        const jsonText = rawText.startsWith('```json') ? rawText.substring(7, rawText.length - 3).trim() : rawText;
        const jsonResponse = JSON.parse(jsonText);
        const matchedTagNames: string[] = jsonResponse.tags || [];
        
        const matchedTagIds = availableTags
            .filter(tag => matchedTagNames.includes(tag.name))
            .map(tag => tag.id);

        return matchedTagIds;

    } catch (error) {
        console.error("Error calling Gemini API for auto-tagging:", error);
        throw new Error("Failed to get auto-tags from AI.");
    }
};

export const getContentFromUrl = async (url: string): Promise<{ title: string, content: string }> => {
    if (!API_KEY) throw new Error("API key not configured.");
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `I will provide a URL. Please act as if you have fetched the content of the webpage at this URL. Based on its content, provide a suitable title for it and a comprehensive summary of the main text content, in Hebrew. Return the response in JSON format.
            URL: "${url}"`,
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: 'The generated title in Hebrew.' },
                        content: { type: Type.STRING, description: 'The generated summary in Hebrew.' }
                    },
                    required: ["title", "content"]
                }
            }
        });
        const rawText = response.text.trim();
        const jsonText = rawText.startsWith('```json') ? rawText.substring(7, rawText.length - 3).trim() : rawText;
        const data = JSON.parse(jsonText);
        return { title: data.title || 'לא נמצאה כותרת', content: data.content || 'לא נמצא תוכן' };
    } catch (error) {
        console.error("Error calling Gemini API for URL processing:", error);
        throw new Error("Failed to process URL with AI.");
    }
};

export const findRelatedItems = async (currentItem: FeedItem, allItems: FeedItem[]): Promise<FeedItem[]> => {
    if (!API_KEY) return [];
    const otherItems = allItems.filter(item => item.id !== currentItem.id);
    if (otherItems.length < 3) return [];

    const contextItems = otherItems.map(item => ({ id: item.id, title: item.title, summary: item.summary_ai || item.content.substring(0, 150) }));

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Here is a main item and a list of other items. Find up to 3 items from the list that are most semantically related to the main item.
            Main Item:
            Title: ${currentItem.title}
            Content: ${currentItem.summary_ai || currentItem.content.substring(0, 200)}

            List of other items (JSON format):
            ${JSON.stringify(contextItems)}
            `,
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        related_items: {
                            type: Type.ARRAY,
                            description: "An array of IDs of the most related items.",
                            items: { type: Type.STRING }
                        }
                    },
                    required: ['related_items']
                }
            }
        });
        const rawText = response.text.trim();
        const jsonText = rawText.startsWith('```json') ? rawText.substring(7, rawText.length - 3).trim() : rawText;
        const result = JSON.parse(jsonText);
        const relatedIds: string[] = result.related_items || [];
        
        return allItems.filter(item => relatedIds.includes(item.id)).slice(0, 3);
    } catch (error) {
        console.error("Error finding related items:", error);
        return [];
    }
};

export const synthesizeContent = async (itemsToSynthesize: FeedItem[]): Promise<string> => {
    if (!API_KEY) throw new Error("API key not configured.");
    if (itemsToSynthesize.length === 0) return "No items to synthesize.";

    const contentForSynthesis = itemsToSynthesize.map(item => ({
        title: item.title,
        summary: item.summary_ai || item.content.substring(0, 200)
    }));

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Synthesize the following collection of items into a coherent analysis in Hebrew. Identify the main themes, connections, and overarching trends. Use Markdown for formatting (e.g., # for title, ### for sub-headers, * for bullet points).
            
            Items to analyze:
            ${JSON.stringify(contentForSynthesis)}
            `,
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
            }
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error synthesizing content:", error);
        throw new Error("Failed to synthesize content with AI.");
    }
};