import React, { useState, useEffect, useCallback, useContext, memo, useRef } from 'react';
import type { FinancialAsset, WatchlistItem } from '../types';
import type { Screen } from '../types';
import * as dataService from '../services/dataService';
import * as financialsService from '../services/financialsService';
import { AddIcon, TrashIcon, ChartBarIcon, SparklesIcon } from '../components/icons';
import StatusMessage, { StatusMessageType } from '../components/StatusMessage';
import { AppContext } from '../state/AppContext';
import AssetDetailModal from '../components/AssetDetailModal';

// --- Helper Components ---

const MiniChart: React.FC<{ data?: number[], isPositive: boolean }> = ({ data, isPositive }) => {
    if (!data || data.length < 2) {
        return <div className="h-10 w-24 bg-gray-800/50 rounded-md" />;
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 96;
        const y = 38 - ((d - min) / range) * 36;
        return `${x},${y}`;
    }).join(' ');

    const color = isPositive ? '#4ADE80' : '#F87171';
    const glowColor = isPositive ? 'rgba(74, 222, 128, 0.5)' : 'rgba(248, 113, 113, 0.5)';

    return (
        <svg width="96" height="40" viewBox="0 0 96 40" className="opacity-70" style={{ filter: `drop-shadow(0 0 5px ${glowColor})`}}>
            <defs>
                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                points={points}
            />
            <polygon
                fill={`url(#gradient-${color})`}
                points={`0,40 ${points} 96,40`}
            />
        </svg>
    );
};

