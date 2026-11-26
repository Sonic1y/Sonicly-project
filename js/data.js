/* =========================================================
   Sonicly — dados de demonstração
   Artistas, músicas e publicações fictícias para o protótipo.
   As músicas de exemplo são geradas pelo próprio navegador
   (ver synth.js), por isso não há ficheiros de áudio externos.
   ========================================================= */

const GENRES = [
  { id: "lofi",       name: "Lo-fi" },
  { id: "indie",      name: "Indie" },
  { id: "synthwave",  name: "Synthwave" },
  { id: "rock",       name: "Rock" },
  { id: "hiphop",     name: "Hip-hop" },
  { id: "pop",        name: "Pop" },
  { id: "ambient",    name: "Ambiente" },
  { id: "eletronica", name: "Eletrónica" }
];

const COVER_COLORS = [
  ["#30d5c8", "#1b4f72"], ["#ff8a5c", "#7b2d8e"], ["#f7c948", "#e4572e"],
  ["#5c7cfa", "#0b0b0d"], ["#ff5d8f", "#3a0ca3"], ["#8ce99a", "#1864ab"],
  ["#a5d8ff", "#5f3dc4"], ["#e8590c", "#1a1a1a"]
];

const SAMPLE_ARTISTS = [
  { username: "marealta",   name: "Maré Alta",   bio: "Banda indie de Setúbal. Guitarras, verões e saudade.", color: "#1b4f72", album: "Areia Molhada" },
  { username: "neonlisboa", name: "Neon Lisboa", bio: "Sintetizadores dos anos 80 com vista para o Tejo.",   color: "#7b2d8e", album: "Avenida Nocturna" },
  { username: "valeazul",   name: "Vale Azul",   bio: "Lo-fi para estudar, ler e desligar do mundo.",        color: "#1864ab", album: "Cadernos" },
  { username: "oscinzentos",name: "Os Cinzentos",bio: "Rock de garagem desde o 10.º ano.",                    color: "#3d3d3d", album: "Volume no Máximo" },
  { username: "kavu",       name: "Kavu",        bio: "Produtor de beats. Amostras, bateria e paciência.",    color: "#e4572e", album: "Bairro" },
  { username: "luacheia",   name: "Lua Cheia",   bio: "Pop luminoso escrito no quarto, gravado no quarto.",   color: "#3a0ca3", album: "Fases" },
  { username: "brisa",      name: "Brisa",       bio: "Paisagens sonoras calmas para respirar.",              color: "#0b7285", album: "Maré Baixa" },
  { username: "trovoada",   name: "Trovoada",    bio: "Eletrónica para dançar até a luz voltar.",             color: "#5f3dc4", album: "Relâmpago" }
];

// Cada música de exemplo tem uma "semente" que define a melodia gerada.
const SAMPLE_TRACKS = [
  { id: "t1",  title: "Areia Molhada",    artist: "marealta",    genre: "indie",      seed: 11, duration: 48, colors: 0 },
  { id: "t2",  title: "Último Comboio",   artist: "marealta",    genre: "indie",      seed: 27, duration: 52, colors: 2 },
  { id: "t3",  title: "Avenida Nocturna", artist: "neonlisboa",  genre: "synthwave",  seed: 38, duration: 56, colors: 1 },
  { id: "t4",  title: "Cassete Perdida",  artist: "neonlisboa",  genre: "synthwave",  seed: 44, duration: 50, colors: 4 },
  { id: "t5",  title: "Página 47",        artist: "valeazul",    genre: "lofi",       seed: 53, duration: 60, colors: 5 },
  { id: "t6",  title: "Chá de Domingo",   artist: "valeazul",    genre: "lofi",       seed: 61, duration: 58, colors: 6 },
  { id: "t7",  title: "Volume no Máximo", artist: "oscinzentos", genre: "rock",       seed: 72, duration: 46, colors: 7 },
  { id: "t8",  title: "Garagem",          artist: "oscinzentos", genre: "rock",       seed: 85, duration: 44, colors: 2 },
  { id: "t9",  title: "Bairro",           artist: "kavu",        genre: "hiphop",     seed: 93, duration: 54, colors: 7 },
  { id: "t10", title: "Escadas",          artist: "kavu",        genre: "hiphop",     seed: 101,duration: 50, colors: 3 },
  { id: "t11", title: "Quarto Crescente", artist: "luacheia",    genre: "pop",        seed: 117,duration: 50, colors: 4 },
  { id: "t12", title: "Lua de Agosto",    artist: "luacheia",    genre: "pop",        seed: 123,duration: 48, colors: 1 },
  { id: "t13", title: "Maré Baixa",       artist: "brisa",       genre: "ambient",    seed: 131,duration: 64, colors: 6 },
  { id: "t14", title: "Nevoeiro",         artist: "brisa",       genre: "ambient",    seed: 149,duration: 62, colors: 0 },
  { id: "t15", title: "Relâmpago",        artist: "trovoada",    genre: "eletronica", seed: 157,duration: 52, colors: 3 },
  { id: "t16", title: "Corrente",         artist: "trovoada",    genre: "eletronica", seed: 163,duration: 54, colors: 5 }
];

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

