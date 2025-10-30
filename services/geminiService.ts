import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { FeedItem, Tag, RssFeed, Attachment, PersonalItem, ExportData, AppData, Template } from '../types';
import { mockFeedItems, mockTags, mockRssFeeds, mockPersonalItems, mockTemplates, saveFeedItems, saveRssFeeds, saveTags, savePersonalItems, saveTemplates, getAllData, replaceAllData } from './mockData';
import { loadSettings, saveSettings } from './settingsService';

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

export const markAllAsRead = (): Promise<void> => {
    return new Promise(resolve => {
        setTimeout(() => {
            mockFeedItems.forEach(item => {
                item.is_read = true;
            });
            saveFeedItems();
            resolve();
        }, 300);
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

export const searchFeedItems = (query: string, allItems: FeedItem[]): FeedItem[] => {
    if (!query) {
        return [];
    }
    const lowerCaseQuery = query.toLowerCase();
    const queryTerms = lowerCaseQuery.split(' ').filter(term => term.length > 0);

    return allItems.filter(item => {
        const itemText = [
            item.title,
            item.content,
            item.summary_ai || '',
            ...item.tags.map(tag => tag.name)
        ].join(' ').toLowerCase();

        return queryTerms.every(term => itemText.includes(term));
    });
};

export const addSpark = (spark: { title: string, content: string, tags: Tag[], attachments?: Attachment[] }): Promise<FeedItem> => {
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
            try {
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
            } catch (error) {
              // A real implementation would parse the feed to get the title
              const newFeed: RssFeed = { id: `rss-${Date.now()}`, url, name: "New Feed" };
              mockRssFeeds.push(newFeed);
              saveRssFeeds();
              resolve(newFeed);
            }
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

// --- Personal Items ---

export const getPersonalItems = (): Promise<PersonalItem[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const sorted = [...mockPersonalItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            resolve(sorted);
        }, 300);
    });
};

export const addPersonalItem = (item: Omit<PersonalItem, 'id' | 'createdAt'>): Promise<PersonalItem> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const newItem: PersonalItem = {
                id: `p-${Date.now()}`,
                createdAt: new Date().toISOString(),
                ...item
            };
            mockPersonalItems.unshift(newItem);
            savePersonalItems();
            resolve(newItem);
        }, 300);
    });
};

export const updatePersonalItem = (id: string, updates: Partial<PersonalItem>): Promise<PersonalItem> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = mockPersonalItems.findIndex(item => item.id === id);
            if (index > -1) {
                mockPersonalItems[index] = { ...mockPersonalItems[index], ...updates };
                savePersonalItems();
                resolve(mockPersonalItems[index]);
            } else {
                reject(new Error("Personal item not found"));
            }
        }, 100);
    });
};

export const removeFeedItem = (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = mockFeedItems.findIndex(item => item.id === id);
            if (index > -1) {
                mockFeedItems.splice(index, 1);
                saveFeedItems();
                resolve();
            } else {
                reject(new Error("Feed item not found"));
            }
        }, 200);
    });
};

export const removePersonalItem = (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const initialLength = mockPersonalItems.length;
            const updatedItems = mockPersonalItems.filter(item => item.id !== id);
            if (updatedItems.length < initialLength) {
                replaceAllData({ ...getAllData(), personalItems: updatedItems });
                resolve();
            } else {
                reject(new Error("Personal item not found"));
            }
        }, 200);
    });
};

// --- Template Management ---
export const getTemplates = (): Promise<Template[]> => {
    return new Promise(resolve => resolve([...mockTemplates]));
};

export const addTemplate = (template: Omit<Template, 'id'>): Promise<Template> => {
    return new Promise(resolve => {
        const newTemplate: Template = { id: `template-${Date.now()}`, ...template };
        mockTemplates.push(newTemplate);
        saveTemplates();
        resolve(newTemplate);
    });
};

export const removeTemplate = (id: string): Promise<void> => {
    return new Promise(resolve => {
        const index = mockTemplates.findIndex(t => t.id === id);
        if (index > -1) {
            mockTemplates.splice(index, 1);
            saveTemplates();
        }
        resolve();
    });
};

// --- Data Management ---

export const exportAllData = (): string => {
    const data: ExportData = {
        settings: loadSettings(),
        data: getAllData(),
        exportDate: new Date().toISOString(),
        version: 1,
    };
    return JSON.stringify(data, null, 2);
};

export const importAllData = (jsonData: string): void => {
    try {
        const imported: ExportData = JSON.parse(jsonData);
        if (!imported.version || !imported.data || !imported.settings) {
            throw new Error("Invalid import file format.");
        }
        if (window.confirm("This will overwrite all existing data. Are you sure you want to continue?")) {
            replaceAllData(imported.data);
            saveSettings(imported.settings);
            alert("Data imported successfully. The app will now reload.");
            window.location.reload();
        }
    } catch (error) {
        console.error("Failed to import data:", error);
        alert("Failed to import data. Please check the file format.");
    }
};

