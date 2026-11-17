# Publicar a V9.1 no repositório existente

Não execute git init na pasta descompactada se já possui um clone do repositório.
No seu clone `marcony-jr-git`, copie o conteúdo deste pacote para a raiz,
preservando o `.git` da pasta clonada.

Se não tiver clone:

```bash
cd ~/OneDrive/Documentos/Projetos
git clone https://github.com/marconydev/marcony-jr-portfolio.git marcony-jr-git
```

Copie todos os arquivos de código e a pasta assets para dentro de `marcony-jr-git`.

```bash
cd ~/OneDrive/Documentos/Projetos/marcony-jr-git
git status
npm run check
npm run dev
# depois de testar, pare o servidor com Ctrl+C
git add index.html main.js scene.js style.css config.js visual-v5.css motion-v5.js service-map-v6.js service-map-v6.css hero-transition-v9.css package.json assets/projetos/
git diff --cached --stat
git commit -m "Publicar V9 Service Map e melhorar confirmacao do formulario"
git push origin main
```

Confirme no GitHub Actions a publicação. O envio real pelo FormSubmit ainda exige ativação do destinatário e teste de recebimento em Gmail.
