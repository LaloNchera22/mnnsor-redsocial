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

test('handles flagging correctly', () => {
  const onFlagMock = vi.fn();
  render(<Post post={mockPost} onFlag={onFlagMock} />);

  const flagButton = screen.getByText('FLAG AS FAKE NEWS');
  fireEvent.click(flagButton);

  expect(onFlagMock).toHaveBeenCalledWith('p1');
});
