import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import Post from '../components/Post';
import { Post as PostType } from '../lib/mockData';

const mockPost: PostType = {
  id: 'p1',
  authorId: 'TESTID',
  title: 'TEST TITLE',
  content: 'TEST CONTENT',
  type: 'document',
  tag: 'TEST',
  flags: 0,
  createdAt: new Date().toISOString()
};

test('renders post with title and content', () => {
  render(<Post post={mockPost} onFlag={() => {}} />);
  expect(screen.getByText('TEST TITLE')).toBeDefined();
  expect(screen.getByText('TEST CONTENT')).toBeDefined();
});


test('handles flagging correctly', async () => {
  const onFlagMock = vi.fn();
  render(<Post post={mockPost} onFlag={onFlagMock} />);

  // Note: the button could be selected by role
  const flagButtons = screen.getAllByRole('button', { name: /Flag as fake news/i });

  fireEvent.click(flagButtons[flagButtons.length - 1]);

  expect(onFlagMock).toHaveBeenCalledWith('p1');
});
