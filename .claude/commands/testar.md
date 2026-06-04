---
description: Roda os testes (Vitest) com cobertura e resume o resultado e as falhas
---

Rode a suíte de testes do Taut **com cobertura** e me dê um relatório curto e
acionável. Não conserte nada — apenas relate.

1. Execute `npm run coverage` (equivale a `vitest run --coverage`) na raiz do
   projeto `taut/`.
2. **Se tudo passar:** confirme em uma linha (`✅ <N> testes em <M> arquivos`) e
   mostre um resumo **compacto** da cobertura — o total (% statements/branches/
   funcs/lines) e os 2–3 arquivos com menor cobertura, destacando lacunas
   relevantes no `engine/` ou `lib/` (a estrela do projeto).
3. **Se houver falhas:** liste cada teste que falhou como
   `arquivo › nome do teste` + a causa em **uma linha** (esperado vs recebido).
   Ordene do mais relevante/fácil de corrigir primeiro. Não despeje stack traces
   inteiros — resuma.
4. Se algo falhou, termine com **um próximo passo objetivo** (qual arquivo/teste
   olhar). Se passou tudo, não invente trabalho.
