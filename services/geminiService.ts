import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { FeedItem, Tag, RssFeed, Attachment, PersonalItem, ExportData } from '../types';
import { mockFeedItems, mockTags, mockRssFeeds, mockPersonalItems, saveFeedItems, saveRssFeeds, saveTags, savePersonalItems, getAllData, replaceAllData } from './mockData';
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
                (item.summary_ai || '').toLowerCase().includes(lowerCaseQuery) ||
                item.tags.some(tag => tag.name.toLowerCase().includes(lowerCaseQuery))
            );
            resolve(results);
        }, 300);
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

export const removePersonalItem = (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = mockPersonalItems.findIndex(item => item.id === id);
            if (index > -1) {
                mockPersonalItems.splice(index, 1);
                savePersonalItems();
                resolve();
            } else {
                reject(new Error("Personal item not found"));
            }
        }, 200);
    });
};


// --- LIVE RSS FETCHING ---

const getMockRssContent = (): { [key: string]: string } => ({
    'https://www.calcalist.co.il/rss/calcalist,0,0,14,00.xml': `
        <item>
            <title>המדדים בת"א ננעלו בירידות; טבע ירדה ב-2%, נייס עלתה ב-1.5%</title>
            <link>https://www.calcalist.co.il/stockmarket/article/rjx3l0kzr</link>
            <pubDate>${new Date(Date.now() - 3 * 3600 * 1000).toUTCString()}</pubDate>
            <guid>https://www.calcalist.co.il/stockmarket/article/rjx3l0kzr</guid>
            <description>ת"א 35 ות"א 125 איבדו 0.4%, ת"א בנקים נחלש ב-0.2%. עוד ברקע למסחר: הממשלה אישרה את תקציב המדינה המתוקן לשנת 2024.</description>
        </item>
        <item>
            <title>אינטל צפויה לקבל מענק של 11 מיליארד דולר להקמת מפעל שבבים באוהיו</title>
            <link>https://www.calcalist.co.il/markets/article/r1b2faky0</link>
            <pubDate>${new Date(Date.now() - 8 * 3600 * 1000).toUTCString()}</pubDate>
            <guid>https://www.calcalist.co.il/markets/article/r1b2faky0</guid>
            <description>ההשקעה במפעל החדש היא חלק מתוכנית כוללת של ממשל ביידן לתמוך בייצור שבבים מקומי בארה"ב, ולהפחית את התלות במזרח אסיה.</description>
        </item>
    `,
    'https://www.darkreading.com/rss_simple.asp': `
        <item>
            <title>New 'GhostRace' Attack Bypasses CPU Speculative Execution Mitigations</title>
            <link>https://www.darkreading.com/vulnerabilities-threats/new-ghostrace-attack-bypasses-cpu-speculative-execution-mitigations</link>
            <pubDate>${new Date(Date.now() - 2 * 3600 * 1000).toUTCString()}</pubDate>
            <guid>1449411</guid>
            <description>Researchers discover a new side-channel attack that can leak sensitive data from modern CPUs, despite existing protections against Spectre and Meltdown.</description>
        </item>
        <item>
            <title>CISA Warns of Actively Exploited Vulnerability in JetBrains TeamCity</title>
            <link>https://www.darkreading.com/application-security/cisa-warns-of-actively-exploited-vulnerability-in-jetbrains-teamcity</link>
            <pubDate>${new Date(Date.now() - 12 * 3600 * 1000).toUTCString()}</pubDate>
            <guid>1449405</guid>
            <description>The US cybersecurity agency has added CVE-2024-27198 to its Known Exploited Vulnerabilities catalog, urging organizations to patch their CI/CD servers immediately.</description>
        </item>
    `,
    'https://www.psychologytoday.com/intl/en/front/feed': `
       <item>
            <title>The Surprising Power of Small Talk</title>
            <link>https://www.psychologytoday.com/intl/en/articles/202403/the-surprising-power-of-small-talk</link>
            <pubDate>${new Date(Date.now() - 6 * 3600 * 1000).toUTCString()}</pubDate>
            <guid>https://www.psychologytoday.com/intl/en/node/1199331</guid>
            <description>It may seem trivial, but brief, friendly interactions can have a significant positive impact on our well-being and sense of connection.</description>
        </item>
       <item>
            <title>How to Stop Ruminating on Negative Thoughts</title>
            <link>https://www.psychologytoday.com/intl/en/blog/mindful-musings/202403/how-to-stop-ruminating-on-negative-thoughts</link>
            <pubDate>${new Date(Date.now() - 1 * 24 * 3600 * 1000).toUTCString()}</pubDate>
            <guid>https://www.psychologytoday.com/intl/en/node/1199320</guid>
            <description>Caught in a loop of negativity? Here are four practical, research-backed strategies to break the cycle of rumination and regain mental peace.</description>
        </item>
    `
});