const AssetCard = memo(function AssetCard({ asset, onRemove, onClick }: { asset: FinancialAsset; onRemove: () => void; onClick: () => void; }) {
    const isPositive = (asset.change24h || 0) >= 0;
    const price = asset.price !== undefined ? asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: asset.price < 1 ? 6 : 2 }) : '--';
    const change = asset.change24h !== undefined ? asset.change24h.toFixed(2) : '--';
    
    return (
        <div 
            onClick={onClick}
            className="group relative themed-card p-4 transition-all cursor-pointer active:scale-97 hover:-translate-y-1"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-lg font-semibold text-white">{asset.name}</p>
                    <p className="text-sm text-gray-400">{asset.ticker}</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-light tracking-tight text-white">${price}</p>
                    <p className={`text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{change}%
                    </p>
                </div>
            </div>
            <div className="mt-2">
                <MiniChart data={asset.sparkline} isPositive={isPositive} />
            </div>
             <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="absolute top-2 left-2 text-gray-600 hover:text-red-400 transition-all transform hover:scale-110 flex-shrink-0 opacity-0 group-hover:opacity-100"
                aria-label={`הסר ${asset.name}`}
            >
                <TrashIcon className="h-5 w-5" />
            </button>
        </div>
    );
});

const SkeletonCard: React.FC = () => (
  <div className="themed-card p-4 shimmer-bg">
    <div className="flex justify-between items-start">
        <div>
            <div className="h-6 w-32 bg-[var(--bg-secondary)] rounded-md mb-2"></div>
            <div className="h-4 w-16 bg-[var(--bg-secondary)] rounded-md"></div>
        </div>
        <div className="text-right">
            <div className="h-6 w-24 bg-[var(--bg-secondary)] rounded-md mb-2"></div>
            <div className="h-4 w-12 bg-[var(--bg-secondary)] rounded-md ml-auto"></div>
        </div>
    </div>
    <div className="mt-4 h-10 w-24 bg-[var(--bg-secondary)] rounded-md"></div>
  </div>
);

// --- Main Screen Component ---

interface InvestmentsScreenProps {
    setActiveScreen: (screen: Screen) => void;
}

const InvestmentsScreen: React.FC<InvestmentsScreenProps> = ({ setActiveScreen }) => {
    const { state } = useContext(AppContext);

    const [watchlist, setWatchlist] = useState<FinancialAsset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newTicker, setNewTicker] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<FinancialAsset | null>(null);
    const [statusMessage, setStatusMessage] = useState<{type: StatusMessageType, text: string, id: number} | null>(null);
    const headerRef = useRef<HTMLElement>(null);

    // Fi Principle: Parallax Header for Immersive Depth
    useEffect(() => {
        const handleScroll = () => {
            if (headerRef.current) {
                const scrollY = window.scrollY;
                const translateY = Math.min(scrollY * 0.5, 150);
                headerRef.current.style.transform = `translateY(-${translateY}px)`;
                headerRef.current.style.opacity = `${Math.max(1 - scrollY / 200, 0)}`;
            }
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const showStatus = (type: StatusMessageType, text: string) => {
        setStatusMessage({ type, text, id: Date.now() });
    };

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // FIX: Added `await` to the `dataService.getWatchlist()` call. Since `getWatchlist` is an asynchronous function returning a Promise, `await` is necessary to ensure the watchlist data is fully retrieved before proceeding to fetch financial data.
            const currentWatchlist = await dataService.getWatchlist();
            const data = await financialsService.fetchWatchlistData(currentWatchlist);
            setWatchlist(data);
        } catch (error) {
            console.error("Failed to load watchlist data:", error);
            showStatus('error', 'שגיאה בטעינת נתוני השוק');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTicker || isAdding) return;
        setIsAdding(true);
        try {
            const newWatchlistItem = await dataService.addToWatchlist(newTicker);
            const newData = await financialsService.fetchWatchlistData([newWatchlistItem]);
            if (newData && newData.length > 0) {
                setWatchlist(prev => [newData[0], ...prev]);
            }
            if (window.navigator.vibrate) window.navigator.vibrate(20);
            setNewTicker('');
            showStatus('success', `${newTicker.toUpperCase()} נוסף למעקב.`);
        } catch (error: any) {
            showStatus('error', error.message || 'שגיאה בהוספת נכס');
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemove = async (ticker: string) => {
        if (window.navigator.vibrate) window.navigator.vibrate(20);
        await dataService.removeFromWatchlist(ticker);
        setWatchlist(prev => prev.filter(asset => asset.ticker !== ticker));
        showStatus('success', `${ticker} הוסר מהמעקב.`);
    };

    return (
        <div className="pt-4 pb-8 space-y-6">
            <header ref={headerRef} className="flex justify-between items-center -mx-4 px-4 sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-md py-3 z-20 transition-transform,opacity duration-300">
                 <h1 className="hero-title themed-title">
                    {state.settings.screenLabels?.investments || 'השקעות'}
                </h1>
            </header>

            <form onSubmit={handleAdd} className="flex gap-2">
                <input
                    type="text"
                    value={newTicker}
                    onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                    placeholder="הוסף סימול (למשל: TSLA, BTC)"
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-white rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--dynamic-accent-start)]/50"
                />
                <button type="submit" disabled={isAdding} className="bg-[var(--accent-gradient)] text-white font-bold p-3 rounded-xl disabled:opacity-50 transition-transform transform active:scale-97 hover:brightness-110 shadow-lg shadow-[var(--dynamic-accent-start)]/30">
                    {isAdding ? <SparklesIcon className="w-6 h-6 animate-pulse"/> : <AddIcon className="w-6 h-6"/>}
                </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isLoading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                {!isLoading && watchlist.map((asset, index) => (
                    <div key={asset.ticker} className="animate-item-enter-fi" style={{ animationDelay: `${index * 50}ms` }}>
                        <AssetCard 
                            asset={asset} 
                            onRemove={() => handleRemove(asset.ticker)}
                            onClick={() => setSelectedAsset(asset)}
                        />
                    </div>
                ))}
            </div>

            {!isLoading && watchlist.length === 0 && (
                 <div className="text-center text-[var(--text-secondary)] mt-16 flex flex-col items-center">
                    <ChartBarIcon className="w-20 h-20 text-gray-700 mb-4"/>
                    <h2 className="font-bold text-xl text-white">רשימת המעקב ריקה</h2>
                    <p className="max-w-xs mt-2">השתמש בטופס למעלה כדי להוסיף את המניות והמטבעות הראשונים שלך למעקב.</p>
                </div>
            )}

            {selectedAsset && (
                <AssetDetailModal
                    asset={selectedAsset}
                    onClose={() => setSelectedAsset(null)}
                />
            )}

            {statusMessage && <StatusMessage key={statusMessage.id} type={statusMessage.type} message={statusMessage.text} onDismiss={() => setStatusMessage(null)} />}
        </div>
    );
};

export default InvestmentsScreen;