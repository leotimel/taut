// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Onboarding } from './Onboarding'

afterEach(cleanup)

describe('Onboarding', () => {
  it('mostra a regra e o botão quando aberto', () => {
    render(<Onboarding open onClose={() => {}} />)
    expect(screen.getByText(/Ligue os números em ordem/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entendi' })).toBeInTheDocument()
  })

  it('não renderiza nada quando fechado', () => {
    const { container } = render(<Onboarding open={false} onClose={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('"Entendi" chama onClose', () => {
    const onClose = vi.fn()
    render(<Onboarding open onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
