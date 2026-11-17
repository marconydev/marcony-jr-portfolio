# Marcony Jr — V9 | Hero com card persistente

Esta versão parte da V8 e mantém o **mesmo painel do hero** durante toda a animação da abertura. Títulos, descrições e indicadores mudam com uma transição editorial suave, evitando que a borda/fundo desapareçam.

## Executar

```bash
npm run dev
```

Abrir `http://127.0.0.1:4173` (se a porta estiver disponível). Se estiver ocupada: no PowerShell `$env:PORT=4180; npm run dev` ou no Git Bash `PORT=4180 npm run dev`.

## Arquivos alterados

- `index.html`: adiciona um contêiner único `hero-copy-shell` e carrega o CSS V9.
- `main.js`: substitui a timeline que escondia os cards por uma transição entre textos, com acessibilidade e fallback sem animação.
- `hero-transition-v9.css`: mantém o painel fixo, alinhado ao mapa da V8.
- `package.json`: versão V9; `npm run dev` permanece inalterado.

Demais arquivos e as três imagens de projetos permanecem copiados da V8. O site não foi publicado automaticamente no GitHub.
