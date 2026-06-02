# Taut

Jogo diário de **golfe lógico**: ligue os números em ordem crescente arrastando
o dedo numa grade quadrada (começa **6×6**), contornando paredes, com o caminho
mais elegante possível — minimizando o score. Um puzzle por dia, determinístico
pela data.

## Arquitetura (regra de ouro)

- `src/engine/` é **TypeScript puro, sem DOM/React** — o coração e a vitrine.
- **Direção das dependências:** `components/` e `hooks/` importam de `engine/`;
  o `engine/` **nunca** importa nada de UI.
- `src/lib/` = camada do app (seed, storage, pontos do dia, share, desafio).

## Invariantes de jogo (o caminho)

- Conecta os waypoints na **ordem crescente** (1 → 2 → … → N).
- Passos **ortogonais** (Manhattan), célula a célula.
- **Auto-evitante:** nunca cruza nem repete uma célula.
- Não atravessa **parede** (célula bloqueada).
- **Não precisa preencher** a grade (caminho livre).

## Pontuação

- **Geometria** (no engine, *time-agnostic*): `total = comprimento + k·curvas`,
  **k = 2**. `comprimento` = nº de passos; `curvas` = mudanças de direção.
- **Par** = mínimo da geometria, calculado pelo **solver** (busca exata). É o
  ótimo: dá pra empatar, não pra bater.
- **Pontos do dia** (FORA do engine, em `lib/`): `geometria.total + penalidade de
  tempo` (peso pequeno, com teto; ex.: +1 a cada 30 s, máx. +5).
  **O tempo nunca afeta o par.**

## Gerador

- `generateDaily(date)` determinístico (seed derivada da data); usa o solver como
  **oráculo**.
- **Garantia:** aceita o tabuleiro só se `custo_guloso − par.total ≥ limiar` —
  sempre existe margem de melhora. Rejeita tabuleiros insolúveis ou triviais.

## Convenções

- TypeScript **strict**. Testes em **Vitest** (`engine/` roda em env `node`).
- Seed **determinístico pela data** — mesma data, mesmo puzzle.
- Rode `npm run test:run` após cada mudança no `engine/`.

## Produto

- **Streak por presença diária:** quebra só se pular um dia. **Sem estado de
  falha** — o caminho sempre dá pra concluir; chegar no par é **bônus/selo**, não
  exigência.
- Só o **puzzle de hoje** (sem arquivo/treino); ao terminar, contador pro próximo.
- Visual **limpo e colorido/lúdico** (não cinza minimalista); respeita o tema
  claro/escuro do sistema.
- Sem backend/login: histórico em `localStorage`; share estilo Wordle (sem
  revelar o traçado) + link de desafio (só os pontos-alvo na URL).

## Não construir ainda

Figura revelada (v1 = golfe puro), contas de usuário, multiplayer/backend.
