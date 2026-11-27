import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

function Thrower({ message }: { message: string }): never {
  throw new Error(message);
}

describe('ErrorBoundary', () => {
  afterEach(cleanup);

  it('renders its children normally when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeTruthy();
  });

  it('shows a message and a link back to the pools list instead of a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Thrower message="boom from a page" />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('boom from a page')).toBeTruthy();
    const link = screen.getByRole('link', { name: /all pools/i });
    expect(link.getAttribute('href')).toBe('#/');
    expect(screen.queryByText('All good')).toBeNull();
  });

  it('logs the error instead of swallowing it', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Thrower message="logged once" />
      </ErrorBoundary>,
    );

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.some((call) => call.some((arg) => arg instanceof Error && arg.message === 'logged once'))).toBe(
      true,
    );
  });

  it('recovers on a fresh mount under a new key, the way App remounts it per route', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(
      <ErrorBoundary key="pools">
        <Thrower message="first page broke" />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeTruthy();

    rerender(
      <ErrorBoundary key="method">
        <p>Method page renders fine</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Method page renders fine')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
