import type { WatchlistItem, FinancialAsset } from '../types';

// New API Key for Finnhub (for news and stock charts)
const FINNHUB_API_KEY = 'c8362eaad3i2b45e72d0'; // Public sandbox key, replaced old one
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// API Key for Massive.com (for stock prices)
const MASSIVE_API_KEY = 'oXswLEp6_6LlVHYVOUc9TLv6_ZRqeqon';
const MASSIVE_WS_URL = 'wss://delayed.massive.com/stocks';

// Kept for Crypto Data
const FREECRYPTOAPI_KEY = 'l6hhtilmoel0d5ypd172';
const FREECRYPTO_BASE_URL = 'https://api.freecryptoapi.com/v1';


// --- Type Definitions ---
export interface NewsItem {
    id: number;
    headline: string;
    summary: string;
    url: string;
    source: string;
    datetime: number;
}


// --- Data Fetching Functions ---

async function fetchData(url: string, options?: RequestInit) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`API Error: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`Failed to fetch data from ${url}`);
    }
    return response.json();
}

/**
 * Fetches current price, daily change, and market cap for a list of crypto assets from FreeCryptoAPI.
 */
async function fetchCryptoData(assets: WatchlistItem[]): Promise<FinancialAsset[]> {
    if (assets.length === 0) return [];
    
    try {
        const results = await Promise.all(assets.map(async (asset) => {
            try {
                const url = `${FREECRYPTO_BASE_URL}/getData?symbol=${asset.ticker}&token=${FREECRYPTOAPI_KEY}`;
                const data = await fetchData(url);
                
                if (data.status === 'success' && data.symbols && data.symbols.length > 0) {
                    const symbolData = data.symbols[0];
                    const price = parseFloat(symbolData.last);
                    const change24h = parseFloat(symbolData.daily_change_percentage);
                    
                    const high = parseFloat(symbolData.highest);
                    const low = parseFloat(symbolData.lowest);
                    const sparkline = Array.from({ length: 24 }, (_, i) => {
                        const t = i / 23;
                        return low + (high - low) * (0.5 + 0.3 * Math.sin(t * Math.PI * 2) + 0.2 * Math.random());
                    });
                    sparkline[23] = price;
                    
                    return { ...asset, price, change24h, sparkline };
                }
                console.warn(`No data for ${asset.ticker}`);
                return { ...asset, price: 0, change24h: 0 };
            } catch (err) {
                console.error(`Failed to fetch data for ${asset.ticker}:`, err);
                return { ...asset, price: 0, change24h: 0 };
            }
        }));
        
        return results;
    } catch (error) {
        console.error("Error in fetchCryptoData:", error);
        return assets.map(asset => ({ ...asset, price: 0, change24h: 0 }));
    }
}

/**
 * Fetches current price and daily change for a list of stock assets using the Massive.com WebSocket API.
 */
async function fetchStockData(assets: WatchlistItem[]): Promise<FinancialAsset[]> {
    if (assets.length === 0) return [];

    return new Promise((resolve) => {
        const ws = new WebSocket(MASSIVE_WS_URL);
        const results = new Map<string, FinancialAsset>();
        const stockTickers = assets.map(a => a.ticker);

        const timeout = setTimeout(() => {
            if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
                ws.close();
            }
            console.warn('WebSocket connection timed out after 15 seconds.');
            // onclose will handle the resolution.
        }, 15000);

        const cleanUpAndResolve = () => {
            clearTimeout(timeout);
            const finalResults = assets.map(asset => results.get(asset.ticker) || { ...asset, price: 0, change24h: 0, sparkline: [] });
            resolve(finalResults);
        };
        
        ws.onopen = () => {
            console.log('Massive.com WebSocket connected. Waiting for status message.');
        };

        ws.onmessage = (event) => {
            try {
                const messages = JSON.parse(event.data);
                for (const msg of messages) {
                    if (msg.ev === 'status' && msg.status === 'connected') {
                        console.log('Received "connected" status. Authenticating...');
                        ws.send(JSON.stringify({ action: 'auth', params: MASSIVE_API_KEY }));
                    } else if (msg.ev === 'status' && msg.status === 'auth_success') {
                        const params = stockTickers.map(ticker => `AM.${ticker}`).join(',');
                        console.log('Authenticated. Subscribing to:', params);
                        ws.send(JSON.stringify({ action: 'subscribe', params: params }));
                    } else if (msg.ev === 'AM') {
                        const asset = assets.find(a => a.ticker === msg.sym);
                        if (asset && !results.has(asset.ticker)) {
                            const open = msg.o;
                            const close = msg.c;
                            const change = open > 0 ? ((close - open) / open) * 100 : 0;
                            
                            results.set(asset.ticker, {
                                ...asset,
                                price: close,
                                change24h: change,
                                sparkline: [msg.o, msg.h, msg.l, msg.c],
                            });
                        }

                        if (results.size === assets.length) {
                             if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
                                ws.close();
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Error parsing WebSocket message", e);
            }
        };

        ws.onerror = (error) => {
            console.error('Massive.com WebSocket Error:', error);
             if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
                ws.close();
            }
        };
        
        ws.onclose = (event) => {
            console.log('Massive.com WebSocket disconnected. Reason:', event.reason, 'Code:', event.code);
            cleanUpAndResolve();
        };
    });
}


/**
 * Fetches historical daily data for a single asset to draw a chart.
 * Now supports both stocks (via Finnhub) and crypto.
 */
export async function fetchAssetDailyChart(asset: WatchlistItem): Promise<{ time: number, price: number }[]> {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);

    if (asset.type === 'stock') {
        const to = Math.floor(today.getTime() / 1000);
        const from = Math.floor(oneMonthAgo.getTime() / 1000);
        const url = `${FINNHUB_BASE_URL}/stock/candle?symbol=${asset.ticker}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
        try {
            const data = await fetchData(url);
            if (data.s === 'ok' && data.c && data.c.length > 0) {
                return data.t.map((timestamp: number, index: number) => ({
                    time: timestamp * 1000,
                    price: data.c[index],
                }));
            }
            return [];
        } catch (error) {
            console.error(`Failed to fetch daily chart for stock: ${asset.ticker}`, error);
            return [];
        }
    }
    
    // Crypto chart logic (updated to fetch one month)
    const formatDateForApi = (date: Date) => date.toISOString().split('T')[0];
    const startDate = formatDateForApi(oneMonthAgo);
    const endDate = formatDateForApi(today);
    const symbol = `${asset.ticker}-USDT`;
    const historyUrl = `${FREECRYPTO_BASE_URL}/getTimeframe?symbol=${symbol}&start_date=${startDate}&end_date=${endDate}&token=${FREECRYPTOAPI_KEY}`;
    
    try {
        const historyData = await fetchData(historyUrl);
        const points: { time: number, price: number }[] = [];
        if (historyData.status === 'success' && historyData.result) {
            historyData.result.forEach((d: { time_close: number, close: string }) => {
                points.push({ time: d.time_close * 1000, price: parseFloat(d.close) });
            });
        }
        return points;
    } catch (error) {
        console.error(`Failed to fetch daily chart for crypto: ${asset.ticker}`, error);
        return [];
    }
}


