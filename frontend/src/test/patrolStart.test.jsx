import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ActivePatrol from '../modules/patrols/ActivePatrol';
import { api } from '../services/api';
const { reload } = vi.hoisted(() => ({ reload: vi.fn() }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'ranger-1', role: 'RANGER' } }),
}));
vi.mock('react-router-dom', async (original) => ({
  ...(await original()),
  useParams: () => ({ id: 'assigned-1' }),
}));
vi.mock('../hooks/useOfflinePatrol', () => ({
  useOfflinePatrol: () => ({
    data: {
      routeName: 'East gate',
      parkName: 'Yala',
      status: 'Assigned',
      rangerId: { name: 'Ranger' },
      checkpoints: [],
      waypoints: [],
    },
    points: [],
    reload,
  }),
}));
vi.mock('../services/api', async (original) => ({
  ...(await original()),
  api: { patch: vi.fn() },
}));
beforeEach(() => vi.clearAllMocks());
it('shows the server conflict explanation and a link to finish the active patrol', async () => {
  api.patch.mockRejectedValue({
    message: 'Request failed with status code 409',
    response: {
      status: 409,
      data: {
        message:
          'Finish your active patrol before starting this assigned patrol.',
        data: { activePatrolId: 'active-1' },
      },
    },
  });
  render(
    <MemoryRouter>
      <ActivePatrol />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Start Patrol' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Finish your active patrol',
  );
  expect(
    screen.getByRole('link', { name: 'Open active patrol to finish it' }),
  ).toHaveAttribute('href', '/app/patrols/active-1');
});
it('starts an assigned patrol and refreshes its status', async () => {
  api.patch.mockResolvedValue({ data: { message: 'Patrol started' } });
  render(
    <MemoryRouter>
      <ActivePatrol />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Start Patrol' }));
  expect(await screen.findByText('Patrol started')).toBeInTheDocument();
  expect(api.patch).toHaveBeenCalledWith(
    '/patrols/assigned-1/start',
    undefined,
  );
  expect(reload).toHaveBeenCalledOnce();
});
