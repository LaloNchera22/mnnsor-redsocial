import { ToastProvider } from '@/components/Toast';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Feed from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: false }),
}));

describe('Feed Page', () => {
  it('renders without crashing and displays global feed text', async () => {
    // Basic render test to ensure it loads
    render(<ToastProvider><Feed /></ToastProvider>);
    expect(screen.getByText(/Global Feed/i)).toBeDefined();
  });
});
