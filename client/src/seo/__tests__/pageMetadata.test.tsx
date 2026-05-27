import { render } from '@testing-library/react';
import { usePageMetadata } from '../pageMetadata';

const TestPage = (props: Parameters<typeof usePageMetadata>[0]) => {
  usePageMetadata(props);
  return null;
};

describe('usePageMetadata', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = 'Previous Title';
  });

  it('sets route metadata with optional social titles and restores previous values on unmount', () => {
    const description = document.createElement('meta');
    description.setAttribute('name', 'description');
    description.content = 'Previous description';
    document.head.appendChild(description);

    const canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.href = 'https://qsurvey.online/previous';
    document.head.appendChild(canonical);

    const { unmount } = render(
      <TestPage
        title="Route Title"
        description="Route description"
        canonicalPath="/about"
        openGraphTitle="Share Title"
      />,
    );

    expect(document.title).toBe('Route Title');
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Route description',
    );
    expect(document.head.querySelector('meta[property="og:title"]')).toHaveAttribute('content', 'Share Title');
    expect(document.head.querySelector('meta[name="twitter:title"]')).toHaveAttribute('content', 'Share Title');
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://qsurvey.online/about',
    );

    unmount();

    expect(document.title).toBe('Previous Title');
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Previous description',
    );
    expect(document.head.querySelector('meta[property="og:title"]')).not.toBeInTheDocument();
    expect(document.head.querySelector('meta[name="twitter:title"]')).not.toBeInTheDocument();
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://qsurvey.online/previous',
    );
  });
});
