import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface HtmlContentProps {
  html: string;
  className?: string;
}

const HtmlContent: React.FC<HtmlContentProps> = ({ html, className }) => (
  <MarkdownRenderer content={html} format="html" className={className} allowImages />
);

export default HtmlContent;
