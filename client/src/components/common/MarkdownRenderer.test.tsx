import { render, screen } from '@testing-library/react';
import MarkdownRenderer from './MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('renders common markdown structures', () => {
    const { container } = render(
      <MarkdownRenderer
        content={'# Heading\n\n- first\n- second\n\nParagraph with **bold**, *italic*, and `code`.\n\n[Docs](https://example.com)'}
      />
    );

    expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toBe('italic');
    expect(container.querySelector('code')?.textContent).toBe('code');

    const link = screen.getByRole('link', { name: 'Docs' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('sanitizes unsafe markdown links and html content in the correct modes', () => {
    const markdownRender = render(
      <MarkdownRenderer content={'Click [me](javascript:alert(1))'} />
    );

    expect(markdownRender.container.querySelector('script')).not.toBeInTheDocument();
    expect(markdownRender.container.querySelector('a')).not.toHaveAttribute('href');

    markdownRender.unmount();

    const htmlRender = render(
      <MarkdownRenderer
        content={'<script>alert(1)</script><div onclick="evil()">safe</div>'}
        format="html"
      />
    );

    expect(htmlRender.container.querySelector('script')).not.toBeInTheDocument();
    expect(htmlRender.container.querySelector('[onclick]')).not.toBeInTheDocument();
    expect(screen.getByText('safe')).toBeInTheDocument();
  });

  it('preserves safe raw html in markdown mode before sanitizing it', () => {
    const { container } = render(
      <MarkdownRenderer
        content={'# Heading\n\n<p>Read <strong>carefully</strong> and <a href="https://example.com">open docs</a>. Tom &amp; Jerry&nbsp;stay.</p>'}
      />
    );

    expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByText('carefully')).toHaveProperty('tagName', 'STRONG');

    const link = screen.getByRole('link', { name: 'open docs' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(container.textContent).toContain('Tom & Jerry\u00a0stay.');
    expect(container.innerHTML).not.toContain('&amp;amp;');
    expect(container.innerHTML).not.toContain('&amp;nbsp;');
  });

  it('preserves legacy block html in markdown mode without adding wrapper paragraphs', () => {
    const { container } = render(
      <MarkdownRenderer content={'<h2>Legacy Heading</h2><p>Legacy paragraph.</p>'} />
    );

    expect(screen.getByRole('heading', { name: 'Legacy Heading' })).toBeInTheDocument();
    expect(screen.getByText('Legacy paragraph.')).toBeInTheDocument();
    expect(container.querySelectorAll('p')).toHaveLength(1);
    expect(container.querySelector('p')?.textContent).toBe('Legacy paragraph.');
  });

  it('escapes text mode content', () => {
    const { container } = render(
      <MarkdownRenderer content={'<strong>unsafe</strong>\nnext line'} format="text" />
    );

    expect(container.querySelector('strong')).not.toBeInTheDocument();
    expect(container.innerHTML).toContain('&lt;strong&gt;unsafe&lt;/strong&gt;');
    expect(container.innerHTML).toContain('<br>');
  });

  it('blocks markdown images by default', () => {
    const { container } = render(
      <MarkdownRenderer content={'![Chart](https://example.com/chart.png "chart")'} />
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.textContent).toContain('Chart');
  });

  it('allows safe images when explicitly enabled', () => {
    const { container } = render(
      <MarkdownRenderer
        content={'![Chart](https://example.com/chart.png "chart")'}
        allowImages
      />
    );

    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', 'https://example.com/chart.png');
    expect(image).toHaveAttribute('alt', 'Chart');
    expect(image).toHaveAttribute('title', 'chart');
  });

  it('sanitizes unsafe images moved out of disallowed wrappers', () => {
    const { container } = render(
      <MarkdownRenderer
        content={'<section><img src="javascript:alert(1)" onerror="alert(2)" alt="x"></section>'}
        format="html"
        allowImages
      />
    );

    const image = container.querySelector('img');
    expect(image).toBeInTheDocument();
    expect(image).not.toHaveAttribute('src');
    expect(image).not.toHaveAttribute('onerror');
    expect(image).toHaveAttribute('alt', 'x');
  });

  it('sanitizes unsafe links moved out of disallowed wrappers', () => {
    const { container } = render(
      <MarkdownRenderer
        content={'<article><a href="javascript:alert(1)" onclick="alert(2)">Unsafe</a></article>'}
        format="html"
      />
    );

    const link = container.querySelector('a');
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('Unsafe');
    expect(link).not.toHaveAttribute('href');
    expect(link).not.toHaveAttribute('onclick');
  });

  it('keeps safe layout styles on iframes but strips clickjacking properties', () => {
    const { container } = render(
      <MarkdownRenderer
        content={
          '<iframe src="https://www.youtube.com/embed/abc" style="position:fixed;top:0;left:0;z-index:9999;opacity:0;width:900px;aspect-ratio:16/9;margin:1.5em auto;border-radius:8px"></iframe>'
        }
        format="html"
        allowVideo
      />
    );

    const style = container.querySelector('iframe')?.getAttribute('style') ?? '';
    expect(style).toContain('width:900px');
    expect(style).toContain('aspect-ratio:16/9');
    expect(style).toContain('margin:1.5em auto');
    expect(style).toContain('border-radius:8px');
    expect(style).not.toMatch(/position/);
    expect(style).not.toMatch(/top/);
    expect(style).not.toMatch(/left/);
    expect(style).not.toMatch(/z-index/);
    expect(style).not.toMatch(/opacity/);
  });

  it('removes the iframe style attribute when only unsafe properties remain', () => {
    const { container } = render(
      <MarkdownRenderer
        content={
          '<iframe src="https://www.youtube.com/embed/abc" style="position:fixed;top:0;left:0;opacity:0;z-index:9999"></iframe>'
        }
        format="html"
        allowVideo
      />
    );

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe).not.toHaveAttribute('style');
  });

  it('keeps only safe permission features in the iframe allow attribute', () => {
    const { container } = render(
      <MarkdownRenderer
        content={
          '<iframe src="https://www.youtube.com/embed/abc" allow="autoplay; fullscreen; camera; microphone; geolocation"></iframe>'
        }
        format="html"
        allowVideo
      />
    );

    expect(container.querySelector('iframe')).toHaveAttribute('allow', 'autoplay; fullscreen');
  });

  it('removes the iframe allow attribute when no safe feature remains', () => {
    const { container } = render(
      <MarkdownRenderer
        content={
          '<iframe src="https://www.youtube.com/embed/abc" allow="camera; microphone"></iframe>'
        }
        format="html"
        allowVideo
      />
    );

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe).not.toHaveAttribute('allow');
  });

  it('allows iframes only on the dedicated embed path of a trusted host', () => {
    const { container } = render(
      <MarkdownRenderer
        content={[
          '<iframe src="https://www.youtube.com/embed/abc"></iframe>',
          '<iframe src="https://player.vimeo.com/video/123"></iframe>',
          '<iframe src="https://drive.google.com/file/d/xyz/preview"></iframe>',
        ].join('')}
        format="html"
        allowVideo
      />
    );

    const sources = Array.from(container.querySelectorAll('iframe')).map((el) =>
      el.getAttribute('src'),
    );
    expect(sources).toEqual([
      'https://www.youtube.com/embed/abc',
      'https://player.vimeo.com/video/123',
      'https://drive.google.com/file/d/xyz/preview',
    ]);
  });

  it('rejects trusted hosts on non-embed paths and untrusted embed hosts', () => {
    const { container } = render(
      <MarkdownRenderer
        content={[
          '<iframe src="https://www.youtube.com/redirect?q=https://evil.com"></iframe>',
          '<iframe src="https://www.youtube.com/"></iframe>',
          '<iframe src="https://youtu.be/abc"></iframe>',
          '<iframe src="https://evil.com/embed/abc"></iframe>',
        ].join('')}
        format="html"
        allowVideo
      />
    );

    container.querySelectorAll('iframe').forEach((iframe) => {
      expect(iframe).not.toHaveAttribute('src');
    });
  });

  it('strips srcdoc so inline HTML cannot run as same-origin iframe content', () => {
    const { container } = render(
      <MarkdownRenderer
        content={
          '<iframe src="https://www.youtube.com/embed/abc" srcdoc="<script>alert(document.cookie)</script>"></iframe>'
        }
        format="html"
        allowVideo
      />
    );

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe).not.toHaveAttribute('srcdoc');
    expect(container.querySelector('script')).not.toBeInTheDocument();
  });

  it('forces a restrictive sandbox and referrer policy on iframes', () => {
    const { container } = render(
      <MarkdownRenderer
        content={'<iframe src="https://www.youtube.com/embed/abc"></iframe>'}
        format="html"
        allowVideo
      />
    );

    const iframe = container.querySelector('iframe');
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    expect(iframe).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  });

  it('overrides any author-supplied sandbox that tries to weaken protections', () => {
    const { container } = render(
      <MarkdownRenderer
        content={
          '<iframe src="https://www.youtube.com/embed/abc" sandbox="allow-scripts allow-top-navigation allow-popups"></iframe>'
        }
        format="html"
        allowVideo
      />
    );

    const sandbox = container.querySelector('iframe')?.getAttribute('sandbox') ?? '';
    expect(sandbox).toBe('allow-scripts allow-same-origin allow-presentation');
    expect(sandbox).not.toContain('allow-top-navigation');
    expect(sandbox).not.toContain('allow-popups');
  });

  it('enforces safe rel values on html links that set target', () => {
    render(
      <MarkdownRenderer
        content={'<a href="https://example.com" target="_blank" rel="opener nofollow">External</a>'}
        format="html"
      />
    );

    const link = screen.getByRole('link', { name: 'External' });
    expect(link).toHaveAttribute('rel', 'nofollow noopener noreferrer');
  });
});
