import React, { useMemo } from 'react';
import showdown from 'showdown';

interface MarkdownRendererProps {
  content: string;
}

// Create a single, configured showdown converter instance.
// It's safe to reuse this instance.
const converter = new showdown.Converter({
  tables: true,
  simplifiedAutoLink: true,
  strikethrough: true,
  tasklists: true,
  ghCompatibleHeaderId: true,
  openLinksInNewWindow: true,
  // SECURITY: Sanitize the output to prevent XSS attacks.
  sanitize: true, 
});

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const htmlContent = useMemo(() => {
    if (!content) return '';
    return converter.makeHtml(content);
  }, [content]);

  return (
    <div
      className="prose-custom whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MarkdownRenderer;