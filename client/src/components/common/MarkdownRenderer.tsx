import React, { useMemo } from 'react';

export type MarkdownContentFormat = 'markdown' | 'html' | 'text';

const BASE_ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'u',
  's',
  'ul',
]);

const GLOBAL_ALLOWED_ATTRS = new Set(['style', 'title']);
const ALLOWED_ATTRS_BY_TAG: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel', 'download', 'title', 'style']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'style']),
  div: new Set(['style', 'title']),
  span: new Set(['style', 'title']),
  p: new Set(['style', 'title']),
  h1: new Set(['style', 'title']),
  h2: new Set(['style', 'title']),
  h3: new Set(['style', 'title']),
  h4: new Set(['style', 'title']),
  h5: new Set(['style', 'title']),
  h6: new Set(['style', 'title']),
  ul: new Set(['style', 'title']),
  ol: new Set(['style', 'title']),
  li: new Set(['style', 'title']),
  blockquote: new Set(['style', 'title']),
  pre: new Set(['style', 'title']),
  code: new Set(['style', 'title']),
  b: new Set(['style', 'title']),
  em: new Set(['style', 'title']),
  i: new Set(['style', 'title']),
  strong: new Set(['style', 'title']),
  u: new Set(['style', 'title']),
  s: new Set(['style', 'title']),
  br: new Set([]),
  hr: new Set([]),
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isSafeUrl = (value: string, tag: string, allowImages: boolean) => {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:')
  ) {
    return true;
  }

  if (lower.startsWith('/') || lower.startsWith('./') || lower.startsWith('../') || lower.startsWith('#')) {
    return true;
  }

  if (allowImages && tag === 'img' && lower.startsWith('data:image/')) {
    return true;
  }

  return false;
};