// --- GEMINI API FUNCTIONS ---

export const extractTextFromImage = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const imagePart = {
        inlineData: {
            data: base64ImageData,
            mimeType: mimeType,
        },
    };
    const textPart = {
        text: 'Extract all text from this image, in its original language. Respond only with the extracted text.',
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [imagePart, textPart] },
        });
        return response.text;
    } catch (error) {
        console.error("Error extracting text from image:", error);
        throw new Error("Failed to extract text from image.");
    }
};


export const performAiSearch = async (query: string, allItems: FeedItem[]): Promise<{ answer: string | null, itemIds: string[] }> => {
    const settings = loadSettings();
    const corpus = allItems.map(item => ({
        id: item.id,
        title: item.title,
        content: item.summary_ai || item.content,
        tags: item.tags.map(t => t.name),
        type: item.type,
        createdAt: item.createdAt
    }));
    
    const prompt = `You are a powerful search and synthesis engine for a personal knowledge base app called "Spark".
The user has provided a search query in Hebrew. Your task is to:
1. Analyze the query to understand its intent (keyword search, question, filtering, request for synthesis, etc.).
2. Search through the provided list of items (JSON format) to find the most relevant ones.
3. If the query is a question or implies synthesis, generate a concise answer in Hebrew based on the content of the relevant items. Use Markdown for formatting.
4. Return a JSON object with two keys:
    - "answer": A string with the synthesized answer in Hebrew (Markdown formatted), or null if the query was not a question that required a synthesized answer.
    - "itemIds": A JSON array of strings, containing the IDs of the most relevant items, sorted by relevance. Return up to 15 relevant IDs.

User Query: "${query}"

User's Items (Corpus):
${JSON.stringify(corpus)}

Respond ONLY with the JSON object.`;

    try {
        const response = await ai.models.generateContent({
            model: settings.aiModel,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        answer: { type: Type.STRING, nullable: true },
                        itemIds: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['answer', 'itemIds']
                }
            }
        });
        return JSON.parse(response.text);
    } catch(e) {
        console.error("Error in performAiSearch:", e);
        throw new Error("AI search request failed.");
    }
};


