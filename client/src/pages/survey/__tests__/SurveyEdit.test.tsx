import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import SurveyEdit from '../SurveyEdit';
import authReducer, { loginSuccess } from '../../../features/authSlice';
import { API_PREFIX } from '../../../config';

const SURVEY_ID = 'survey-123';

jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');
    return {
      __esModule: true,
      useParams: () => ({ surveyId: SURVEY_ID }),
      useNavigate: () => jest.fn(),
      Link: ({ children }: { children: React.ReactNode }) => React.createElement('a', {}, children),
    };
  },
  { virtual: true },
);

jest.mock(
  '../../../components/Logout',
  () => {
    const React = require('react');
    return {
      __esModule: true,
      default: () => React.createElement('button', { type: 'button' }, 'Logout'),
    };
  },
  { virtual: true },
);

jest.mock(
  '../../../components/Banner',
  () => {
    const React = require('react');
    return {
      __esModule: true,
      default: ({ children, title }: { children: React.ReactNode; title: string }) =>
        React.createElement('div', { 'data-testid': 'banner-stub' }, [
          React.createElement('h1', { key: 'title' }, title),
          children,
        ]),
    };
  },
  { virtual: true },
);

const createStore = () =>
  configureStore({
    reducer: {
      auth: authReducer.reducer,
    },
  });

const mockSurveyResponse = (questions: any[]) => ({
  ok: true,
  json: async () => ({
    _id: SURVEY_ID,
    title: 'Test Survey',
    description: 'A survey used for designer tests',
    settings: {
      hasSKey: false,
      sKeyValue: '',
      hasUKey: false,
      isAvailable: true,
    },
    questions,
    questionGroups: [],
  }),
  headers: {
    get: () => null,
  },
});

const mockSuccessResponse = () => ({
  ok: true,
  json: async () => ({}),
  headers: {
    get: () => null,
  },
});

const mockCollaboratorsResponse = (collaborators: any[] = []) => ({
  ok: true,
  json: async () => ({ collaborators }),
  headers: { get: () => null },
});

const renderSurveyEdit = () => {
  const store = createStore();
  store.dispatch(
    loginSuccess({
      token: 'designer-token',
      user: { id: 'designer-1', email: 'designer@example.org', roles: ['designer'] },
    }),
  );

  return render(
    <Provider store={store}>
      <SurveyEdit />
    </Provider>,
  );
};