const sanitizeStyle = (value: string) => {
  const lower = value.toLowerCase();
  if (lower.includes('expression') || lower.includes('javascript:')) {
    return null;
  }

  if (lower.includes('url(')) {
    const urlPattern = /url\(([^)]+)\)/gi;
    let match: RegExpExecArray | null;

    while ((match = urlPattern.exec(lower)) !== null) {
      const rawUrl = match[1].trim().replace(/^['"]|['"]$/g, '');
      if (
        rawUrl.startsWith('javascript:') ||
        rawUrl.startsWith('vbscript:') ||
        rawUrl.startsWith('data:text/html') ||
        rawUrl.startsWith('data:text/javascript') ||
        rawUrl.startsWith('data:application/javascript')
      ) {
        return null;
      }
    }
  }

  return value;
};

const getAllowedTags = (allowImages: boolean) => {
  const tags = new Set(BASE_ALLOWED_TAGS);
  if (allowImages) {
    tags.add('img');
  }
  return tags;
};

export const sanitizeHtml = (html: string, allowImages = false) => {
  if (typeof DOMParser === 'undefined') {
    return escapeHtml(html);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const allowedTags = getAllowedTags(allowImages);

  const sanitizeElement = (element: Element) => {
    const tag = element.tagName.toLowerCase();
    if (!allowedTags.has(tag)) {
      const parent = element.parentNode;
      if (!parent) return;

      if (tag === 'script' || tag === 'style') {
        parent.removeChild(element);
        return;
      }

      const children = Array.from(element.childNodes);
      children.forEach((child) => parent.insertBefore(child, element));
      parent.removeChild(element);
      children.forEach((child) => {
        if (child instanceof Element) {
          sanitizeElement(child);
        }
      });
      return;
    }

    const allowedAttrs = ALLOWED_ATTRS_BY_TAG[tag] || GLOBAL_ALLOWED_ATTRS;
    Array.from(element.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (name.startsWith('on')) {
        element.removeAttribute(attr.name);
        return;
      }

      if (!allowedAttrs.has(name) && !GLOBAL_ALLOWED_ATTRS.has(name)) {
        element.removeAttribute(attr.name);
        return;
      }

      if (name === 'href' || name === 'src') {
        if (!isSafeUrl(value, tag, allowImages)) {
          element.removeAttribute(attr.name);
        }
        return;
      }

      if (name === 'style') {
        const sanitized = sanitizeStyle(value);
        if (!sanitized) {
          element.removeAttribute(attr.name);
        } else {
          element.setAttribute('style', sanitized);
        }
      }
    });

    if (tag === 'a') {
      const target = element.getAttribute('target');
      if (target && !element.getAttribute('rel')) {
        element.setAttribute('rel', 'noopener noreferrer');
      }
    }

    Array.from(element.children).forEach((child) => sanitizeElement(child));
  };

  Array.from(doc.body.children).forEach((child) => sanitizeElement(child));
  return doc.body.innerHTML;
};

const normalizeMarkdownLink = (url: string) => url.trim().replace(/^<|>$/g, '');

const isExternalHttpUrl = (url: string) => /^https?:\/\//i.test(url.trim());

const HTML_ENTITY_PATTERN = /&(?:#[0-9]+|#x[a-fA-F0-9]+|[a-zA-Z][a-zA-Z0-9]+);/g;

const parseInlineMarkdown = (value: string, allowImages: boolean): string => {
  const tokens: string[] = [];
  const createToken = (html: string) => {
    const token = `\u0000${tokens.length}\u0000`;
    tokens.push(html);
    return token;
  };

  let output = value;

  output = output.replace(/`([^`]+)`/g, (_, code: string) => createToken(`<code>${escapeHtml(code)}</code>`));

  output = output.replace(
    /!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)/g,
    (_, alt: string, src: string, title?: string) => {
      if (!allowImages) {
        return createToken(escapeHtml(alt));
      }

      const normalizedSrc = normalizeMarkdownLink(src);
      const attributes = [`src="${escapeHtml(normalizedSrc)}"`, `alt="${escapeHtml(alt)}"`];
      if (title) {
        attributes.push(`title="${escapeHtml(title)}"`);
      }

      return createToken(`<img ${attributes.join(' ')} />`);
    }
  );

  output = output.replace(
    /\[([^\]]+)\]\((\S+?)(?:\s+"([^"]*)")?\)/g,
    (_, text: string, href: string, title?: string) => {
      const normalizedHref = normalizeMarkdownLink(href);
      const attributes = [`href="${escapeHtml(normalizedHref)}"`];
      if (title) {
        attributes.push(`title="${escapeHtml(title)}"`);
      }
      if (isExternalHttpUrl(normalizedHref)) {
        attributes.push('target="_blank"');
      }

      return createToken(`<a ${attributes.join(' ')}>${parseInlineMarkdown(text, allowImages)}</a>`);
    }
  );

  output = output.replace(/<\/?[a-zA-Z][^>]*>/g, (tag) => createToken(tag));
  output = output.replace(HTML_ENTITY_PATTERN, (entity) => createToken(entity));

  output = escapeHtml(output);
  output = output
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>');

  return output.replace(/\u0000(\d+)\u0000/g, (_, index: string) => tokens[Number(index)] ?? '');
};

const renderList = (items: string[], ordered: boolean, allowImages: boolean) => {
  const tag = ordered ? 'ol' : 'ul';
  const renderedItems = items.map((item) => `<li>${parseInlineMarkdown(item, allowImages)}</li>`).join('');
  return `<${tag}>${renderedItems}</${tag}>`;
};

export const renderMarkdownToHtml = (markdown: string, allowImages = false) => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];
  const paragraphLines: string[] = [];
  const listItems: string[] = [];
  let currentListType: 'ol' | 'ul' | null = null;
  let inCodeFence = false;
  let codeFenceLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const paragraph = paragraphLines.join(' ').trim();
    if (paragraph) {
      blocks.push(`<p>${parseInlineMarkdown(paragraph, allowImages)}</p>`);
    }
    paragraphLines.length = 0;
  };

  const flushList = () => {
    if (listItems.length === 0 || !currentListType) return;
    blocks.push(renderList(listItems, currentListType === 'ol', allowImages));
    listItems.length = 0;
    currentListType = null;
  };

  const flushCodeFence = () => {
    blocks.push(`<pre><code>${escapeHtml(codeFenceLines.join('\n'))}</code></pre>`);
    codeFenceLines = [];
  };

  lines.forEach((line) => {
    if (inCodeFence) {
      if (/^```/.test(line.trim())) {
        inCodeFence = false;
        flushCodeFence();
      } else {
        codeFenceLines.push(line);
      }
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    if (/^```/.test(trimmed)) {
      flushParagraph();
      flushList();
      inCodeFence = true;
      codeFenceLines = [];
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${parseInlineMarkdown(headingMatch[2], allowImages)}</h${level}>`);
      return;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push('<hr />');
      return;
    }

    const blockQuoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (blockQuoteMatch) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote><p>${parseInlineMarkdown(blockQuoteMatch[1], allowImages)}</p></blockquote>`);
      return;
    }

    const orderedListMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedListMatch) {
      flushParagraph();
      if (currentListType && currentListType !== 'ol') {
        flushList();
      }
      currentListType = 'ol';
      listItems.push(orderedListMatch[1]);
      return;
    }

    const unorderedListMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (unorderedListMatch) {
      flushParagraph();
      if (currentListType && currentListType !== 'ul') {
        flushList();
      }
      currentListType = 'ul';
      listItems.push(unorderedListMatch[1]);
      return;
    }

    flushList();
    paragraphLines.push(trimmed);
  });

  if (inCodeFence) {
    flushCodeFence();
  }

  flushParagraph();
  flushList();

  return blocks.join('');
};

const renderTextToHtml = (text: string) => escapeHtml(text).replace(/\n/g, '<br />');

export interface MarkdownRendererProps {
  content: string;
  format?: MarkdownContentFormat;
  className?: string;
  allowImages?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  format = 'markdown',
  className,
  allowImages = false,
}) => {
  const rendered = useMemo(() => {
    if (format === 'html') {
      return sanitizeHtml(content, allowImages);
    }

    if (format === 'text') {
      return renderTextToHtml(content);
    }

    return sanitizeHtml(renderMarkdownToHtml(content, allowImages), allowImages);
  }, [allowImages, content, format]);

  return <div className={className} dangerouslySetInnerHTML={{ __html: rendered }} />;
};

export default MarkdownRenderer;
