# Sonicly

Plataforma web para **artistas independentes** publicarem a sua música e receberem feedback (gostos e comentários) de ouvintes reais.

**🔗 Site: https://mylifeshooter23.github.io/sonicly/**

Projeto de Aptidão Profissional (PAP) — Curso Profissional de Técnico de Gestão e Programação de Sistemas Informáticos.

## Funcionalidades

- **Login e registo** de conta (e modo convidado para explorar)
- **Início** com feed de publicações, pesquisa e filtro por género
- **Gostos e comentários** em cada música
- **Publicar música**: carregar um ficheiro de áudio (MP3/WAV/OGG) ou gerar uma faixa de demonstração
- **Biblioteca** com Favoritos, Álbuns, Playlists e Rascunhos
- **Perfil** com foto, biografia, cor de fundo e lista de músicas
- **Definições** com tema escuro / claro e dados da conta
- **Leitor de áudio fixo** no fundo do ecrã, que continua a tocar ao mudar de página (aleatório, repetir, volume, visualizador)
- Design **responsivo** (computador e telemóvel)

## Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML5 | Estrutura das páginas |
| CSS3 | Estilos, tema escuro/claro, design responsivo |
| JavaScript | Lógica da aplicação, router, leitor de áudio |
| UIkit 3 | Ícones, janelas (modais) e notificações |
| Web Audio API | Leitor e geração das músicas de demonstração |
| localStorage | Guardar contas e dados no navegador (protótipo) |
| GitHub | Controlo de versões do código |
| GitHub Pages | Alojamento do site |

## Estrutura de pastas

```
Sonicly/
├── index.html        Página única da aplicação
├── css/style.css     Estilos (tema, layout, responsivo)
├── js/data.js        Artistas, músicas e publicações de exemplo
├── js/store.js       Armazenamento de dados (contas, publicações, biblioteca)
├── js/synth.js       Gerador das músicas de demonstração
├── js/player.js      Leitor de áudio fixo
├── js/views.js       HTML de cada página
├── js/app.js         Navegação entre páginas, botões e formulários
└── assets/logo.svg   Logótipo
```

## Como abrir

Abre o ficheiro `index.html` num navegador (Chrome, Firefox ou Edge). Não precisa de instalação.

Para entrar logo como convidado: `index.html?convidado=1`

## Limitações do protótipo

- Não há servidor: as contas e publicações ficam guardadas **apenas no navegador** de quem usa o site. Outra pessoa noutro computador não vê as tuas publicações.
- Ficheiros de áudio com mais de 2,5 MB só ficam disponíveis até fechar o separador.
- Próximo passo: ligar a uma base de dados online (por exemplo Firebase ou Supabase) para partilhar contas, músicas e comentários entre utilizadores.