describe('SurveyEdit designer workflows', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('allows adding another QV question when one already exists', async () => {
    const existingQuestion = {
      _id: 'qv-1',
      question: 'Existing QV Question',
      description: 'First',
      type: 'qv',
      options: [
        { optionId: 'opt-1', optionName: 'Alpha', description: 'A' },
        { optionId: 'opt-2', optionName: 'Beta', description: 'B' },
      ],
      setting: { questionType: 'qv', totalCredits: 100, version: 1 },
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockSurveyResponse([existingQuestion]))
      .mockResolvedValueOnce(mockCollaboratorsResponse())
      .mockResolvedValueOnce(mockSuccessResponse())
      .mockResolvedValueOnce(
        mockSurveyResponse([
          existingQuestion,
          {
            _id: 'qv-2',
            question: 'Second QV Question',
            description: 'Desc',
            type: 'qv',
            options: [
              { optionId: 'opt-3', optionName: 'Gamma', description: 'Gamma desc' },
              { optionId: 'opt-4', optionName: 'Delta', description: 'Delta desc' },
            ],
            setting: { questionType: 'qv', totalCredits: 100, version: 1 },
          },
        ]),
      )
      .mockResolvedValueOnce(mockCollaboratorsResponse());

    renderSurveyEdit();

    await screen.findByText('Existing QV Question');

    fireEvent.click(screen.getByRole('button', { name: /add question/i }));

    const questionInput = screen.getByLabelText('Question Text:');
    fireEvent.change(questionInput, { target: { value: 'Second QV Question' } });
    fireEvent.change(screen.getByLabelText('Description/Instructions:'), {
      target: { value: 'Desc' },
    });
    const optionNameInputs = screen.getAllByLabelText('Option Name:');
    const optionDescInputs = screen.getAllByLabelText('Description:');
    expect(optionNameInputs.length).toBeGreaterThanOrEqual(2);
    expect(optionDescInputs.length).toBeGreaterThanOrEqual(2);

    fireEvent.change(optionNameInputs[0], { target: { value: 'Gamma' } });
    fireEvent.change(optionDescInputs[0], { target: { value: 'Gamma desc' } });
    fireEvent.change(optionNameInputs[1], { target: { value: 'Delta' } });
    fireEvent.change(optionDescInputs[1], { target: { value: 'Delta desc' } });

    const form = questionInput.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(5));
    await screen.findByText('Second QV Question');

    const postCall = (global.fetch as jest.Mock).mock.calls[2];
    expect(postCall[0]).toBe('http://localhost:6060/api/v1/protected/questions/qv');
    const body = JSON.parse(postCall[1].body as string);
    expect(body).toMatchObject({
      type: 'qv',
      surveyId: SURVEY_ID,
      question: 'Second QV Question',
      description: 'Desc',
    });
    expect(body.options).toEqual([
      { description: 'Gamma desc', optionName: 'Gamma' },
      { description: 'Delta desc', optionName: 'Delta' },
    ]);
  });

  it('posts a text question payload when the Text Input type is selected', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockSurveyResponse([]))
      .mockResolvedValueOnce(mockCollaboratorsResponse())
      .mockResolvedValueOnce(mockSuccessResponse())
      .mockResolvedValueOnce(
        mockSurveyResponse([
          {
            _id: 'text-1',
            type: 'text',
            question: 'My text question',
            description: 'Explain',
            multiline: true,
            maxLength: 250,
            setting: { questionType: 'text' },
          },
        ]),
      )
      .mockResolvedValueOnce(mockCollaboratorsResponse());

    renderSurveyEdit();

    await screen.findByText("This survey doesn't have any questions yet.");

    fireEvent.click(screen.getByRole('button', { name: /add question/i }));
    fireEvent.click(screen.getByRole('button', { name: /text input/i }));

    const questionInput = screen.getByLabelText('Question Text:');
    fireEvent.change(questionInput, { target: { value: 'My text question' } });
    fireEvent.change(screen.getByLabelText('Description/Instructions:'), {
      target: { value: 'Explain' },
    });
    fireEvent.click(screen.getByLabelText('Allow multiple lines of text (paragraph)'));
    fireEvent.change(screen.getByLabelText('Maximum Character Length:'), {
      target: { value: '250' },
    });

    const form = questionInput.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(5));
    await screen.findByText('My text question');

    const postCall = (global.fetch as jest.Mock).mock.calls[2];
    expect(postCall[0]).toBe('http://localhost:6060/api/v1/protected/questions/text');
    const body = JSON.parse(postCall[1].body as string);
    expect(body).toMatchObject({
      type: 'text',
      surveyId: SURVEY_ID,
      question: 'My text question',
      description: 'Explain',
      multiline: true,
      maxLength: 250,
    });
  });

  it('posts a likert question payload when the Likert type is selected', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockSurveyResponse([]))
      .mockResolvedValueOnce(mockCollaboratorsResponse())
      .mockResolvedValueOnce(mockSuccessResponse())
      .mockResolvedValueOnce(
        mockSurveyResponse([
          {
            _id: 'likert-1',
            type: 'likert',
            question: 'My likert question',
            description: 'Explain Likert',
            scale: ['1', '2', '3', '4', '5'],
            minLabel: 'Low',
            maxLabel: 'High',
            setting: { questionType: 'likert' },
          },
        ]),
      )
      .mockResolvedValueOnce(mockCollaboratorsResponse());

    renderSurveyEdit();

    await screen.findByText("This survey doesn't have any questions yet.");

    fireEvent.click(screen.getByRole('button', { name: /add question/i }));
    fireEvent.click(screen.getByRole('button', { name: /likert scale/i }));

    const questionInput = screen.getByLabelText('Question Text:');
    fireEvent.change(questionInput, { target: { value: 'My likert question' } });
    fireEvent.change(screen.getByLabelText('Description/Instructions:'), {
      target: { value: 'Explain Likert' },
    });
    fireEvent.change(screen.getByLabelText('Minimum Scale Label:'), {
      target: { value: 'Low' },
    });
    fireEvent.change(screen.getByLabelText('Maximum Scale Label:'), {
      target: { value: 'High' },
    });

    const form = questionInput.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(5));
    await screen.findByText('My likert question');

    const postCall = (global.fetch as jest.Mock).mock.calls[2];
    expect(postCall[0]).toBe('http://localhost:6060/api/v1/protected/questions/likert');
    const body = JSON.parse(postCall[1].body as string);
    expect(body).toMatchObject({
      type: 'likert',
      surveyId: SURVEY_ID,
      question: 'My likert question',
      description: 'Explain Likert',
      minLabel: 'Low',
      maxLabel: 'High',
    });
    expect(body.scale).toEqual(['1', '2', '3', '4', '5']);
  });

  it('falls back to public API when protected questions are unpopulated', async () => {
    (global.fetch as jest.Mock)
      // initial protected fetch returns mix of populated and string IDs
      .mockResolvedValueOnce(
        mockSurveyResponse([
          {
            _id: 'qv-1',
            question: 'Existing QV Question',
            description: 'First',
            type: 'qv',
            options: [
              { optionId: 'opt-1', optionName: 'Alpha', description: 'A' },
              { optionId: 'opt-2', optionName: 'Beta', description: 'B' },
            ],
            setting: { questionType: 'qv', totalCredits: 100, version: 1 },
          },
          'text-1', // triggers fallback
        ]),
      )
      // public fallback with populated question
      .mockResolvedValueOnce(
        mockSurveyResponse([
          {
            _id: 'qv-1',
            question: 'Existing QV Question',
            description: 'First',
            type: 'qv',
            options: [
              { optionId: 'opt-1', optionName: 'Alpha', description: 'A' },
              { optionId: 'opt-2', optionName: 'Beta', description: 'B' },
            ],
            setting: { questionType: 'qv', totalCredits: 100, version: 1 },
          },
          {
            _id: 'text-1',
            type: 'text',
            question: 'My text question',
            description: 'Explain',
            multiline: false,
            maxLength: 120,
            setting: { questionType: 'text' },
          },
        ]),
      )
      .mockResolvedValueOnce(mockCollaboratorsResponse())
      // question creation
      .mockResolvedValueOnce(mockSuccessResponse())
      // protected fetch after save still unpopulated
      .mockResolvedValueOnce(mockSurveyResponse(['text-1']))
      // public API fallback with populated question
      .mockResolvedValueOnce(
        mockSurveyResponse([
          {
            _id: 'qv-1',
            question: 'Existing QV Question',
            description: 'First',
            type: 'qv',
            options: [
              { optionId: 'opt-1', optionName: 'Alpha', description: 'A' },
              { optionId: 'opt-2', optionName: 'Beta', description: 'B' },
            ],
            setting: { questionType: 'qv', totalCredits: 100, version: 1 },
          },
          {
            _id: 'text-1',
            type: 'text',
            question: 'My text question',
            description: 'Explain',
            multiline: false,
            maxLength: 120,
            setting: { questionType: 'text' },
          },
        ]),
      )
      .mockResolvedValueOnce(mockCollaboratorsResponse());

    renderSurveyEdit();

    await screen.findByText('Existing QV Question');
    fireEvent.click(screen.getByRole('button', { name: /add question/i }));
    fireEvent.click(screen.getByRole('button', { name: /text input/i }));

    const questionInput = screen.getByLabelText('Question Text:');
    fireEvent.change(questionInput, { target: { value: 'My text question' } });
    fireEvent.change(screen.getByLabelText('Description/Instructions:'), {
      target: { value: 'Explain' },
    });
    fireEvent.change(screen.getByLabelText('Maximum Character Length:'), {
      target: { value: '120' },
    });

    const form = questionInput.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(7));
    await screen.findByText('My text question');
  });

  it('posts an approval question payload and renders it after refresh', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockSurveyResponse([]))
      .mockResolvedValueOnce(mockCollaboratorsResponse())
      .mockResolvedValueOnce(mockSuccessResponse())
      .mockResolvedValueOnce(
        mockSurveyResponse([
          {
            _id: 'approval-1',
            type: 'approval',
            question: 'Approval question',
            description: 'Choose sentiments',
            randomizeOptions: true,
            options: [
              { optionId: 'a', optionName: 'Alpha', description: 'A' },
              { optionId: 'b', optionName: 'Bravo', description: 'B' },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(mockCollaboratorsResponse());

    renderSurveyEdit();

    await screen.findByText("This survey doesn't have any questions yet.");

    fireEvent.click(screen.getByRole('button', { name: /add question/i }));
    fireEvent.click(screen.getByRole('button', { name: /approval/i }));

    const questionInput = screen.getByLabelText('Question Text:');
    fireEvent.change(questionInput, { target: { value: 'Approval question' } });
    fireEvent.change(screen.getByLabelText('Description/Instructions:'), {
      target: { value: 'Choose sentiments' },
    });

    const optionNameInputs = screen.getAllByLabelText('Option Name:');
    const optionDescInputs = screen.getAllByLabelText('Description:');
    fireEvent.change(optionNameInputs[0], { target: { value: 'Alpha' } });
    fireEvent.change(optionDescInputs[0], { target: { value: 'A' } });
    fireEvent.change(optionNameInputs[1], { target: { value: 'Bravo' } });
    fireEvent.change(optionDescInputs[1], { target: { value: 'B' } });

    const form = questionInput.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(5));
    await screen.findByText('Approval question');

    const postCall = (global.fetch as jest.Mock).mock.calls[2];
    expect(postCall[0]).toBe('http://localhost:6060/api/v1/protected/questions/approval');
    const body = JSON.parse(postCall[1].body as string);
    expect(body).toMatchObject({
      type: 'approval',
      surveyId: SURVEY_ID,
      question: 'Approval question',
      description: 'Choose sentiments',
      randomizeOptions: true,
    });
    expect(body.options).toEqual([
      { description: 'A', optionName: 'Alpha' },
      { description: 'B', optionName: 'Bravo' },
    ]);
  });

  it('creates collaborator pills from lookup and saves them', async () => {
    const lookupUserId = 'user-2';
    (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
      if (url === `${API_PREFIX}/protected/surveys/${SURVEY_ID}`) {
        return Promise.resolve(mockSurveyResponse([]));
      }
      if (url === `${API_PREFIX}/protected/surveys/${SURVEY_ID}/collaborators`) {
        if (!options || options.method === undefined) {
          return Promise.resolve(
            mockCollaboratorsResponse([
              { userId: 'designer-1', email: 'designer@example.org', isSelf: true },
            ]),
          );
        }
        if (options.method === 'PUT') {
          return Promise.resolve(
            mockCollaboratorsResponse([
              { userId: 'designer-1', email: 'designer@example.org', isSelf: true },
              { userId: lookupUserId, email: 'collab@example.com', isSelf: false },
            ]),
          );
        }
      }
      if (url.startsWith(`${API_PREFIX}/protected/profiles/lookup`)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ userId: lookupUserId, email: 'collab@example.com' }),
          headers: { get: () => null },
        });
      }
      return Promise.resolve(mockSuccessResponse());
    });

    renderSurveyEdit();

    await screen.findByText('Collaborators:');
    expect(screen.getByText(/designer@example\.org/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit collaborators/i }));

    const input = screen.getByLabelText('Add collaborator email');
    fireEvent.change(input, { target: { value: 'collab@example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await screen.findByText('collab@example.com');
    fireEvent.click(screen.getByRole('button', { name: /edit collaborators/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_PREFIX}/protected/surveys/${SURVEY_ID}/collaborators`,
        expect.objectContaining({
          method: 'PUT',
        }),
      );
    });

    const saveCall = (global.fetch as jest.Mock).mock.calls.find(
      (call: any[]) =>
        call[0] === `${API_PREFIX}/protected/surveys/${SURVEY_ID}/collaborators` &&
        call[1]?.method === 'PUT',
    );
    const body = JSON.parse(saveCall[1].body as string);
    expect(body.collaboratorIds).toEqual(
      expect.arrayContaining(['designer-1', lookupUserId]),
    );
    expect(screen.getByRole('button', { name: /edit collaborators/i })).toBeInTheDocument();
  });

  it('continues processing tokens and surfaces which email failed lookup', async () => {
    const lookupUserId = 'user-2';
    (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
      if (url === `${API_PREFIX}/protected/surveys/${SURVEY_ID}`) {
        return Promise.resolve(mockSurveyResponse([]));
      }
      if (url === `${API_PREFIX}/protected/surveys/${SURVEY_ID}/collaborators`) {
        if (!options || options.method === undefined) {
          return Promise.resolve(
            mockCollaboratorsResponse([
              { userId: 'designer-1', email: 'designer@example.org', isSelf: true },
            ]),
          );
        }
        if (options.method === 'PUT') {
          return Promise.resolve(
            mockCollaboratorsResponse([
              { userId: 'designer-1', email: 'designer@example.org', isSelf: true },
              { userId: lookupUserId, email: 'found@example.com', isSelf: false },
            ]),
          );
        }
      }
      if (url.startsWith(`${API_PREFIX}/protected/profiles/lookup`)) {
        const emailParam = url.split('email=')[1];
        if (decodeURIComponent(emailParam) === 'missing@example.com') {
          return Promise.resolve({
            ok: false,
            json: async () => ({
              message: 'No account found for that email. Ask them to sign up, then try again.',
            }),
            headers: { get: () => null },
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ userId: lookupUserId, email: 'found@example.com' }),
          headers: { get: () => null },
        });
      }
      return Promise.resolve(mockSuccessResponse());
    });

    renderSurveyEdit();

    await screen.findByText('Collaborators:');

    fireEvent.click(screen.getByRole('button', { name: /edit collaborators/i }));

    const input = screen.getByLabelText('Add collaborator email');
    fireEvent.change(input, { target: { value: 'missing@example.com found@example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await screen.findByText('found@example.com');
    expect(screen.getByText(/missing@example.com/i)).toBeInTheDocument();
  });

  it('disables collaborator save while a save is in flight to prevent duplicate submissions', async () => {
    let resolvePut: ((value: any) => void) | null = null;
    const putResponse = {
      ok: true,
      json: async () => ({
        collaborators: [{ userId: 'designer-1', email: 'designer@example.org', isSelf: true }],
      }),
      headers: { get: () => null },
    };
    const putPromise = new Promise((res) => {
      resolvePut = () => res(putResponse);
    });

    (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
      if (url === `${API_PREFIX}/protected/surveys/${SURVEY_ID}`) {
        return Promise.resolve(mockSurveyResponse([]));
      }
      if (url === `${API_PREFIX}/protected/surveys/${SURVEY_ID}/collaborators`) {
        if (!options || options.method === undefined) {
          return Promise.resolve(
            mockCollaboratorsResponse([
              { userId: 'designer-1', email: 'designer@example.org', isSelf: true },
            ]),
          );
        }
        if (options.method === 'PUT') {
          return putPromise;
        }
      }
      return Promise.resolve(mockSuccessResponse());
    });

    renderSurveyEdit();

    await screen.findByText('Collaborators:');

    const toggleButton = screen.getByRole('button', { name: /edit collaborators/i });
    fireEvent.click(toggleButton);

    await waitFor(() => expect(toggleButton).toHaveTextContent(/save/i));

    fireEvent.click(toggleButton);

    await waitFor(() => expect(toggleButton).toBeDisabled());
    expect(
      (global.fetch as jest.Mock).mock.calls.filter(
        (call: any[]) =>
          call[0] === `${API_PREFIX}/protected/surveys/${SURVEY_ID}/collaborators` &&
          call[1]?.method === 'PUT',
      ).length,
    ).toBe(1);

    // Attempt a second click while saving should not trigger another request
    fireEvent.click(toggleButton);
    expect(
      (global.fetch as jest.Mock).mock.calls.filter(
        (call: any[]) =>
          call[0] === `${API_PREFIX}/protected/surveys/${SURVEY_ID}/collaborators` &&
          call[1]?.method === 'PUT',
      ).length,
    ).toBe(1);

    resolvePut?.();
    await waitFor(() =>
      expect(toggleButton).not.toBeDisabled(),
    );
  });
});
