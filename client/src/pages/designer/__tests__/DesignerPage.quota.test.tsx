import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import authSlice, { loginSuccess } from '../../../features/authSlice';
import { makeAuthToken } from '../../../testUtils/authToken';
import DesignerPage from '../DesignerPage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true });
jest.mock('../../../layout/AppShell', () => (props: any) => {
  const React = require('react');
  return React.createElement('div', null, props.children);
});

const renderProjects = async (roles: string[], total: number) => {
  const store = configureStore({ reducer: { auth: authSlice.reducer } });
  store.dispatch(loginSuccess({ token: makeAuthToken({
    user_id: 'u1', user_email: 'user@example.test', user_roles: roles,
  }) }));
  const projects = Array.from({ length: total }, (_, index) => ({
    _id: index.toString().padStart(24, '0'), title: `Project ${index}`, description: 'Description',
  }));
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true, headers: { get: () => null }, json: async () => projects,
  });
  render(<Provider store={store}><DesignerPage /></Provider>);
  await waitFor(() => expect(screen.queryByText(/Loading your surveys/i)).not.toBeInTheDocument());
  return store;
};

describe('designer survey quota', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
    global.fetch = jest.fn();
  });

  it('allows the fiftieth project for an ordinary designer', async () => {
    await renderProjects(['designer'], 49);
    fireEvent.click(screen.getByRole('button', { name: '+ Create Project' }));
    expect(screen.getByLabelText('Title:')).toBeInTheDocument();
  });

  it.each([50, 51])('keeps ordinary accounts blocked with %i projects, including project cloning', async (total) => {
    await renderProjects(['designer'], total);
    expect(screen.getByRole('button', { name: 'Limit Reached' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Project actions for Project 0' }));
    const clone = screen.getByRole('menuitem', { name: 'Clone survey' });
    expect(clone).toBeDisabled();
    fireEvent.click(clone);
    // Templates live in the empty-project state, so cannot bypass a full list.
    expect(screen.queryByRole('list', { name: 'Survey templates' })).not.toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Title:')).not.toBeInTheDocument();
  });

  it.each([50, 75])('lets an existing admin create and clone above the limit (%i projects)', async (total) => {
    await renderProjects(['admin'], total);
    fireEvent.click(screen.getByRole('button', { name: '+ Create Project' }));
    expect(screen.getByLabelText('Title:')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Project actions for Project 0' }));
    expect(screen.getByRole('menuitem', { name: 'Clone survey' })).toBeEnabled();
    expect(screen.queryByRole('list', { name: 'Survey templates' })).not.toBeInTheDocument();
  });

  it('submits a new project above fifty for an existing admin', async () => {
    await renderProjects(['designer', 'admin'], 50);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: async () => ({ _id: 'new-project' }) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: async () => [] });
    fireEvent.click(screen.getByRole('button', { name: '+ Create Project' }));
    fireEvent.change(screen.getByLabelText('Title:'), { target: { value: 'Admin project' } });
    fireEvent.change(screen.getByLabelText('Description:'), { target: { value: 'Description' } });
    fireEvent.submit(screen.getByLabelText('Title:').closest('form')!);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/survey/new-project/edit'));
    expect(global.fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('/protected/surveys'), expect.objectContaining({ method: 'POST' }));
  });

  it('shows a server quota conflict without logging out when another request filled the quota', async () => {
    const store = await renderProjects(['designer'], 49);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false, status: 409, headers: { get: () => null },
      json: async () => ({ message: 'Max surveys reached (50)' }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Project actions for Project 0' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clone survey' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Max surveys reached (50)');
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not treat uppercase Admin as the existing admin role', async () => {
    await renderProjects(['Admin'], 50);
    expect(screen.getByRole('button', { name: 'Limit Reached' })).toBeDisabled();
  });
});
