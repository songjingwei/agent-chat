// @vitest-environment jsdom

import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockLogout, mockUseAuth } = vi.hoisted(() => ({
  mockLogout: vi.fn<() => Promise<void>>(),
  mockUseAuth: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    activeOptions: _activeOptions,
    activeProps: _activeProps,
    ...props
  }: {
    to: string
    children?: ReactNode
    activeOptions?: unknown
    activeProps?: unknown
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'zh',
      changeLanguage: vi.fn(),
    },
  }),
}))

vi.mock('#/lib/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('./LanguageSwitcher', () => ({
  LanguageSwitcher: () => <span>language-switcher</span>,
}))

vi.mock('./ThemeToggle', () => ({
  default: () => <span>theme-toggle</span>,
}))

vi.mock('./Logo', () => ({
  default: () => <span>logo</span>,
}))

import Header from './Header'

describe('Header logout confirmation', () => {
  beforeEach(() => {
    mockLogout.mockReset()
    mockLogout.mockResolvedValue(undefined)
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({
      user: { displayName: 'Song' },
      isAuthenticated: true,
      logout: mockLogout,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('opens a confirmation dialog before logging out', async () => {
    render(<Header />)

    fireEvent.click(screen.getByRole('button', { name: 'auth.user.logout' }))

    expect(mockLogout).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: 'auth.logoutConfirm.confirm' }),
    )

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('closes the confirmation dialog without logging out when canceled', () => {
    render(<Header />)

    fireEvent.click(screen.getByRole('button', { name: 'auth.user.logout' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'auth.logoutConfirm.cancel' }),
    )

    expect(mockLogout).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