const fetchAndParseRssFeed = async (feed: RssFeed): Promise<FeedItem[]> => {
    if (!API_KEY) throw new Error("API key not configured.");
    const settings = loadSettings();

    const mockContent = getMockRssContent();
    const rawContent = mockContent[feed.url];

    if (!rawContent) {
        console.warn(`No mock RSS content for ${feed.name} (${feed.url}). This is a demo app and cannot fetch live URLs.`);
        return [];
    }
    
    try {
        const response = await ai.models.generateContent({
            model: settings.aiModel,
            contents: `Parse the following RSS feed content. For each item, extract the title, link, publication date (pubDate), a unique identifier (guid), and a plain text version of the description or content. Ensure the publication date is a valid ISO 8601 string. Return up to 10 recent items. \n\n RSS Content: \n ${rawContent}`,
            config: {
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
            console.warn(`Feed "${feed.name}" returned no items from AI after parsing mock content.`);
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
        console.error(`Error processing MOCK feed ${feed.name} with AI:`, error);
        return [];
    }
};


export const refreshAllFeeds = async (): Promise<number> => {
    const settings = loadSettings();
    const allFeeds = await getFeeds();
    
    let newItems: FeedItem[] = [];
    for (const feed of allFeeds) {
        try {
            const items = await fetchAndParseRssFeed(feed);
            newItems = [...newItems, ...items];
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch(e) {
            console.error(`Failed to process feed ${feed.name}`, e);
        }
    }
    
    const uniqueNewItems = newItems.flat();
    const existingIds = new Set(mockFeedItems.map(item => item.id));
    const trulyNewItems = uniqueNewItems.filter(item => !existingIds.has(item.id));

    if (trulyNewItems.length > 0) {
        if (settings.autoSummarize) {
            console.log(`Auto-summarizing ${trulyNewItems.length} new items...`);
            for (const item of trulyNewItems) {
                try {
                    item.summary_ai = await summarizeItemContent(item.content);
                } catch (e) {
                    console.error(`Failed to auto-summarize item: ${item.title}`, e);
                }
            }
        }
        mockFeedItems.unshift(...trulyNewItems);
        saveFeedItems();
    }
    
    return trulyNewItems.length;
};


// --- GEMINI API FUNCTIONS ---

export const summarizeItemContent = async (content: string): Promise<string> => {
  if (!API_KEY) throw new Error("API key not configured.");
  const settings = loadSettings();
  try {
    const response = await ai.models.generateContent({
      model: settings.aiModel,
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
    const settings = loadSettings();
    const tagNames = availableTags.map(t => t.name);

    try {
        const response = await ai.models.generateContent({
            model: settings.aiModel,
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

export const getUrlMetadata = async (url: string, availableTags: Tag[]): Promise<Partial<PersonalItem>> => {
    if (!API_KEY) throw new Error("API key not configured.");
    const settings = loadSettings();
    const mockContentForAnalysis = `This is mock content for the URL ${url}. In a real application, this content would be scraped from the web page. For this demo, let's assume this page is about the future of Artificial Intelligence and its impact on user interface design. It discusses how AI can create more intuitive and personalized experiences. Key concepts include generative UI, predictive interactions, and ethical design principles in AI. The main image on the page is a futuristic abstract of a brain-computer interface.`;
    
    const tagNames = availableTags.map(t => t.name);

    try {
        const response = await ai.models.generateContent({
            model: settings.aiModel,
            contents: `Analyze the content of the webpage at the URL "${url}". Based on the following mock content, extract a concise title, a one-paragraph summary in Hebrew, and suggest up to 3 relevant tags from the provided list.
            
            Mock Content: "${mockContentForAnalysis}"
            Available Tags: ${tagNames.join(', ')}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        summary: { type: Type.STRING, description: "A summary in Hebrew." },
                        tags: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING, description: "A relevant tag from the list." }
                        },
                        imageUrl: { type: Type.STRING, description: "A representative image URL from the page."}
                    },
                    required: ["title", "summary", "tags", "imageUrl"]
                }
            }
        });
        
        const rawText = response.text.trim();
        const jsonText = rawText.startsWith('```json') ? rawText.substring(7, rawText.length - 3).trim() : rawText;
        const result = JSON.parse(jsonText);

        const domain = new URL(url).hostname.replace(/^www\./, '');
        const matchedTagIds = availableTags.filter(tag => result.tags.includes(tag.name)).map(tag => tag.id);

        return {
            title: result.title,
            content: result.summary,
            domain: domain,
            imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80", // Mocked image
            metadata: {
                suggestedTags: matchedTagIds
            }
        };

    } catch (error) {
        console.error("Error analyzing URL with Gemini:", error);
        throw new Error("Failed to analyze URL.");
    }
};

export const getContentFromUrl = async (url: string): Promise<{ title: string, content: string }> => {
    console.log(`Simulating fetch for URL: ${url}`);
    // This is a mocked implementation because client-side JS cannot reliably fetch
    // content from arbitrary URLs due to CORS restrictions.
    if (url.includes('wikipedia.org')) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    title: "בינה מלאכותית – ויקיפדיה",
                    content: "בינה מלאכותית (באנגלית: Artificial intelligence, בראשי תיבות: AI) היא ענף של מדעי המחשב העוסק ביכולתם של מחשבים לפעול באופן המציג יכולות אנושיות. יכולות אלו כוללות למידה, הסקת מסקנות, פתרון בעיות, הבנת שפה טבעית וראייה ממוחשבת. המונח 'בינה מלאכותית' נטבע על ידי ג'ון מקארתי בשנת 1956."
                });
            }, 1000);
        });
    }

    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                title: "תוכן מדומיין מהכתובת",
                content: `זהו תוכן שנוצר באופן מדומיין עבור הכתובת ${url}. במערכת אמיתית, התוכן היה מיובא מהרשת ומסוכם על ידי בינה מלאכותית. פיצ'ר זה מיועד להדגמה בלבד.`
            });
        }, 1000);
    });
};

