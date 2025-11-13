import React, { useMemo, useState } from 'react';

interface SiteIconProps {
  site: string;
  className?: string;
}

const getHostname = (site: string): string => {
    try {
        const url = new URL(site.startsWith('http') ? site : `https://${site}`);
        return url.hostname.replace('www.', '');
    } catch {
        return site;
    }
};

const stringToHslColor = (str: string, s: number, l: number): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, ${s}%, ${l}%)`;
};

const getInitial = (site: string): string => {
    const hostname = getHostname(site);
    return (hostname[0] || '').toUpperCase();
};

const SiteIcon: React.FC<SiteIconProps> = ({ site, className = 'w-10 h-10' }) => {
    const [useFallback, setUseFallback] = useState(false);
    const hostname = useMemo(() => getHostname(site), [site]);
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;

    const initial = useMemo(() => getInitial(hostname), [hostname]);
    const bgColor = useMemo(() => stringToHslColor(hostname, 50, 30), [hostname]);
    const textColor = useMemo(() => stringToHslColor(hostname, 60, 85), [hostname]);

    if (useFallback || !hostname) {
        return (
            <div
                className={`flex items-center justify-center rounded-lg font-bold text-lg ${className}`}
                style={{ backgroundColor: bgColor, color: textColor }}
            >
                {initial}
            </div>
        );
    }

    return (
        <img
            src={faviconUrl}
            alt={`${site} favicon`}
            className={`rounded-lg bg-gray-700 object-contain ${className}`}
            onError={() => setUseFallback(true)}
        />
    );
};

export default SiteIcon;