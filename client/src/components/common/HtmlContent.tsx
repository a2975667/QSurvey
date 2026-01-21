import React, { useMemo } from 'react';

const ALLOWED_TAGS = new Set([
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
  'img',
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

const isSafeUrl = (value: string, tag: string) => {
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
  if (lower.startsWith('/') || lower.startsWith('./') || lower.startsWith('../')) {
    return true;
  }
  if (lower.startsWith('#')) {
    return true;
  }
  if (tag === 'img' && lower.startsWith('data:image/')) {
    return true;
  }
  return false;
};

const sanitizeStyle = (value: string) => {
  const lower = value.toLowerCase();
  // Block obvious dangerous patterns in the style string as a whole.
  if (lower.includes('expression') || lower.includes('javascript:')) {
    return null;
  }

  // Inspect url() values and block dangerous protocols.
  if (lower.includes('url(')) {
    const urlPattern = /url\(([^)]+)\)/gi;
    let match: RegExpExecArray | null;

    while ((match = urlPattern.exec(lower)) !== null) {
      // Extract and normalize the URL inside url(...)
      const rawUrl = match[1].trim().replace(/^['"]|['"]$/g, '');

      // Disallow clearly dangerous protocols inside CSS url().
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

const sanitizeHtml = (html: string) => {
  if (typeof DOMParser === 'undefined') {
    return escapeHtml(html);
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const sanitizeElement = (element: Element) => {
    const tag = element.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      const parent = element.parentNode;
      if (!parent) return;
      if (tag === 'script' || tag === 'style') {
        parent.removeChild(element);
        return;
      }
      const children = Array.from(element.childNodes);
      children.forEach((child) => parent.insertBefore(child, element));
      parent.removeChild(element);
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
        if (!isSafeUrl(value, tag)) {
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
        return;
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

interface HtmlContentProps {
  html: string;
  className?: string;
}

const HtmlContent: React.FC<HtmlContentProps> = ({ html, className }) => {
  const sanitized = useMemo(() => sanitizeHtml(html), [html]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
};

export default HtmlContent;
