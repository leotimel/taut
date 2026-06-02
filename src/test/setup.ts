// Matchers do jest-dom (toBeInTheDocument, etc.) para os testes de UI.
// O entrypoint /vitest registra os matchers no expect do Vitest sem exigir globals.
import '@testing-library/jest-dom/vitest'
