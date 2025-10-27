import React from 'react';
import type { Tag } from '../types';

interface TagCloudProps {
  tagsWithCounts: { tag: Tag; count: number }[];
  onTagClick: (tagName: string) => void;
}

const TagCloud: React.FC<TagCloudProps> = ({ tagsWithCounts, onTagClick }) => {

  const minCount = Math.min(...tagsWithCounts.map(t => t.count));
  const maxCount = Math.max(...tagsWithCounts.map(t => t.count));

  const getFontSize = (count: number) => {
    if (maxCount === minCount) return '1rem'; // 16px
    const sizeRange = 1.25 - 0.875; // from 14px to 20px (in rem)
    const countRange = maxCount - minCount;
    const size = 0.875 + (sizeRange * (count - minCount)) / countRange;
    return `${size}rem`;
  };

  if (tagsWithCounts.length === 0) {
      return <p className="text-center text-gray-500">אין תגיות להצגה. הוסף תגיות לספארקים שלך!</p>
  }

  return (
    <div className="flex flex-wrap justify-center items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-lg">
      {tagsWithCounts.map(({ tag, count }) => (
        <button
          key={tag.id}
          onClick={() => onTagClick(tag.name)}
          className="p-2 text-gray-300 transition-colors hover:text-blue-400"
          style={{ fontSize: getFontSize(count), lineHeight: '1' }}
          aria-label={`חפש '${tag.name}' (${count} פריטים)`}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
};

export default TagCloud;