/**
 * Fetches news for a given stock or crypto ticker using Finnhub.
 */
export async function fetchNewsForTicker(ticker: string, type: 'stock' | 'crypto'): Promise<NewsItem[]> {
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const to = formatDate(today);
    const from = formatDate(oneWeekAgo);

    let url: string;

    if (type === 'stock') {
        url = `${FINNHUB_BASE_URL}/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    } else { // crypto news is a premium feature on Finnhub, we will use a general category.
        url = `${FINNHUB_BASE_URL}/news?category=crypto&token=${FINNHUB_API_KEY}`;
    }

    try {
        const news: NewsItem[] = await fetchData(url);
        // Limit to 5 articles to avoid clutter
        return (news || []).slice(0, 5);
    } catch (error) {
        console.error(`Failed to fetch news for: ${ticker}`, error);
        return [];
    }
}


/**
 * Main function to fetch all data for the watchlist, separating by asset type.
 */
export async function fetchWatchlistData(watchlist: WatchlistItem[]): Promise<FinancialAsset[]> {
    const cryptoAssets = watchlist.filter(a => a.type === 'crypto');
    const stockAssets = watchlist.filter(a => a.type === 'stock');

    const [cryptoData, stockData] = await Promise.all([
        fetchCryptoData(cryptoAssets),
        fetchStockData(stockAssets)
    ]);

    const combined = [...cryptoData, ...stockData];
    const watchlistMap = new Map(combined.map(asset => [asset.ticker, asset]));
    return watchlist.map(item => watchlistMap.get(item.ticker)!);
}

/**
 * Common crypto mapping for quick identification.
 */
const COMMON_CRYPTOS: Record<string, string> = {
    'BTC': 'Bitcoin', 'ETH': 'Ethereum', 'SOL': 'Solana', 'ADA': 'Cardano',
    'BNB': 'Binance Coin', 'XRP': 'XRP', 'DOT': 'Polkadot', 'DOGE': 'Dogecoin',
    'AVAX': 'Avalanche', 'MATIC': 'Polygon', 'LINK': 'Chainlink', 'UNI': 'Uniswap',
    'LTC': 'Litecoin', 'ATOM': 'Cosmos', 'ETC': 'Ethereum Classic',
};

/**
 * Finds a ticker's information (name, type).
 * It checks a local list for crypto, and assumes stock otherwise.
 */
export async function findTicker(ticker: string): Promise<{id: string, name: string, type: 'stock' | 'crypto'} | null> {
    const upperTicker = ticker.toUpperCase();

    if (COMMON_CRYPTOS[upperTicker]) {
        return { id: upperTicker.toLowerCase(), name: COMMON_CRYPTOS[upperTicker], type: 'crypto' };
    }
    
    // Assume it's a stock if not a common crypto.
    return { id: upperTicker.toLowerCase(), name: upperTicker, type: 'stock' };
}
