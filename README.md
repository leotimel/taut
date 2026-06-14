# Taut

**Taut** é um jogo diário de *golfe lógico*: ligue os números em ordem arrastando
o dedo numa grade, contornando paredes, com o **traçado mais elegante possível** —
o menor `comprimento + 2·curvas`. Um puzzle novo por dia, determinístico pela data.

🎮 **Jogue:** **[playtaut.vercel.app](https://playtaut.vercel.app)**

## A ideia

- Ligue **1 → 2 → 3 → …** com passos ortogonais, sem cruzar a própria linha,
  contornando as **paredes** (barreiras nas arestas entre células).
- O **Ideal** (o "par", do golfe) é o menor score geométrico possível daquele
  tabuleiro. Você tenta **empatar** com ele — não dá pra bater, é o ótimo.
- O Ideal fica **oculto** enquanto você joga; é revelado no fim, com o "traçado
  perfeito" do solver sobreposto ao seu.

## O motor (o que mais interessa no repo)

O `src/engine/` é **TypeScript puro, sem DOM** — o coração do projeto, 100%
testado (Vitest, ~95%+ de cobertura no engine).

- **`solver.ts`** acha o **par** com busca exata (DFS + *branch-and-bound*). A
  poda usa uma **cota inferior admissível**: distância de Manhattan até o próximo
  número + soma das distâncias entre os números restantes (+1 curva quando o alvo
  difere nos dois eixos). Como a cota nunca superestima, a primeira solução de
  menor custo encontrada é o ótimo — e roda em **< 1 ms** num 6×6.
- **`generator.ts`** gera o puzzle do dia de forma determinística (seed da data)
  num loop *generate-and-test*: usa o solver como **oráculo** e só aceita o
  tabuleiro se `custo_da_rota_curta − par ≥ limiar`, garantindo que **sempre
  exista margem de melhora** (o momento "ah, dá pra fazer melhor").
- **`validator.ts`** decide se um caminho é legal (dentro da grade, ortogonal,
  auto-evitante, sem cruzar parede, passando pelos números em ordem, começando no
  1 e terminando no N) e diz o motivo da invalidez.
- **`scorer.ts`** = `comprimento + k·curvas` (k = 2, *time-agnostic*).
  Mais: **`geometry.ts`**, **`rng.ts`** (RNG determinístico) e **`route.ts`**
  (navegação pura do arrasto).

> A rota mais curta que um jogador faz de primeira costuma serpentear (muitas
> curvas); o par troca um pouco de comprimento por bem menos curvas. O gerador
> garante que essa diferença (o *gap*) seja grande o bastante pra valer a pena.

## Arquitetura

```
src/
├── engine/      # TS puro, sem DOM — a matemática (solver, gerador, validador…)
├── lib/         # app: seed, storage, points, share, level, palettes, achievements, sound
├── hooks/       # useTaut (estado, timer, tentativas, XP)
├── components/  # GameCanvas, ResultModal, Onboarding, Tutorial, BoardSVG
└── App.tsx
```

**Regra de ouro:** `components/` e `hooks/` importam de `engine/`; o `engine/`
nunca importa nada de UI.

## Recursos

- 🧩 Puzzle **diário e determinístico**, com **rampa de dificuldade** (a densidade
  de paredes cresce com o tempo).
- 🏆 **Nível & XP** por performance, com codinomes Cosmos (Ponto → Segmento →
  Polígono → Espiral → Fractal → Infinito) e **paletas desbloqueáveis** por nível.
- 🏅 **Conquistas** + **histograma** de quão perto do ideal você costuma chegar.
- 🔥 **Streak** com **escudos** (toleram dias pulados) e marcos (7 / 30 / 100).
- 🎓 **Tutorial interativo** na 1ª visita — você pratica num tabuleiro de treino.
- 🔊 **Som + confete** (juice) ao traçar, concluir e subir de nível — com mudo e
  respeito a `prefers-reduced-motion`.
- 📤 **Compartilhar** estilo Wordle (texto): esforço, tempo, tentativas (se houve
  refeita), streak e uma **nota de 5 estrelas** (precisão), mais o link — sem
  revelar o traçado nem o valor do ideal.
- ♿ Joga com **toque, mouse e teclado** (setas); tema claro/escuro automático;
  vibração sutil no mobile.
- 📱 **PWA instalável** (funciona offline); deploy automático na Vercel a cada push.
- 💾 100% **local** (localStorage) — sem login, sem backend.

## Stack

Vite · React 19 · TypeScript (strict) · TailwindCSS v4 · Vitest · vite-plugin-pwa.

## Rodando

```bash
npm install
npm run dev        # desenvolvimento
npm run test:run   # testes
npm run coverage   # testes + cobertura
npm run build      # build de produção (gera dist/)
```

---

O motor é o produto; a tela é a vitrine.
