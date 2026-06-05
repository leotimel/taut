// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Tutorial } from './Tutorial'

afterEach(cleanup)

describe('Tutorial', () => {
  it('não renderiza nada quando fechado', () => {
    const { container } = render(<Tutorial open={false} onClose={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('aberto: mostra a 1ª instrução e o tabuleiro de treino', () => {
    render(<Tutorial open onClose={() => {}} />)
    expect(screen.getByText(/Arraste/)).toBeInTheDocument()
    expect(screen.getByRole('application')).toBeInTheDocument()
    expect(screen.getByText('Pular')).toBeInTheDocument()
  })
})
