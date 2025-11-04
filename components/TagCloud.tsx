import React, { useMemo } from 'react';
import type { Tag, FeedItem } from '../types';
import { getTagColor } from './icons';

interface TagCloudProps {
  tags: Tag[];
  items: FeedItem[];
  onTagClick: (tagName: string) => void;
}

const TagCloud: React.FC<TagCloudProps> = ({ tags, items, onTagClick }) => {
  const tagFrequencies = useMemo(() => {
    const frequencies = new Map<string, number>();
    items.forEach(item => {
      item.tags.forEach(tag => {
        frequencies.set(tag.id, (frequencies.get(tag.id) || 0) + 1);
      });
    });
    return frequencies;
  }, [items]);

  const sizedTags = useMemo(() => {
    if (tagFrequencies.size === 0) return [];
    
    // FIX: Explicitly type `counts` as `number[]` to ensure type safety for Math.min/max.
    const counts: number[] = Array.from(tagFrequencies.values());
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    
    const minFontSize = 14; // pixels
    const maxFontSize = 32; // pixels

    return tags
      .map(tag => {
        const count = tagFrequencies.get(tag.id) || 0;
        if (count === 0) return null;
        
        let fontSize = minFontSize;
        if (maxCount > minCount) {
          const scale = (count - minCount) / (maxCount - minCount);
          fontSize = minFontSize + scale * (maxFontSize - minFontSize);
        } else if (maxCount > 0) {
            fontSize = (minFontSize + maxFontSize) / 2;
        }

        return {
          ...tag,
          fontSize,
          count,
        };
      })
      .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
      .sort((a, b) => b.count - a.count);
  }, [tags, tagFrequencies]);

  return (
    <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 p-4 max-w-2xl mx-auto">
      {sizedTags.map((tag) => {
        const colors = getTagColor(tag.name);
        return (
            <button
            key={tag.id}
            onClick={() => onTagClick(tag.name)}
            className="transition-all duration-300 hover:scale-110"
            style={{
                fontSize: `${tag.fontSize}px`,
                color: colors.textColor,
                opacity: 0.8,
                fontWeight: 600,
                textShadow: '0 1px 3px rgba(0,0,0,0.5)'
            }}
            >
            {tag.name}
            </button>
        )
      })}
    </div>
  );
};

export default TagCloud;