// Publicações iniciais do feed (uma por música).
const SAMPLE_POSTS = [
  { id: "p1",  trackId: "t3",  text: "Primeiro single do novo EP! Gravado num sintetizador emprestado.", ago: 2 * HOUR,  likes: 48 },
  { id: "p2",  trackId: "t5",  text: "Para quem está a estudar para os exames. Força!",                    ago: 5 * HOUR,  likes: 112 },
  { id: "p3",  trackId: "t1",  text: "Escrita na praia em julho. Digam-me o que acham do refrão.",         ago: 9 * HOUR,  likes: 31 },
  { id: "p4",  trackId: "t9",  text: "Beat novo. Procuro rapper para colaborar 👀",                        ago: 14 * HOUR, likes: 67 },
  { id: "p5",  trackId: "t11", text: "A minha primeira música publicada. Estou nervosa!",                  ago: 1 * DAY,   likes: 89 },
  { id: "p6",  trackId: "t7",  text: "Ensaio de ontem, direto da garagem.",                                ago: 1.4 * DAY, likes: 22 },
  { id: "p7",  trackId: "t15", text: "Para a pista. Volume alto, por favor.",                              ago: 2 * DAY,   likes: 54 },
  { id: "p8",  trackId: "t13", text: "Gravei o som do mar e construí isto à volta.",                       ago: 2.5 * DAY, likes: 40 },
  { id: "p9",  trackId: "t4",  text: "Encontrei uma cassete antiga do meu pai e inspirei-me nela.",       ago: 3 * DAY,   likes: 36 },
  { id: "p10", trackId: "t6",  text: "Domingos lentos.",                                                    ago: 3.5 * DAY, likes: 75 },
  { id: "p11", trackId: "t2",  text: "Sobre perder o último comboio para casa.",                           ago: 4 * DAY,   likes: 28 },
  { id: "p12", trackId: "t10", text: "Bateria gravada nas escadas do prédio. A sério.",                    ago: 4.5 * DAY, likes: 33 },
  { id: "p13", trackId: "t12", text: "Uma canção de verão atrasada.",                                       ago: 5 * DAY,   likes: 61 },
  { id: "p14", trackId: "t8",  text: "A primeira música que tocámos juntos.",                              ago: 6 * DAY,   likes: 19 },
  { id: "p15", trackId: "t14", text: "Para manhãs de nevoeiro.",                                            ago: 6.5 * DAY, likes: 27 },
  { id: "p16", trackId: "t16", text: "Remistura de uma ideia antiga.",                                      ago: 7 * DAY,   likes: 44 }
];

const SAMPLE_COMMENTS = {
  p1: [{ user: "luacheia", text: "Este som é incrível! Faz lembrar filmes antigos." }, { user: "kavu", text: "Esse baixo 🔥" }],
  p2: [{ user: "brisa", text: "Perfeito para concentrar." }],
  p3: [{ user: "oscinzentos", text: "O refrão fica na cabeça, gosto muito." }],
  p4: [{ user: "trovoada", text: "Bora fazer uma colaboração!" }],
  p5: [{ user: "valeazul", text: "Que estreia! Continua." }, { user: "marealta", text: "Muito bom, parabéns 👏" }],
  p7: [{ user: "neonlisboa", text: "Isto ao vivo deve ser brutal." }]
};
