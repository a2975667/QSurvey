import { render, screen } from '@testing-library/react';
import { IQuestion } from '../../types/coreTypes';
import { QuestionPrompt } from './questionPrompt';

const makeQuestion = (description: string): IQuestion => ({
    question: 'How should this be rendered?',
    questionId: 'question-1',
    description,
    type: 'text',
    status: 'active',
});

describe('QuestionPrompt', () => {
    it('preserves allowed HTML formatting in descriptions', () => {
        render(
            <QuestionPrompt
                question={makeQuestion(
                    '<p>Please read <strong>carefully</strong> and <em>compare</em> <a href="https://example.com" target="_blank">details</a>.</p>',
                )}
                instructions={false}
            />,
        );

        expect(screen.getByText('carefully')).toHaveProperty('tagName', 'STRONG');
        expect(screen.getByText('compare')).toHaveProperty('tagName', 'EM');

        const link = screen.getByRole('link', { name: 'details' });
        expect(link).toHaveAttribute('href', 'https://example.com');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('strips unsafe HTML from descriptions before rendering', () => {
        const { container } = render(
            <QuestionPrompt
                question={makeQuestion(
                    '<p onclick="alert(1)">Visible text</p><img src="x" onerror="alert(2)" alt="bad image"><a href="javascript:alert(3)">bad link</a><script>alert(4)</script>',
                )}
                instructions={false}
            />,
        );

        expect(screen.getByText('Visible text')).toBeInTheDocument();
        expect(screen.getByAltText('bad image')).toBeInTheDocument();
        expect(screen.getByText('bad link')).toBeInTheDocument();
        expect(container.querySelector('script')).not.toBeInTheDocument();

        const paragraph = screen.getByText('Visible text');
        expect(paragraph).not.toHaveAttribute('onclick');

        const image = screen.getByAltText('bad image');
        expect(image).not.toHaveAttribute('onerror');

        const link = screen.getByText('bad link');
        expect(link).not.toHaveAttribute('href');

        expect(container.innerHTML).not.toContain('javascript:');
        expect(container.innerHTML).not.toContain('onerror');
        expect(container.innerHTML).not.toContain('onclick');
        expect(container.innerHTML).not.toContain('<script');
    });

    it('sanitizes descriptions when instruction content is also rendered', () => {
        const { container } = render(
            <QuestionPrompt
                question={makeQuestion('<p>Instruction branch description</p><a href="javascript:alert(1)">unsafe link</a>')}
                instructions={true}
            />,
        );

        expect(screen.getByText('Introduction to QCS')).toBeInTheDocument();
        expect(screen.getByText('Instruction branch description')).toBeInTheDocument();
        expect(screen.getByText('unsafe link')).not.toHaveAttribute('href');
        expect(container.innerHTML).not.toContain('javascript:');
    });
});
