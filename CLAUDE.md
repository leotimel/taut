# Taut

Jogo diário de **golfe lógico**: ligue os números em ordem crescente arrastando
o dedo numa grade quadrada (**6×6**), contornando paredes, com o caminho
mais elegante possível — minimizando o score. Um puzzle por dia, determinístico
pela data.

## Arquitetura (regra de ouro)

- `src/engine/` é **TypeScript puro, sem DOM/React** — o coração e a vitrine.
- **Direção das dependências:** `components/` e `hooks/` importam de `engine/`;
  o `engine/` **nunca** importa nada de UI.
- `src/lib/` = camada do app (seed, storage, points, share, challenge, **level**,
  **palettes**). `hooks/useTaut` orquestra o estado; `components/` tem o
  `BoardSVG` (grade/paredes/números compartilhados entre canvas e modal).

## Invariantes de jogo (o caminho)

- Conecta os waypoints na **ordem crescente** (1 → 2 → … → N).
- Passos **ortogonais** (Manhattan), célula a célula.
- **Auto-evitante:** nunca cruza nem repete uma célula.
- Não cruza **parede** (barreira na aresta entre duas células; as células seguem
  pisáveis).
- **Não precisa preencher** a grade (caminho livre).

## Pontuação

- **Geometria** (no engine, *time-agnostic*): `total = comprimento + k·curvas`,
  **k = 2**. `comprimento` = nº de passos; `curvas` = mudanças de direção.
- **Par** = mínimo da geometria, calculado pelo **solver** (busca exata). É o
  ótimo: dá pra empatar, não pra bater. (No app é rotulado **"Ideal"** e fica
  **oculto até a conclusão** — revelado no fim, como recompensa.)
- **Pontos do dia** (FORA do engine, em `lib/`): `geometria.total + penalidade de
  tempo + penalidade de tentativas` (ambas pequenas e com teto; ex.: tempo +1 a
  cada 30 s máx. +5; tentativas +1 por refazer além do 1º, máx. +3).
  **Tempo e tentativas nunca afetam o par/ideal.**

## Gerador

- `generateDaily(date)` determinístico (seed derivada da data); usa o solver como
  **oráculo**.
- **Garantia:** aceita o tabuleiro só se `custo_guloso − par.total ≥ limiar` —
  sempre existe margem de melhora. Rejeita tabuleiros insolúveis ou triviais.
- **Rampa de dificuldade** (`rampForDay`): a densidade de paredes cresce com o
  tempo (grade fixa em **6×6** — o solver exato não escala pro 7×7 na meta de
  tempo). `DEFAULT_CONFIG` é a superfície de tuning documentada.

## Convenções

- TypeScript **strict**. Testes em **Vitest** (`engine/` roda em env `node`).
- Seed **determinístico pela data** — mesma data, mesmo puzzle.
- Rode `npm run test:run` após cada mudança no `engine/`.

## Produto

- **Streak por presença diária:** quebra só se pular um dia. **Sem estado de
  falha** — o caminho sempre dá pra concluir; chegar no par é **bônus/selo**, não
  exigência. **Escudos** (1 a cada 10 dias, máx. 2) toleram dias pulados; marcos
  comemorados em 7/30/100.
- Só o **puzzle de hoje** (sem arquivo/treino); ao terminar, contador pro próximo.
- Visual **limpo e colorido/lúdico** (não cinza minimalista); respeita o tema
  claro/escuro do sistema.
- Sem backend/login: histórico em `localStorage`; share estilo Wordle (sem
  revelar o traçado) + link de desafio (só os pontos-alvo na URL).

## Progressão & plataforma

- **Nível & XP** (`lib/level.ts`): XP por performance (pontos do dia vs. ideal),
  derivado do histórico. Codinomes Cosmos nos landmarks (1 Ponto · 5 Segmento ·
  10 Polígono · 25 Espiral · 50 Fractal · 100 Infinito).
- **Paletas desbloqueáveis** por nível (`lib/palettes.ts` + `data-palette` no CSS).
- **Acessível:** joga com toque, mouse e **teclado** (setas/Backspace); foco no
  tabuleiro; toque ≥44px; respeita `prefers-reduced-motion`.
- **PWA** instalável (offline); **deploy automático** na Vercel
  (**playtaut.vercel.app**) a cada push na `main`.

## Não construir ainda

Figura revelada (v1 = golfe puro), contas de usuário, multiplayer/backend.