export const summarizeItemContent = async (content: string): Promise<string> => {
    const settings = loadSettings();
    const prompt = `Summarize the following text in Hebrew into a concise paragraph. The summary should capture the main points and be easy to understand. Text to summarize:\n---\n${content}\n---\nSummary:`;
    try {
        const response = await ai.models.generateContent({
            model: settings.aiModel,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error summarizing content:", error);
        throw new Error("Failed to summarize content.");
    }
};

export const autoTagContent = async (content: string, availableTags: Tag[]): Promise<string[]> => {
    const settings = loadSettings();
    const tagList = availableTags.map(tag => `"${tag.name}"`).join(', ');

    const prompt = `Analyze the following text and select up to 3 of the most relevant tags from the provided list. Return the result as a JSON array of tag names.\nAvailable tags: [${tagList}]\n\nText to analyze:\n---\n${content}\n---\n\nRelevant tags (JSON array):`;
    try {
        const response = await ai.models.generateContent({
            model: settings.aiModel,
            contents: prompt,
        });
        let responseText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const suggestedTagNames: string[] = JSON.parse(responseText);
        return availableTags
            .filter(tag => suggestedTagNames.includes(tag.name))
            .map(tag => tag.id);
    } catch (error) {
        console.error("Error auto-tagging content:", error);
        throw new Error("Failed to auto-tag content.");
    }
};

export const refreshAllFeeds = async (): Promise<void> => {
    // This is a mock function as fetching and parsing RSS is complex.
    return new Promise(resolve => {
        setTimeout(async () => {
            const newRssItem: FeedItem = {
                id: `rss-${Date.now()}`,
                type: 'rss',
                title: 'כתבה חדשה מרענון פיד (דמו)',
                link: 'https://example.com',
                content: 'זוהי כתבה חדשה שנוספה באופן אוטומטי בעת רענון הפידים. התוכן שלה מדבר על ההתפתחויות האחרונות בעולם הטכנולוגיה והבינה המלאכותית.',
                is_read: false,
                is_spark: false,
                tags: [],
                createdAt: new Date().toISOString(),
            };
            mockFeedItems.unshift(newRssItem);

            if (loadSettings().autoSummarize) {
                try {
                    const summary = await summarizeItemContent(newRssItem.content);
                    await updateFeedItem(newRssItem.id, { summary_ai: summary });
                } catch (error) {
                    console.error("Auto-summarization failed for new item", error);
                }
            }
            saveFeedItems();
            resolve();
        }, 1000);
    });
};

export const synthesizeContent = async (itemsToSynthesize: FeedItem[]): Promise<string> => {
    const settings = loadSettings();
    let contentToProcess = "";
    itemsToSynthesize.forEach(item => {
        contentToProcess += `--- ITEM START ---\nTitle: ${item.title}\nContent: ${item.summary_ai || item.content}\n--- ITEM END ---\n\n`;
    });
    const prompt = `You are a helpful AI assistant. Your task is to synthesize the following articles and notes into a coherent summary. Identify the main themes, connections, and key takeaways. Present the output in Hebrew using Markdown for clear formatting.\n\nHere is the content to synthesize:\n${contentToProcess}\n\nPlease provide a structured synthesis.`;
    try {
        const response = await ai.models.generateContent({ model: settings.aiModel, contents: prompt });
        return response.text;
    } catch (error) {
        console.error("Error synthesizing content:", error);
        throw new Error("Failed to synthesize content.");
    }
};

export const findRelatedItems = async (currentItem: FeedItem, allItems: FeedItem[]): Promise<FeedItem[]> => {
    const settings = loadSettings();
    const searchCorpus = allItems.filter(item => item.id !== currentItem.id);
    if (searchCorpus.length === 0) return [];

    const corpusForPrompt = searchCorpus.map(item => ({ id: item.id, title: item.title, summary: item.summary_ai || item.content.substring(0, 150) + '...' }));
    const prompt = `From the following list of items, identify the 3 most relevant items related to the "Current Item".\n\nCurrent Item:\nID: ${currentItem.id}\nTitle: ${currentItem.title}\nSummary: ${currentItem.summary_ai || currentItem.content.substring(0, 200) + '...'}\n\nList of items to search from:\n${JSON.stringify(corpusForPrompt, null, 2)}\n\nReturn your answer as a JSON array of strings, where each string is the ID of a relevant item. For example: ["id1", "id2", "id3"]. Only return the JSON array.`;

    try {
        const response = await ai.models.generateContent({ model: settings.aiModel, contents: prompt });
        const responseText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const relatedIds: string[] = JSON.parse(responseText);
        return relatedIds.map(id => allItems.find(item => item.id === id)).filter((item): item is FeedItem => !!item);
    } catch (error) {
        console.error("Error finding related items:", error);
        return []; // Return empty array on failure
    }
};

export const createAssistantChat = (allItems: FeedItem[]): Chat => {
    const settings = loadSettings();
    const context = `You are "Sparky", a personal AI assistant in the "Spark" app. Help the user analyze and connect insights from their collected items. Be helpful and insightful. Respond in Hebrew.\n\nHere is the user's collection:\n${JSON.stringify(allItems.map(item => ({ id: item.id, type: item.type, title: item.title, summary: item.summary_ai || item.content.substring(0, 200), tags: item.tags.map(t => t.name) })), null, 2)}\n\nStart by introducing yourself and suggest a question, e.g., "מה הקשר בין הפריטים האחרונים שלי?" or "סכם לי את המאמרים בנושא AI".`;
    return ai.chats.create({ model: settings.aiModel, history: [{ role: 'user', parts: [{ text: context }] }] });
};

export const getContentFromUrl = async (url: string): Promise<{ title: string, content: string }> => {
    const settings = loadSettings();
    const prompt = `Please fetch the main content from the URL: ${url}. Provide the article's original title and a concise summary of the content. Return a JSON object with keys: "title" and "content".`;
    try {
        const response = await ai.models.generateContent({
            model: settings.aiModel,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING } }, required: ['title', 'content'] }
            },
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error getting content from URL:", error);
        throw new Error("Failed to fetch and summarize content from the URL.");
    }
};

export const getUrlMetadata = async (url: string, allTags: Tag[]): Promise<Partial<PersonalItem>> => {
    const settings = loadSettings();
    const tagList = allTags.map(t => t.name).join(', ');
    const prompt = `Analyze the webpage at URL: ${url}. Extract: title, a one-paragraph summary (for 'content'), a direct URL to a relevant image ('imageUrl'), the root domain ('domain'), and suggest up to 3 relevant tags from this list: [${tagList}]. Return a JSON object with keys: "title", "content", "imageUrl", "domain", "suggestedTags" (an array of strings).`;
    try {
        const response = await ai.models.generateContent({
            model: settings.aiModel,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { title: { type: Type.STRING }, content: { type: Type.STRING }, imageUrl: { type: Type.STRING }, domain: { type: Type.STRING }, suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    required: ['title', 'content', 'imageUrl', 'domain', 'suggestedTags']
                }
            },
        });
        const result = JSON.parse(response.text);
        return { title: result.title, content: result.content, imageUrl: result.imageUrl, domain: result.domain, metadata: { suggestedTags: result.suggestedTags } };
    } catch (error) {
        console.error("Error getting URL metadata:", error);
        throw new Error("Failed to fetch metadata from the URL.");
    }
};