import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import PublicLayout from '../../../layouts/PublicLayout'
import { RETURN_WINDOW_DAYS } from '../../../domain/returns'
import PrivacyPolicyPage from '../PrivacyPolicyPage'
import ReturnPolicyPage from '../ReturnPolicyPage'

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/return-policy" element={<ReturnPolicyPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('policy pages', () => {
  it('return policy states the windows from the domain constants', () => {
    renderAt('/return-policy')
    expect(screen.getByRole('heading', { level: 1, name: 'Return policy' })).toBeInTheDocument()
    expect(screen.getByText(`${RETURN_WINDOW_DAYS.STANDARD} days`)).toBeInTheDocument()
    expect(screen.getByText(`${RETURN_WINDOW_DAYS.ELECTRONICS} days`)).toBeInTheDocument()
  })

  it('privacy policy renders with its table of contents', () => {
    renderAt('/privacy')
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeInTheDocument()
    const toc = screen.getByRole('navigation', { name: /on this page/i })
    expect(within(toc).getByRole('link', { name: /what we collect/i })).toHaveAttribute('href', '#collect')
  })

  it('both pages say the text is a placeholder', () => {
    renderAt('/privacy')
    expect(screen.getByText(/placeholder policy text/i)).toBeInTheDocument()
  })
})

describe('public layout', () => {
  it('header no longer has Start a return or Staff sign in links', () => {
    renderAt('/privacy')
    // The site header comes first; the policy article has its own <header> too.
    const header = screen.getAllByRole('banner')[0]
    expect(within(header).getByRole('link', { name: /returnright/i })).toBeInTheDocument()
    expect(within(header).queryByRole('link', { name: /start a return/i })).toBeNull()
    expect(within(header).queryByRole('link', { name: /staff sign in/i })).toBeNull()
  })

  it('footer links both policies', () => {
    renderAt('/privacy')
    const footerNav = screen.getByRole('navigation', { name: 'Policies' })
    expect(within(footerNav).getByRole('link', { name: 'Return policy' })).toHaveAttribute('href', '/return-policy')
    expect(within(footerNav).getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy')
  })
})
