import type { FeedItem } from '../types';

// A list of public CORS proxies to improve reliability.
const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://cors-proxy.fringe.zone/',
    'https://thingproxy.freeboard.io/fetch/',
];

export interface ParsedFeedItem {
    title: string;
    link: string;
    content: string;
    pubDate: string;
    guid: string;
}

export interface ParsedFeed {
    title: string;
    items: ParsedFeedItem[];
}

/**
 * Safely strips HTML tags from a string to get plain text while preserving structure.
 * It also converts list items to use markdown-style bullets.
 * @param htmlString The string containing HTML.
 * @returns The plain text content with paragraph structure.
 */
const stripHtml = (htmlString: string): string => {
    try {
        if (!htmlString) return '';
        const doc = new DOMParser().parseFromString(htmlString, 'text/html');

        // Remove script and style elements to avoid parsing issues and irrelevant content
        doc.querySelectorAll('script, style, link, iframe, noscript').forEach(el => el.remove());

        // Handle lists by prepending a markdown-like bullet point
        doc.querySelectorAll('li').forEach(li => {
            const prefix = document.createTextNode('\n• ');
            li.prepend(prefix);
        });
        
        // Add newlines after block elements for paragraph separation
        doc.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, blockquote, tr, hr').forEach(el => {
             el.append('\n');
        });
        
        const text = doc.body.textContent || "";
        
        // Normalize whitespace for a cleaner output
        return text
            .replace(/[ \t]+/g, ' ') // collapse spaces and tabs
            .replace(/(\n\s*){3,}/g, '\n\n') // collapse multiple newlines to max 2
            .trim();
    } catch (e) {
        console.error("Could not parse HTML string", e);
        // Fallback to a simpler regex-based strip if DOMParser fails
        return htmlString.replace(/<[^>]+>/g, '').trim();
    }
};


/**
 * Pre-processes the XML string to fix common issues before parsing.
 * @param xmlString The raw XML string.
 * @returns A sanitized XML string.
 */
const sanitizeXmlBeforeParsing = (xmlString: string): string => {
    // 1. Remove non-standard control characters that can break XML parsers.
    let sanitized = xmlString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

    // 2. Fix unescaped ampersands which are not part of a valid entity.
    sanitized = sanitized.replace(/&(?!(?:[a-z]+|#[0-9]+);)/gi, '&amp;');
    
    // 3. Fix unquoted attribute values. This is a common issue in feeds like darkreading.
    // e.g., <rss version=2.0> becomes <rss version="2.0">
    // It looks for ` attribute=` or `<tag attribute=` followed by a value that is not quoted.
    sanitized = sanitized.replace(/([<\s][a-zA-Z0-9:-]+)=((?![ '"])[^\s>]+)/g, '$1="$2"');

    // 4. Remove XML namespaces from tags (e.g., <dc:creator> -> <creator>) for simplicity.
    sanitized = sanitized.replace(/<(\/?)([\w-]+):([\w-]+)/g, '<$1$3');
    
    // 5. Remove namespace definitions from attributes (e.g., xmlns:dc="...").
    sanitized = sanitized.replace(/\sxmlns(:\w+)?="[^"]+"/g, '');

    return sanitized;
};


/**
 * Parses an XML string into a structured feed object using the browser's DOMParser.
 * It's safer and more robust than using regular expressions.
 * It supports both RSS (<item>) and Atom (<entry>) feed formats.
 * @param xmlString The raw XML content of the feed.
 * @param feedUrl The original URL, used for error reporting.
 * @returns A ParsedFeed object containing the channel title and a list of items.
 */
const parseRssXml = (xmlString: string, feedUrl: string): ParsedFeed => {
    const sanitizedXmlString = sanitizeXmlBeforeParsing(xmlString);

    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedXmlString, "application/xml");
    
    // Check for parsing errors, which indicates the response was not valid XML.
    const errorNode = doc.querySelector("parsererror");
    if (errorNode) {
        console.error(`XML parsing error for ${feedUrl}:`, errorNode.textContent);
        let hostname = feedUrl;
        try {
            hostname = new URL(feedUrl).hostname;
        } catch(e) { /* ignore, use original url */ }
        return { title: `Failed to parse: ${hostname}`, items: [] };
    }

    const channelTitle = doc.querySelector('channel > title, feed > title')?.textContent || 'Untitled Feed';
    
    const items: ParsedFeedItem[] = [];
    
    // Handler for standard RSS <item> tags
    doc.querySelectorAll('item').forEach(itemNode => {
        const title = itemNode.querySelector('title')?.textContent || '';
        let link = itemNode.querySelector('link')?.textContent || '';
        const guid = itemNode.querySelector('guid')?.textContent || link || title;
        if (!link && guid.startsWith('http')) {
            link = guid;
        }
        
        const rawContent = itemNode.querySelector('encoded, content\\:encoded, description')?.textContent || '';
        const content = stripHtml(rawContent);
        const pubDate = itemNode.querySelector('pubDate')?.textContent || new Date().toISOString();
        items.push({ title, link, content: content.trim(), pubDate, guid });
    });
    
    // Handler for Atom <entry> tags for wider compatibility
    if (items.length === 0) {
        doc.querySelectorAll('entry').forEach(itemNode => {
            const title = itemNode.querySelector('title')?.textContent || '';
            let link = itemNode.querySelector('link')?.getAttribute('href') || '';
            const guid = itemNode.querySelector('id')?.textContent || link || title;
             if (!link && guid.startsWith('http')) {
                link = guid;
            }

            const rawContent = itemNode.querySelector('content')?.textContent || itemNode.querySelector('summary')?.textContent || '';
            const content = stripHtml(rawContent);
            const pubDate = itemNode.querySelector('updated')?.textContent || itemNode.querySelector('published')?.textContent || new Date().toISOString();
            items.push({ title, link, content: content.trim(), pubDate, guid });
        });
    }

    return { title: channelTitle, items };
};

/**
 * Fetches a single RSS feed using a list of CORS proxies for reliability and parses it.
 * @param feedUrl The URL of the RSS feed to fetch.
 * @returns A promise that resolves to a ParsedFeed object.
 */
export const fetchAndParseFeed = async (feedUrl: string): Promise<ParsedFeed> => {
    if (!feedUrl) throw new Error("URL is required to fetch a feed.");
    
    for (const proxy of CORS_PROXIES) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        try {
            let urlToProxy = feedUrl;
            // The allorigins.win proxy is the only one in the list that requires the URL to be encoded.
            if (proxy.includes('allorigins.win')) {
                urlToProxy = encodeURIComponent(feedUrl);
            }
            const fetchUrl = `${proxy}${urlToProxy}`;

            const response = await fetch(fetchUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn(`Proxy ${proxy} failed for ${feedUrl} with status ${response.status}. Trying next...`);
                continue;
            }
            const xmlString = await response.text();
            return parseRssXml(xmlString, feedUrl);
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof DOMException && error.name === 'AbortError') {
                 console.warn(`Proxy ${proxy} timed out for ${feedUrl}. Trying next...`);
            } else {
                console.warn(`Error fetching or parsing with proxy ${proxy} for ${feedUrl}:`, error);
            }
        }
    }
    
    // If all proxies fail, throw an error.
    throw new Error(`Failed to fetch feed from all proxies: ${feedUrl}`);
};