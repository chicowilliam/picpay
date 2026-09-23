import { CanvasTexture, SRGBColorSpace } from 'three';

type Painter = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
function texture(width: number, height: number, paint: Painter) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d')!;
  paint(context, width, height);
  const result = new CanvasTexture(canvas);
  result.colorSpace = SRGBColorSpace;
  result.anisotropy = 4;
  return result;
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number, fill: string) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill();
}

function label(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color = '#18271f', weight = 500) {
  ctx.fillStyle = color; ctx.font = `${weight} ${size}px Manrope, Arial, sans-serif`; ctx.fillText(value, x, y);
}

export function cardTexture() {
  return texture(1024, 644, (ctx, w, h) => {
    ctx.fillStyle = '#1bb95b'; ctx.fillRect(0, 0, w, h);
    // Fine deterministic print grain catches the lighting without a custom shader.
    for (let i = 0; i < 16000; i++) {
      const x = (i * 7919 % w); const y = (i * 3571 % h);
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,30,12,.035)'; ctx.fillRect(x, y, 1.5, 1.5);
    }
    ctx.strokeStyle = 'rgba(3,83,36,.08)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath(); ctx.ellipse(950, 445, 190 + i * 17, 320 + i * 12, .8, 0, Math.PI * 2); ctx.stroke();
    }
    label(ctx, 'picpay', 78, 140, 84, '#f4fff7', 800);
    label(ctx, 'CONCEPT DESIGN', 80, 562, 19, '#ddf7e5', 600);
    label(ctx, 'picpay', 794, 562, 39, '#e9fff1', 700);
    ctx.strokeStyle = '#ddf7e5'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(295, 309, 13 + i * 13, -.65, .65); ctx.stroke(); }
  });
}

export function backTexture() {
  return texture(1024, 644, (ctx, w, h) => {
    ctx.fillStyle = '#129249'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#142a1c'; ctx.fillRect(0, 100, w, 112);
    label(ctx, 'picpay', 75, 365, 66, '#effff3', 800);
    label(ctx, 'UNOFFICIAL CONCEPT', 75, 545, 21, '#dcf9e5', 600);
  });
}

export function digitalCardTexture() {
  return texture(768, 483, (ctx) => {
    ctx.scale(.75, .75);
    const surface = ctx.createLinearGradient(0, 644, 1024, 0);
    surface.addColorStop(0, '#075238');
    surface.addColorStop(.48, '#12ad67');
    surface.addColorStop(1, '#5be6a0');
    ctx.fillStyle = surface; ctx.fillRect(0, 0, 1024, 644);
    ctx.strokeStyle = '#d7ffe733'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(4, 4, 1016, 636, 30); ctx.stroke();
    label(ctx, 'picpay', 78, 140, 84, '#f4fff7', 800);
    label(ctx, 'CONCEPT DESIGN', 80, 562, 19, '#dcf6e7', 500);
    label(ctx, 'picpay', 794, 562, 39, '#e9fff1', 700);
    ctx.strokeStyle = '#d7ffe7a8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(283, 309, 7 + i * 8, -.65, .65); ctx.stroke();
    }
  });
}

export function phoneTexture() {
  return texture(576, 1192, (ctx, w, h) => {
    ctx.fillStyle = '#f4f7f4'; ctx.fillRect(0, 0, w, h);
    label(ctx, '9:41', 37, 43, 18, '#1a2820', 700);
    label(ctx, '•••  ▰', 465, 43, 17);
    label(ctx, 'Olá, você.', 35, 156, 32, '#1b3023', 700);
    round(ctx, 471, 112, 65, 65, 32, '#dcf0e0'); label(ctx, 'p', 493, 158, 37, '#148442', 800);
    round(ctx, 25, 205, 526, 270, 25, '#e2f0e4');
    label(ctx, 'Saldo em conta', 53, 254, 22, '#354e3e');
    label(ctx, 'R$ ••••', 53, 323, 44, '#183f29', 700);
    round(ctx, 51, 376, 216, 59, 29, '#1c412b'); label(ctx, 'Ver minha conta', 71, 413, 19, '#fff', 600);
    label(ctx, '↗', 479, 326, 39, '#183f29');
    const items = [['↗', 'Enviar'], ['↓', 'Receber'], ['▤', 'Cartão']];
    items.forEach(([icon, name], index) => {
      round(ctx, 42 + index * 180, 520, 128, 108, 22, '#fff');
      label(ctx, icon, 85 + index * 180, 584, 36, '#2b4936', 500);
      label(ctx, name, 68 + index * 180, 668, 21, '#344a3b', 600);
    });
    label(ctx, 'Sua atividade', 35, 750, 27, '#22372a', 700);
    round(ctx, 27, 786, 522, 163, 20, '#fff');
    label(ctx, 'Tudo em um só lugar', 52, 834, 22, '#2d4435', 600);
    label(ctx, 'Acompanhe seus movimentos.', 52, 877, 20, '#6d7f71');
    label(ctx, '→', 485, 838, 30, '#244f33');
    ctx.fillStyle = '#d8e4db'; ctx.fillRect(25, 1009, 526, 1);
    label(ctx, '⌂', 71, 1071, 34, '#148543'); label(ctx, '▤', 262, 1071, 30, '#7b8a80'); label(ctx, '○', 452, 1071, 34, '#7b8a80');
    label(ctx, 'Início', 63, 1108, 17, '#148543', 700); label(ctx, 'Carteira', 246, 1108, 17, '#718077'); label(ctx, 'Perfil', 447, 1108, 17, '#718077');
    label(ctx, 'INTERFACE CONCEITUAL', 171, 1161, 13, '#7a8980', 600);
  });
}

