import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

import authSlice, { loginSuccess } from '../../../features/authSlice';
import { makeAuthToken } from '../../../testUtils/authToken';
import DesignerPage from '../DesignerPage';

const mockNavigate = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
  }),
  { virtual: true },
);

jest.mock('../../../layout/AppShell', () => (props: any) => {
  const React = require('react');
  return React.createElement('div', null, props.children);
});

const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authSlice.reducer,
    },
  });

const AUTH_TOKEN = makeAuthToken({
  user_id: 'u1',
  user_email: 'u@x.com',
  user_roles: ['Designer'],
});

describe('DesignerPage projects search/sort', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
    (global as any).fetch = jest.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: jest.fn().mockReturnValue(true),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('shows controls during loading, then filters/sorts by created/updated', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: AUTH_TOKEN, user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

    let resolveFetch: ((value: any) => void) | undefined;
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(
      <Provider store={store}>
        <DesignerPage />
      </Provider>,
    );

    expect(screen.getByLabelText('Search projects')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Create Project/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Recently updated/i })).toBeDisabled();
    expect(screen.getByText(/Loading your surveys/i)).toBeInTheDocument();

    resolveFetch?.({
      ok: true,
      headers: { get: () => null },
      json: async () => [
        {
          _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
          title: 'Alpha Project',
          description: 'Cool stuff',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-03T00:00:00.000Z',
        },
        {
          _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
          title: 'Bravo',
          description: 'Something else',
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T12:00:00.000Z',
        },
        {
          _id: '000000000000000000000000',
          title: 'Charlie',
          description: 'Alpha adjacent',
        },
      ],
    });

    await waitFor(() => expect(screen.getByText('Alpha Project')).toBeInTheDocument());

    const getTitlesInOrder = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

    // Default: Updated (new first)
    expect(getTitlesInOrder()).toEqual(['Alpha Project', 'Bravo', 'Charlie']);

    // Search in description
    fireEvent.change(screen.getByLabelText('Search projects'), { target: { value: 'cool' } });
    expect(getTitlesInOrder()).toEqual(['Alpha Project']);

    // Clear search; sort by created time (new first)
    fireEvent.change(screen.getByLabelText('Search projects'), { target: { value: '' } });
    const updatedSortTrigger = screen.getByRole('button', { name: /Recently updated/i });
    fireEvent.click(updatedSortTrigger);
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Newest first' }));
    expect(getTitlesInOrder()).toEqual(['Bravo', 'Alpha Project', 'Charlie']);
    const newestSortTrigger = screen.getByRole('button', { name: /Newest first/i });
    await waitFor(() => expect(newestSortTrigger).toHaveFocus());

    // Sort by updated time (old first)
    fireEvent.click(newestSortTrigger);
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Least recently updated' }));
    expect(getTitlesInOrder()).toEqual(['Charlie', 'Bravo', 'Alpha Project']);
  });

  it('defaults participant results off when creating a survey', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: AUTH_TOKEN, user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: { get: () => null },
        json: async () => ({ _id: 'new-survey-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => [],
      });

    render(
      <Provider store={store}>
        <DesignerPage />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByText(/You don't have any QS projects yet/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Create Your First Project/i }));

    const resultsToggle = screen.getByLabelText(
      /Show selected question results after submission\?/i,
    ) as HTMLInputElement;
    expect(resultsToggle.checked).toBe(false);
    expect(
      screen.getByText(/Participants only see results for questions individually enabled/i),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Title:'), { target: { value: 'New Survey' } });
    fireEvent.change(screen.getByLabelText('Description:'), { target: { value: 'Description' } });
    fireEvent.click(screen.getByRole('button', { name: /Create QS Project/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/survey/new-survey-1/edit'));

    const createCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(createCall[0]).toContain('/protected/surveys');
    const body = JSON.parse(createCall[1].body as string);
    expect(body.settings.respondentsCanViewResults).toBe(false);
  });

  it('creates a survey from a readable template in the empty state', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: AUTH_TOKEN, user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: { get: () => null },
        json: async () => ({ _id: 'cloned-template-survey' }),
      });

    render(
      <Provider store={store}>
        <DesignerPage />
      </Provider>,
    );

    await screen.findByText(/Start from a template/i);

    expect(
      screen.getByRole('button', {
        name: /Prioritize a roadmap Feature backlog and product feedback Use template/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Choose a meeting place Conference location preferences Use template/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Allocate a shared budget Community budget tradeoffs Use template/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Hard-coded survey IDs for testing/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Allocate a shared budget/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(
        '/survey/cloned-template-survey/edit',
      ),
    );

    const templateCloneCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(templateCloneCall[0]).toContain(
      '/protected/survey-templates/69764360249947669eb93cf8/clone',
    );
    expect(templateCloneCall[1].method).toBe('POST');
  });

  it('restores focus to the sort trigger when closing the sort menu on Escape', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: AUTH_TOKEN, user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => [
        {
          _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
          title: 'Alpha Project',
          description: 'Cool stuff',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-03T00:00:00.000Z',
        },
      ],
    });

    render(
      <Provider store={store}>
        <DesignerPage />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByText('Alpha Project')).toBeInTheDocument());

    const sortTrigger = screen.getByRole('button', { name: /Recently updated/i });
    fireEvent.click(sortTrigger);
    screen.getByRole('menuitemradio', { name: 'Newest first' }).focus();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('menuitemradio', { name: 'Newest first' })).not.toBeInTheDocument();
      expect(sortTrigger).toHaveFocus();
    });
  });

  it('keeps sort and project action menus mutually exclusive', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: AUTH_TOKEN, user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => [
        {
          _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
          title: 'Alpha Project',
          description: 'Cool stuff',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-03T00:00:00.000Z',
        },
      ],
    });

    render(
      <Provider store={store}>
        <DesignerPage />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByText('Alpha Project')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Recently updated/i }));
    expect(screen.getByRole('menuitemradio', { name: 'Newest first' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Project actions for Alpha Project' }));
    expect(screen.queryByRole('menuitemradio', { name: 'Newest first' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Clone survey' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Recently updated/i }));
    expect(screen.getByRole('menuitemradio', { name: 'Newest first' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Clone survey' })).not.toBeInTheDocument();
  });

  it('shows copy link and Edit Survey as visible card actions and moves Preview Survey into the actions menu', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: AUTH_TOKEN, user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

    const surveyId = 'aaaaaaaaaaaaaaaaaaaaaaaa';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => [
        {
          _id: surveyId,
          title: 'Alpha Project',
          description: 'Cool stuff',
        },
      ],
    });

    render(
      <Provider store={store}>
        <DesignerPage />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByText('Alpha Project')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: 'Copy survey link for Alpha Project' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Survey' })).toBeInTheDocument();
    expect(screen.queryByText(`ID: ${surveyId}`)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Survey' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Survey' }));
    expect(mockNavigate).toHaveBeenCalledWith(`/survey/${surveyId}/edit`);

    fireEvent.click(screen.getByRole('button', { name: 'Project actions for Alpha Project' }));
    expect(screen.queryByRole('menuitem', { name: 'Edit Survey' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Results' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/designer/results/${surveyId}`);
      expect(screen.queryByRole('menuitem', { name: 'Results' })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Project actions for Alpha Project' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Preview Survey' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/survey/${surveyId}`);
      expect(screen.queryByRole('menuitem', { name: 'Preview Survey' })).not.toBeInTheDocument();
    });
  });

  it('pins a project from the actions menu and keeps pinned projects first', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: AUTH_TOKEN, user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => [
          {
            _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
            title: 'Alpha Project',
            description: 'Cool stuff',
            isPinned: false,
            updatedAt: '2024-01-03T00:00:00.000Z',
          },
          {
            _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
            title: 'Bravo Project',
            description: 'Something else',
            isPinned: false,
            updatedAt: '2024-01-02T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({ _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', isPinned: true }),
      });

    render(
      <Provider store={store}>
        <DesignerPage />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByText('Alpha Project')).toBeInTheDocument());
    const getTitlesInOrder = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(getTitlesInOrder()).toEqual(['Alpha Project', 'Bravo Project']);

    fireEvent.click(screen.getByRole('button', { name: 'Project actions for Bravo Project' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Pin project' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/v1/protected/surveys/bbbbbbbbbbbbbbbbbbbbbbbb'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ isPinned: true }),
        }),
      );
    });
    expect(getTitlesInOrder()).toEqual(['Bravo Project', 'Alpha Project']);
    expect(screen.getByText('Pinned')).toBeInTheDocument();
  });

  it('copies the survey participant link from an icon-only card action', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: AUTH_TOKEN, user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

    const surveyId = 'aaaaaaaaaaaaaaaaaaaaaaaa';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => [
        {
          _id: surveyId,
          title: 'Alpha Project',
          description: 'Cool stuff',
        },
      ],
    });

    render(
      <Provider store={store}>
        <DesignerPage />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByText('Alpha Project')).toBeInTheDocument());

    const copyLinkAction = screen.getByRole('button', { name: 'Copy survey link for Alpha Project' });
    expect(copyLinkAction).toHaveAttribute('title', 'Copy survey link');
    expect(copyLinkAction).not.toHaveTextContent('Copy survey link');

    fireEvent.click(copyLinkAction);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/survey/${surveyId}`);
      expect(screen.getByRole('status')).toHaveTextContent('Survey link copied.');
    });
  });

  it('shows copy-link error when fallback clipboard copy fails', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    (document.execCommand as jest.Mock).mockReturnValue(false);

    const store = createTestStore();
    store.dispatch(loginSuccess({ token: AUTH_TOKEN, user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

    const surveyId = 'aaaaaaaaaaaaaaaaaaaaaaaa';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => [
        {
          _id: surveyId,
          title: 'Alpha Project',
          description: 'Cool stuff',
        },
      ],
    });

    render(
      <Provider store={store}>
        <DesignerPage />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByText('Alpha Project')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Copy survey link for Alpha Project' }));

    await waitFor(() => {
      expect(document.execCommand).toHaveBeenCalledWith('copy');
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to copy survey link. Please try again.',
      );
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it('keeps clone errors isolated when copying a survey link succeeds', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: AUTH_TOKEN, user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

    const surveyId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    const cloneFailure = 'Clone failed because one question is invalid.';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => [
          {
            _id: surveyId,
            title: 'Alpha Project',
            description: 'Cool stuff',
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: { get: () => null },
        json: async () => ({ message: cloneFailure }),
      });

    render(
      <Provider store={store}>
        <DesignerPage />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByText('Alpha Project')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Project actions for Alpha Project' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clone survey' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(cloneFailure);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy survey link for Alpha Project' }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/survey/${surveyId}`);
      expect(screen.getByRole('status')).toHaveTextContent('Survey link copied.');
      expect(screen.getByRole('alert')).toHaveTextContent(cloneFailure);
    });

    consoleErrorSpy.mockRestore();
  });

  it('logs out and redirects when protected projects request returns 401', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: AUTH_TOKEN, user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => null },
      json: async () => ({}),
    });

    render(
      <Provider store={store}>
        <DesignerPage />
      </Provider>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
      expect(store.getState().auth.isAuthenticated).toBe(false);
      expect(store.getState().auth.token).toBeNull();
    });
  });

  it('clones a survey and navigates to the cloned survey editor', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: AUTH_TOKEN, user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

    const sourceSurveyId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    const clonedSurveyId = 'cccccccccccccccccccccccc';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => [
          {
            _id: sourceSurveyId,
            title: 'Alpha Project',
            description: 'Cool stuff',
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: { get: () => null },
        json: async () => ({ _id: clonedSurveyId }),
      });

    render(
      <Provider store={store}>
        <DesignerPage />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByText('Alpha Project')).toBeInTheDocument());

    const actionsTrigger = screen.getByRole('button', { name: 'Project actions for Alpha Project' });
    fireEvent.click(actionsTrigger);
    expect(actionsTrigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.getByRole('menu', { name: 'Project actions for Alpha Project' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clone survey' }));

    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain(
        `/protected/surveys/${sourceSurveyId}/clone`,
      );
      expect((global.fetch as jest.Mock).mock.calls[1][1].method).toBe('POST');
      expect(mockNavigate).toHaveBeenCalledWith(`/survey/${clonedSurveyId}/edit`);
    });
  });

  it('disables all clone actions while a clone request is in flight', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: AUTH_TOKEN, user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

    const sourceSurveyA = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    const sourceSurveyB = 'bbbbbbbbbbbbbbbbbbbbbbbb';
    const clonedSurveyId = 'dddddddddddddddddddddddd';

    let resolveClone: ((value: any) => void) | undefined;
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => [
          { _id: sourceSurveyA, title: 'Alpha Project', description: 'Cool stuff' },
          { _id: sourceSurveyB, title: 'Bravo Project', description: 'More stuff' },
        ],
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveClone = resolve;
          }),
      );

    render(
      <Provider store={store}>
        <DesignerPage />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByText('Alpha Project')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Project actions for Alpha Project' }));
    const cloneButton = screen.getByRole('menuitem', { name: 'Clone survey' });

    fireEvent.click(cloneButton);

    fireEvent.click(screen.getByRole('button', { name: 'Project actions for Bravo Project' }));
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Clone survey' })).toBeDisabled());

    fireEvent.click(screen.getByRole('menuitem', { name: 'Clone survey' }));
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(2);

    resolveClone?.({
      ok: true,
      status: 201,
      headers: { get: () => null },
      json: async () => ({ _id: clonedSurveyId }),
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/survey/${clonedSurveyId}/edit`);
    });
  });

  it('sends only one clone request on rapid double-click', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: AUTH_TOKEN, user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

    const sourceSurveyId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    const clonedSurveyId = 'eeeeeeeeeeeeeeeeeeeeeeee';

    let resolveClone: ((value: any) => void) | undefined;
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => [
          { _id: sourceSurveyId, title: 'Alpha Project', description: 'Cool stuff' },
        ],
      })
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveClone = resolve;
          }),
      );

    render(
      <Provider store={store}>
        <DesignerPage />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByText('Alpha Project')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Project actions for Alpha Project' }));
    const cloneButton = screen.getByRole('menuitem', { name: 'Clone survey' });
    fireEvent.click(cloneButton);
    fireEvent.click(cloneButton);

    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls).toHaveLength(2);
      expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain(
        `/protected/surveys/${sourceSurveyId}/clone`,
      );
    });

    resolveClone?.({
      ok: true,
      status: 201,
      headers: { get: () => null },
      json: async () => ({ _id: clonedSurveyId }),
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/survey/${clonedSurveyId}/edit`);
    });
  });

  it('shows clone failure message when clone request fails', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: AUTH_TOKEN, user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

    const sourceSurveyId = 'aaaaaaaaaaaaaaaaaaaaaaaa';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => [
          {
            _id: sourceSurveyId,
            title: 'Alpha Project',
            description: 'Cool stuff',
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: { get: () => null },
        json: async () => ({ message: 'This survey cannot be cloned because one question has unknown type metadata.' }),
      });

    render(
      <Provider store={store}>
        <DesignerPage />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByText('Alpha Project')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Project actions for Alpha Project' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clone survey' }));

    await waitFor(() => {
      expect(
        screen.getByText('This survey cannot be cloned because one question has unknown type metadata.'),
      ).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('/edit'));
      expect(screen.getByRole('button', { name: 'Project actions for Alpha Project' })).toHaveFocus();
    });
  });

  it('closes the project actions menu on Escape', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: AUTH_TOKEN, user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => [
        {
          _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
          title: 'Alpha Project',
          description: 'Cool stuff',
        },
      ],
    });

    render(
      <Provider store={store}>
        <DesignerPage />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByText('Alpha Project')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Project actions for Alpha Project' }));
    const trigger = screen.getByRole('button', { name: 'Project actions for Alpha Project' });
    expect(screen.getByRole('menuitem', { name: 'Clone survey' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: 'Clone survey' })).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });
});
