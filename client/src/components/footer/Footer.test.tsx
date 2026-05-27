import { render, screen } from '@testing-library/react';
import Footer from './Footer';

describe('Footer', () => {
  it('links to the GitHub source repository', () => {
    render(<Footer />);

    const badge = screen.getByRole('link', {
      name: 'View QSurvey source on GitHub',
    });

    expect(badge).toHaveTextContent('View source on GitHub');
    expect(badge).toHaveAttribute('href', 'https://github.com/a2975667/QSurvey');
    expect(badge).toHaveAttribute('target', '_blank');
    expect(badge).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
