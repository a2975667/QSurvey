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

  it('adds rel to html links that already set target', () => {
    render(
      <MarkdownRenderer
        content={'<a href="https://example.com" target="_blank">External</a>'}
        format="html"
      />
    );

    const link = screen.getByRole('link', { name: 'External' });
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
