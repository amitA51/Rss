import React, { useMemo } from 'react';
import type { Tag, FeedItem } from '../types';

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
    
    // FIX: Explicitly type `counts` to resolve type inference error on the following lines.
    const counts: number[] = Array.from(tagFrequencies.values());
    // FIX: Using Math.min/max on a spread array is cleaner and avoids potential issues
    // with type inference in the `reduce` function. Since tagFrequencies is not empty,
    // `counts` will also not be empty, making this safe.
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

  const colorPalette = [
    'text-blue-300', 'text-purple-300', 'text-teal-300', 'text-pink-300', 'text-green-300'
  ];

  return (
    <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 p-4 max-w-2xl mx-auto">
      {sizedTags.map((tag, index) => (
        <button
          key={tag.id}
          onClick={() => onTagClick(tag.name)}
          className="transition-all duration-300 hover:text-white hover:scale-110"
          style={{
            fontSize: `${tag.fontSize}px`,
            color: 'var(--glow-color-blue)',
            // Applying colors from a palette
            // color: colorPalette[index % colorPalette.length],
            opacity: 0.6 + (tag.fontSize - 14) / (32 - 14) * 0.4,
            fontWeight: 600,
          }}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
};

export default TagCloud;