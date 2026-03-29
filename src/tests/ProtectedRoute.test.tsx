import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import { ProtectedRoute } from '@/components/ProtectedRoute';

function renderWithRouter(ui: React.ReactElement, initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('shows loader when auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: true });

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated with correct role', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1' },
      profile: { role: 'admin' },
      loading: false,
    });

    renderWithRouter(
      <ProtectedRoute allowedRole="admin">
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false });

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects when user has wrong role', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1' },
      profile: { role: 'founder' },
      loading: false,
    });

    renderWithRouter(
      <ProtectedRoute allowedRole="admin">
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
