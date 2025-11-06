import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import type { FinancialAsset, FeedItem, PersonalItem } from '../types';
import * as financialsService from '../services/financialsService';
import { AppContext } from '../state/AppContext';
import { CloseIcon, LinkIcon } from './icons';

const Chart: React.FC<{ data?: { time: number; price: number }[] }> = ({ data }) => {
    if (!data || data.length < 2) {
        return <div className="h-48 w-full bg-gray-800/50 rounded-lg flex items-center justify-center text-sm text-gray-500">טוען נתוני גרף...</div>;
    }

    const isPositive = data[data.length - 1].price >= data[0].price;
    const color = isPositive ? '#4ADE80' : '#F87171';
    const glowColor = isPositive ? 'rgba(74, 222, 128, 0.5)' : 'rgba(248, 113, 113, 0.5)';

    const minPrice = Math.min(...data.map(d => d.price));
    const maxPrice = Math.max(...data.map(d => d.price));
    const priceRange = maxPrice - minPrice || 1;
    
    const minTime = data[0].time;
    const maxTime = data[data.length - 1].time;
    const timeRange = maxTime - minTime || 1;

    const points = data.map(d => {
        const x = ((d.time - minTime) / timeRange) * 100;
        const y = 100 - ((d.price - minPrice) / priceRange) * 90 - 5; // 5% padding top/bottom
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="100%" height="192" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ filter: `drop-shadow(0 0 10px ${glowColor})`}}>
             <defs>
                <linearGradient id={`chart-gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline fill="none" stroke={color} strokeWidth="0.5" points={points} />
            <polygon fill={`url(#chart-gradient-${color})`} points={`0,100 ${points} 100,100`} />
        </svg>
    );
};

const Section: React.FC<{title: string, children: React.ReactNode, isLoading?: boolean, count: number}> = ({title, children, isLoading = false, count}) => (
    <div className="border-t border-[var(--border-primary)] pt-6 mt-6">
        <h3 className="text-sm font-semibold text-[var(--accent-highlight)] mb-3 uppercase tracking-wider">{title}</h3>
        {isLoading && <p className="text-sm text-gray-500">טוען...</p>}
        {!isLoading && count === 0 && <p className="text-sm text-gray-500 text-center py-4">אין פריטים רלוונטיים.</p>}
        {!isLoading && count > 0 && <div className="space-y-2">{children}</div>}
    </div>
);


interface AssetDetailModalProps {
  asset: FinancialAsset;
  onClose: () => void;
}

const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ asset, onClose }) => {
    const { state } = useContext(AppContext);
    const [isClosing, setIsClosing] = useState(false);
    const [chartData, setChartData] = useState<{ time: number, price: number }[] | undefined>();
    const [latestNews, setLatestNews] = useState<any[]>([]);
    const [isLoadingNews, setIsLoadingNews] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setChartData(undefined);
            setLatestNews([]);
            setIsLoadingNews(true);

            financialsService.fetchAssetDailyChart(asset).then(setChartData);
            financialsService.fetchNewsForTicker(asset.ticker, asset.type).then(setLatestNews).finally(() => setIsLoadingNews(false));
        };
        fetchData();
    }, [asset]);

    const relatedItems = useMemo(() => {
        const searchTerms = [asset.name.toLowerCase(), asset.ticker.toLowerCase()];
        const check = (text: string) => searchTerms.some(term => text.toLowerCase().includes(term));
        
        const personal = state.personalItems.filter(item => check(item.title) || check(item.content));
        const feed = state.feedItems.filter(item => check(item.title) || check(item.content));
        
        return { personal, feed };
    }, [asset, state.personalItems, state.feedItems]);
    
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 400);
    };

    const isPositive = (asset.change24h || 0) >= 0;
    const modalBgClass = state.settings.themeSettings.cardStyle === 'glass' ? 'glass-modal-bg' : 'bg-[var(--bg-secondary)]';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-50" onClick={handleClose}>
            <div 
                className={`${modalBgClass} w-full max-w-2xl max-h-[90vh] responsive-modal rounded-t-3xl shadow-lg flex flex-col border-t border-[var(--border-primary)] ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center sticky top-0 bg-transparent backdrop-blur-sm z-10 rounded-t-3xl">
                    <div>
                        <h2 className="text-xl font-bold themed-title">{asset.name}</h2>
                        <p className="text-sm text-gray-400">{asset.ticker}</p>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full active:scale-95">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </header>

                <div className="p-4 overflow-y-auto">
                    <div className="flex justify-between items-baseline mb-2">
                        <p className="text-3xl font-bold text-white">${asset.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: asset.price && asset.price < 1 ? 6 : 2 })}</p>
                        <p className={`text-lg font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{asset.change24h?.toFixed(2)}% (24ש)
                        </p>
                    </div>
                    {asset.marketCap && <p className="text-sm text-gray-400">שווי שוק: ${asset.marketCap.toLocaleString()}</p>}
                    
                    <div className="mt-4 -mx-4">
                        <Chart data={chartData} />
                    </div>

                    <Section title="הידע שלי" count={relatedItems.personal.length}>
                       {relatedItems.personal.map(item => (
                           <div key={item.id} className="bg-[var(--bg-card)] p-3 rounded-lg">
                               <p className="font-semibold text-white truncate">{item.title}</p>
                               <p className="text-xs text-gray-400 line-clamp-1">{item.content.split('\n')[0]}</p>
                           </div>
                       ))}
                    </Section>

                    <Section title="מהפיד שלי" count={relatedItems.feed.length}>
                       {relatedItems.feed.map(item => (
                           <div key={item.id} className="bg-[var(--bg-card)] p-3 rounded-lg">
                               <p className="font-semibold text-white truncate">{item.title}</p>
                               <p className="text-xs text-gray-400 line-clamp-1">{item.summary_ai || item.content}</p>
                           </div>
                       ))}
                    </Section>
                    
                    <Section title="חדשות אחרונות" isLoading={isLoadingNews} count={latestNews.length}>
                        {latestNews.map(news => (
                            <a key={news.id} href={news.url} target="_blank" rel="noopener noreferrer" className="block bg-[var(--bg-card)] hover:bg-white/5 p-3 rounded-lg transition-colors">
                                <p className="font-semibold text-white">{news.headline}</p>
                                <p className="text-xs text-gray-400 flex items-center gap-2">
                                    <LinkIcon className="w-3 h-3"/>
                                    {news.source} - {new Date(news.datetime * 1000).toLocaleDateString('he-IL')}
                                </p>
                            </a>
                        ))}
                    </Section>
                </div>
            </div>
        </div>
    );
};

export default AssetDetailModal;