import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const toHtml = (text: string) => {
    if (!text) return '';

    let html = text
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3 border-b border-gray-700 pb-1">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4 border-b-2 border-gray-600 pb-2">$1</h1>')
      
      // Bold and Italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      
      // Inline Code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-700 text-red-300 rounded px-1 py-0.5 text-sm">$1</code>')

      // Lists (handle multiline items)
      .replace(/^\s*[-*] (.*)/gm, (match, content) => {
          return `<li>${content.trim()}</li>`;
      })
      .replace(/<\/li>\s*<li>/g, '</li><li>') // clean up spacing
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/<\/ul>\s*<ul>/g, ''); // Merge consecutive lists
    
    // Convert remaining newlines to <br>, but not if they are next to a block element tag
    return html.split('\n').map(line => line.trim()).filter(line => line).join('\n').replace(/\n/g, '<br />');
  };

  return (
    <div
      className="prose-custom whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: toHtml(content) }}
    />
  );
};

export default MarkdownRenderer;
