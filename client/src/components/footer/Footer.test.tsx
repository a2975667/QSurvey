import { render, screen } from '@testing-library/react';
import Footer from './Footer';

describe('Footer', () => {
  it('links to the open source GitHub repository', () => {
    render(<Footer />);

    const badge = screen.getByRole('link', {
      name: 'QSurvey open source repository on GitHub',
    });

    expect(badge).toHaveTextContent('Open source on GitHub');
    expect(badge).toHaveAttribute('href', 'https://github.com/a2975667/QSurvey');
    expect(badge).toHaveAttribute('target', '_blank');
    expect(badge).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
