import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Home from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('Home Page', () => {
  it('renders the platform name and login form', () => {
    render(<Home />);
    expect(screen.getByText(/Platform./i)).toBeDefined();
    expect(screen.getByPlaceholderText(/EMAIL ADDRESS/i)).toBeDefined();
  });
});
