# Taut

Jogo diário de **golfe lógico**: ligue os números em ordem crescente arrastando
o dedo numa grade quadrada (**6×6**), contornando paredes, com o caminho
mais elegante possível — minimizando o score. Um puzzle por dia, determinístico
pela data.

## Arquitetura (regra de ouro)

- `src/engine/` é **TypeScript puro, sem DOM/React** — o coração e a vitrine.
- **Direção das dependências:** `components/` e `hooks/` importam de `engine/`;
  o `engine/` **nunca** importa nada de UI.
- `src/lib/` = camada do app (seed, storage, points, share, **level**,
  **palettes**, **achievements**, **sound**; `challenge` está **dormente** —
  feature de desafio removida da UI). `hooks/useTaut` orquestra o estado;
  `components/` tem o `BoardSVG` (grade/paredes/números compartilhados entre
  canvas e modal) e o `Tutorial` (1ª visita) que reusa o `GameCanvas` em modo
  `minimal`.

## Invariantes de jogo (o caminho)

- Conecta os waypoints na **ordem crescente** (1 → 2 → … → N).
- Passos **ortogonais** (Manhattan), célula a célula.
- **Auto-evitante:** nunca cruza nem repete uma célula.
- Não cruza **parede** (barreira na aresta entre duas células; as células seguem
  pisáveis).
- Não pisa em **célula proibida** (buraco no tabuleiro; o traçado contorna).
  `Puzzle.blocked?: Point[]`; solver/validator/route/BoardSVG a respeitam.
- **Não precisa preencher** a grade (caminho livre).

## Pontuação

- **Geometria** (no engine, *time-agnostic*): `total = comprimento + k·curvas`,
  **k = 2**. `comprimento` = nº de passos; `curvas` = mudanças de direção.
- **Par** = mínimo da geometria, calculado pelo **solver** (busca exata). É o
  ótimo: dá pra empatar, não pra bater. (No app é rotulado **"Ideal"** e fica
  **oculto até a conclusão** — revelado no fim, como recompensa.)
- **Esforço do dia** (FORA do engine, em `lib/`; **menor é melhor** — por isso
  "esforço", não "pontos"): `geometria.total + penalidade de tempo + penalidade de
  tentativas` (tempo +1 a cada 30 s, **teto +5**; cada **refazer** além do 1º vale
  **+5, sem teto**). **Tempo e tentativas nunca afetam o par/ideal.** (Internamente
  o código ainda usa `points`/`dailyPoints`.)

## Gerador

- `generateDaily(date)` determinístico (seed derivada da data); usa o solver como
  **oráculo**.
- **Garantia:** aceita o tabuleiro só se `custo_guloso − par.total ≥ limiar` —
  sempre existe margem de melhora. Rejeita tabuleiros insolúveis ou triviais.
- **Rampa de dificuldade** (`rampForDay`, grade fixa **6×6**): paredes 9→10 e
  **células proibidas 0→1**. **Medição (jul/2026):** densidade de paredes NÃO
  eleva o gap, só o fallback (≥11 → ~45%); 2 células proibidas no 6×6 levam ~75%
  dos dias a fallback (gap ≤4) — por isso o cap é **1** no normal (mais fica pro
  Expert). A dificuldade real vem dos **elementos de tabuleiro**, não de afinar
  paredes/threshold. `DEFAULT_CONFIG` é a superfície de tuning documentada.

## Convenções

- TypeScript **strict**. Testes em **Vitest** (`engine/` roda em env `node`).
- Seed **determinístico pela data** — mesma data, mesmo puzzle.
- Rode `npm run test:run` após cada mudança no `engine/`.

## Produto

- **Streak por presença diária:** quebra só se pular um dia. **Sem estado de
  falha** — o caminho sempre dá pra concluir; chegar no par é **bônus/selo**, não
  exigência. **Escudos** (1 a cada 10 dias, máx. 2) toleram dias pulados; marcos
  comemorados em 7/30/100.
- **Puzzle de hoje** conta pro streak/stats; ao terminar, contador pro próximo.
  **Arquivo/treino** (`components/Archive` + `useTaut(date, active, persist=false)`)
  permite rejogar dias passados SEM afetar streak/stats/XP nem a sessão de hoje.
- **Modo Expert** (`useTaut(..., mode)`; `EXPERT_CONFIG` + `EXPERT_SALT` no gerador):
  2º puzzle diário opt-in, mais denso (11 paredes + 2 células proibidas, seed
  própria). Histórico, sessão, streak e **nível SEPARADOS** — o storage é
  particionado por `Mode` ('daily' | 'expert', sufixo `:expert`).
- **Cronômetro = tempo ATIVO** (`useTaut`): corre quando o grid está **jogável**
  (sem tutorial/onboarding/painel por cima — prop `active`) **e** a aba está
  visível; **pausa fora de foco** (`visibilitychange`) e na conclusão; persiste
  (`DaySession.elapsedMs`) pra retomar. Começa quando o grid aparece, não no 1º
  toque.
- Visual **limpo e colorido/lúdico** (não cinza minimalista); respeita o tema
  claro/escuro do sistema.
- Sem backend/login: histórico em `localStorage`; share estilo Wordle (texto,
  sem revelar o traçado nem o valor do ideal).

## Progressão & plataforma

- **Nível & XP** (`lib/level.ts`): XP por performance (esforço do dia vs. ideal),
  derivado do histórico. Codinomes Cosmos nos landmarks (1 Ponto · 5 Segmento ·
  10 Polígono · 25 Espiral · 50 Fractal · 100 Infinito).
- **Paletas desbloqueáveis** por nível (`lib/palettes.ts` + `data-palette` no CSS).
- **Conquistas** (`lib/achievements.ts`): selos derivados do histórico (estreia,
  ideal batido, **ideais seguidos**, streaks, dias jogados, níveis); tocar revela
  nome+descrição. Painel tem ainda **histograma** de quão perto do ideal você
  costuma ficar.
- **Juice:** sons sintetizados via Web Audio (`lib/sound.ts`, com mudo
  persistente) e **confete** ao bater o ideal / subir de nível (respeita
  reduced-motion). Tutorial **interativo** na 1ª visita.
- **Compartilhar:** só texto estilo Wordle (`lib/share.ts`: esforço/tempo,
  tentativas — só se houve refeita —, streak em linha própria, nota de 5 ⭐ de
  precisão + link), sem revelar traçado/ideal. (`navigator.share` no mobile;
  clipboard no desktop.)
- **Acessível:** joga com toque, mouse e **teclado** (setas/Backspace); foco no
  tabuleiro; toque ≥44px; respeita `prefers-reduced-motion`.
- **PWA** instalável (offline); **deploy automático** na Vercel
  (**playtaut.vercel.app**) a cada push na `main`.
- **Ranking diário** (`lib/leaderboard.ts` + `lib/anonId.ts` + `components/Leaderboard`):
  backend **leve** via **Supabase** (tabela `results`, RLS). Anônimo (UUID no
  localStorage + nome opcional), separado por modo. Envia ao concluir (só jogo
  real, não treino); mostra top-N + sua posição no modal. SDK **lazy-loaded**;
  best-effort (se offline/sem tabela, o ranking só não aparece). A chave `anon` é
  pública (protegida por RLS); pode migrar pra env `VITE_SUPABASE_*` na Vercel.

## Não construir ainda

Figura revelada (v1 = golfe puro), **contas de usuário / login**, multiplayer em
tempo real. (Backend leve para ranking anônimo já existe — ver acima.)