export const findRelatedItems = async (currentItem: FeedItem, allItems: FeedItem[]): Promise<FeedItem[]> => {
    if (!API_KEY) return [];
    const settings = loadSettings();
    const otherItems = allItems.filter(item => item.id !== currentItem.id);
    if (otherItems.length < 3) return [];

    const contextItems = otherItems.map(item => ({ id: item.id, title: item.title, summary: item.summary_ai || item.content.substring(0, 150) }));

    try {
        const response = await ai.models.generateContent({
            model: settings.aiModel === 'gemini-2.5-pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash',
            contents: `Here is a main item and a list of other items. Find up to 3 items from the list that are most semantically related to the main item.
            Main Item:
            Title: ${currentItem.title}
            Content: ${currentItem.summary_ai || currentItem.content.substring(0, 200)}

            List of other items (JSON format):
            ${JSON.stringify(contextItems)}
            `,
            config: {
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
    const settings = loadSettings();
    const contentForSynthesis = itemsToSynthesize.map(item => ({
        title: item.title,
        summary: item.summary_ai || item.content.substring(0, 200)
    }));

    try {
        const response = await ai.models.generateContent({
            model: settings.aiModel,
            contents: `Synthesize the following collection of items into a coherent analysis in Hebrew. Identify the main themes, connections, and overarching trends. Use Markdown for formatting (e.g., # for title, ### for sub-headers, * for bullet points).
            
            Items to analyze:
            ${JSON.stringify(contentForSynthesis)}
            `,
             config: {
                ...(settings.aiModel === 'gemini-2.5-pro' && { thinkingConfig: { thinkingBudget: 32768 } })
            }
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error synthesizing content:", error);
        throw new Error("Failed to synthesize content with AI.");
    }
};

export const createAssistantChat = (contextItems: FeedItem[]): Chat => {
    const settings = loadSettings();
    const context = `This is the user's current knowledge base. Use it to answer their questions:\n${JSON.stringify(contextItems.map(i => ({title: i.title, summary: i.summary_ai || i.content.slice(0, 150), tags: i.tags.map(t=>t.name)})))}`;
    
    const systemInstruction = `You are a personal knowledge assistant named 'Sparky'. Your purpose is to help the user explore and understand their saved data, which consists of personal notes ('sparks') and articles.
    - Your knowledge is strictly limited to the data provided in the context.
    - When asked a question, you must base your answer only on the provided items.
    - If the answer isn't in the data, state clearly that you don't have information on that topic based on the user's sparks and feeds.
    - Respond exclusively in Hebrew.
    - Keep your answers concise and helpful.
    - You can use Markdown for formatting your response.`;

    const chat = ai.chats.create({
        model: settings.aiModel,
        config: {
            systemInstruction,
        },
        history: [
            { role: 'user', parts: [{ text: context }] },
            { role: 'model', parts: [{ text: 'בסדר, הבנתי. אני היועץ האישי שלך, Sparky. מאגר הידע שלי מבוסס על הספארקים והפידים ששמרת. איך אני יכול לעזור לך היום?' }] }
        ]
    });
    return chat;
};


// --- DATA MANAGEMENT ---

export const exportAllData = (): string => {
    const settings = loadSettings();
    const data = getAllData();

    const exportObject: ExportData = {
        settings,
        data,
        exportDate: new Date().toISOString(),
        version: 2.2, // Current version
    };
    return JSON.stringify(exportObject, null, 2);
};

export const importAllData = (jsonString: string): void => {
    try {
        const importObject: ExportData = JSON.parse(jsonString);
        
        if (!importObject.settings || !importObject.data || !importObject.version) {
            throw new Error("Invalid import file format.");
        }

        saveSettings(importObject.settings);
        replaceAllData(importObject.data);
        
        alert("הנתונים יובאו בהצלחה! האפליקציה תיטען מחדש כעת.");
        window.location.reload();

    } catch (error) {
        console.error("Failed to import data:", error);
        alert(`שגיאה בייבוא הנתונים: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    }
};