export function layerTexture(kind: 'balance' | 'activity') {
  return texture(640, kind === 'balance' ? 230 : 155, (ctx, w, h) => {
    ctx.fillStyle = kind === 'balance' ? '#e7f5e9' : '#fff'; ctx.fillRect(0, 0, w, h);
    if (kind === 'balance') {
      label(ctx, 'Sua conta', 35, 58, 27, '#36533f', 500);
      label(ctx, 'R$ ••••', 35, 144, 62, '#1f432d', 700);
      label(ctx, 'SALDO PRIVADO', 37, 199, 17, '#65826d', 600);
      label(ctx, '↗', 545, 129, 49, '#257645');
    } else {
      round(ctx, 25, 31, 89, 89, 44, '#e3f2e7'); label(ctx, '↗', 50, 92, 42, '#267043');
      label(ctx, 'Sua atividade', 140, 67, 29, '#284331', 700);
      label(ctx, 'Cada movimento, no seu lugar.', 140, 112, 22, '#748377');
    }
  });
}

export function transferTexture(kind: 'pix' | 'sent' | 'cashback' | 'returned') {
  return texture(576, 1192, (ctx, w, h) => {
    ctx.fillStyle = '#f4f7f4'; ctx.fillRect(0, 0, w, h);
    const pix = kind === 'pix' || kind === 'sent';
    const done = kind === 'sent' || kind === 'returned';
    label(ctx, '9:41', 37, 43, 18, '#1a2820', 700);
    label(ctx, 'picpay', 38, 158, 38, '#168743', 800);
    label(ctx, pix ? 'Pix' : 'Sua conta', 38, 245, 43, '#1c3525', 700);
    label(ctx, 'DEMONSTRAÇÃO', 38, 296, 17, '#64786b', 600);
    round(ctx, 28, 350, 520, 244, 20, '#e2f0e4');
    label(ctx, pix ? 'De você' : 'Saldo demonstrativo', 55, 404, 26);
    label(ctx, pix ? 'R$ 100,00' : done ? '+ R$ 12,40' : 'R$ ••••', 55, 485, 48, '#1c472d', 700);
    label(ctx, pix ? 'Origem fictícia' : done ? 'Retorno recebido' : 'Aguardando retorno', 55, 549, 21, '#55725f');
    label(ctx, pix ? 'Para Ana' : 'Movimento de retorno', pix ? 100 : 42, 811, 30, '#1c3525', 700);
    label(ctx, pix ? 'Destino fictício' : 'R$ 12,40 ilustrativos', pix ? 100 : 42, 859, 22, '#64786b');
    round(ctx, 28, 934, 520, 95, 15, done ? '#1b6f40' : '#e4ece6');
    label(ctx, done ? '✓  Concluído' : pix ? 'Transferência em movimento' : 'De volta à sua conta', 53, 994, done ? 29 : 22, done ? '#fff' : '#4f6657', 600);
    label(ctx, 'SIMULAÇÃO · SEM TRANSAÇÃO REAL', 50, 1119, 17, '#64786b', 600);
  });
}

export function finishTexture(finish: 'graphite' | 'silver') {
  return texture(1024, 644, (ctx, w, h) => {
    const silver = finish === 'silver', ink = silver ? '#243d30' : '#e9f2eb';
    ctx.fillStyle = silver ? '#bfc8c2' : '#26342d'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { ctx.fillStyle = y % 6 ? '#ffffff06' : '#001e0a08'; ctx.fillRect(0, y, w, 1); }
    label(ctx, 'picpay', 78, 140, 84, ink, 800);
    label(ctx, silver ? 'ESTUDO 03 / PRATA' : 'ESTUDO 02 / GRAFITE', 80, 562, 23, ink, 600);
    label(ctx, 'CONCEPT', 790, 562, 22, ink, 600);
  });
}

export function securityTexture(blocked: boolean) {
  return texture(576, 1192, (ctx, w, h) => {
    ctx.fillStyle = '#17271e'; ctx.fillRect(0, 0, w, h);
    label(ctx, '9:41', 37, 43, 18, '#d9e9de', 700);
    label(ctx, 'picpay', 38, 158, 38, '#c4e8d0', 800);
    label(ctx, 'Seu cartão', 38, 245, 42, '#f0f7f2', 600);
    label(ctx, 'CONTROLES · CONCEITO', 38, 296, 17, '#a0baa9', 600);
    round(ctx, 28, 365, 520, 238, 18, '#253d2e');
    label(ctx, 'Bloqueio', 52, 421, 29, '#f0f7f2', 600);
    label(ctx, 'temporário', 52, 462, 29, '#f0f7f2', 600);
    label(ctx, blocked ? 'Cartão bloqueado' : 'Cartão disponível', 52, 559, 25, blocked ? '#87dda5' : '#b8cbbf', 600);
    label(ctx, 'Você decide.', 38, 744, 31, '#eef7f0', 600);
    label(ctx, 'Controle no seu tempo.', 38, 801, 23, '#a0baa9');
    label(ctx, blocked ? '✓  Bloqueio ilustrativo ativo' : 'Aguardando ativação ilustrativa', 38, 973, 22, '#bde4ca', 600);
    label(ctx, 'SIMULAÇÃO · NENHUMA AÇÃO REAL', 44, 1119, 17, '#a0baa9', 600);
  });
}

export function amountTexture(cashback: boolean) {
  return texture(480, 160, (ctx, w, h) => {
    ctx.fillStyle = '#1c7143'; ctx.fillRect(0, 0, w, h);
    label(ctx, cashback ? '↩  R$ 12,40' : 'R$ 100,00  →', 30, 79, 48, '#fff', 700);
    label(ctx, 'VALOR DEMONSTRATIVO', 32, 126, 18, '#d7f4e2', 600);
  });
}
