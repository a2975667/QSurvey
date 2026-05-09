import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

import authSlice, { loginSuccess } from '../../../features/authSlice';
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

describe('DesignerPage projects search/sort', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('shows controls during loading, then filters/sorts by created/updated', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: 'token-1', user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

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
    fireEvent.click(screen.getByRole('button', { name: /Recently updated/i }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Newest first' }));
    expect(getTitlesInOrder()).toEqual(['Bravo', 'Alpha Project', 'Charlie']);

    // Sort by updated time (old first)
    fireEvent.click(screen.getByRole('button', { name: /Newest first/i }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Least recently updated' }));
    expect(getTitlesInOrder()).toEqual(['Charlie', 'Bravo', 'Alpha Project']);
  });

  it('restores focus to the sort trigger when closing the sort menu on Escape', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: 'token-1', user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

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
    store.dispatch(loginSuccess({ token: 'token-1', user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

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

  it('logs out and redirects when protected projects request returns 401', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: 'expired-or-revoked-token', user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

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
    store.dispatch(loginSuccess({ token: 'token-1', user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

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
    store.dispatch(loginSuccess({ token: 'token-1', user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

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
    store.dispatch(loginSuccess({ token: 'token-1', user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

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
    store.dispatch(loginSuccess({ token: 'token-1', user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

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
    store.dispatch(loginSuccess({ token: 'token-1', user: { id: 'u1', email: 'u@x.com', roles: ['Designer'] } }));

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
