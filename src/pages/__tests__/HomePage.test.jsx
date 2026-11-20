import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import HomePage from '../HomePage'

const renderHome = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )

describe('HomePage', () => {
  it('offers "Start a return" linking to the wizard', () => {
    renderHome()
    expect(screen.getByRole('link', { name: /start a return/i })).toHaveAttribute('href', '/return/new')
  })

  it('offers "Staff sign in" linking to the login page, with a hint for who it is for', () => {
    renderHome()
    const link = screen.getByRole('link', { name: /staff sign in/i })
    expect(link).toHaveAttribute('href', '/login')
    expect(link).toHaveAccessibleDescription(/warehouse, finance and operations/i)
  })

  it('keeps the decorative timeline preview out of the accessibility tree', () => {
    renderHome()
    expect(screen.getByText('RET-1042').closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: /return an item/i })).toBeInTheDocument()
  })
})
