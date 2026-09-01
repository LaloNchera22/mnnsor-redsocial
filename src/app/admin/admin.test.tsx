import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminDashboard from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('Admin Dashboard', () => {
  it('renders loading state initially', async () => {
    render(<AdminDashboard />);
    expect(screen.getByText(/Loading Admin Dashboard/i)).toBeDefined();
  });
});
