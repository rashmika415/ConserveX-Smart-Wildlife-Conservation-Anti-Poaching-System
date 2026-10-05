import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { apiGet } from '../services/api';
import { isValidLocation } from '../utils/location';

describe('Foundation', () => {
  it('shows database status, demo users and module navigation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => ({
          success: true,
          data: url.endsWith('/health')
            ? { database: 'not_configured' }
            : [{ userId: 'R001', name: 'Demo Ranger', role: 'RANGER' }],
        }),
      })),
    );
    render(<App />);
    expect(
      await screen.findByText('Database: not configured'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Demo Ranger (R001)' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Patrol Management' }));
    expect(
      screen.getByRole('heading', { name: 'Patrol Management' }),
    ).toBeInTheDocument();
  });
  it('shows a useful error when the API is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    );
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot reach the API',
    );
  });
  it('propagates API error responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, message: 'Route not found' }),
      }),
    );
    await expect(apiGet('/missing')).rejects.toThrow('Route not found');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false }),
      }),
    );
    await expect(apiGet('/failed')).rejects.toThrow('Request failed');
  });
  it('validates coordinate bounds, finite values and zero coordinates', () => {
    expect(isValidLocation(0, 0)).toBe(true);
    expect(isValidLocation(-90, 180)).toBe(true);
    for (const [lat, lon] of [
      [91, 0],
      [-91, 0],
      [0, 181],
      [0, -181],
      [NaN, 0],
      [0, Infinity],
    ])
      expect(isValidLocation(lat, lon)).toBe(false);
  });
});
