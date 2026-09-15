import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowDown, ArrowUpRight, ChevronDown, EyeOff, Pause, Play, Wallet, CreditCard, MoveUpRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { STORY_END } from './story/chapters';

gsap.registerPlugin(ScrollTrigger);
const Scene = lazy(() => import('./scene/Scene'));
export interface MotionState { progress: number; pointerX: number; pointerY: number; paused: boolean; visible: boolean }

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function StaticCard() {
  return <div className="static-card"><span className="card-wordmark">picpay</span><span className="static-chip" /><span className="card-caption">CONCEPT DESIGN</span><span className="card-contactless">)))</span></div>;
}

function StaticPhone() {
  return <div className="static-phone"><div className="phone-island" /><div className="phone-welcome">Olá, você.<span>p</span></div><p>Saldo em conta</p><strong>R$ ••••</strong><div className="phone-actions"><Wallet /><CreditCard /><MoveUpRight /></div><div className="phone-row">Sua conta<span>→</span></div><div className="phone-row">Sua atividade<span>→</span></div><small>Interface conceitual</small></div>;
}

export default function App() {
  const root = useRef<HTMLDivElement>(null);
  const motion = useRef<MotionState>({ progress: 0, pointerX: 0, pointerY: 0, paused: false, visible: true });
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [shortViewport, setShortViewport] = useState(() => window.matchMedia('(max-height: 540px)').matches);
  const [webgl, setWebgl] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const staticMode = reduced || failed || shortViewport;
  const sceneReady = useCallback(() => setReady(true), []);
  const sceneFailed = useCallback(() => setFailed(true), []);
  useEffect(() => { if (staticMode) setReady(false); }, [staticMode]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const shortMedia = window.matchMedia('(max-height: 540px)');
    const change = () => setReduced(media.matches);
    const changeHeight = () => setShortViewport(shortMedia.matches);
    media.addEventListener('change', change);
    shortMedia.addEventListener('change', changeHeight);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    if (context) { context.getExtension('WEBGL_lose_context')?.loseContext(); setWebgl(true); }
    else setFailed(true);
    return () => { media.removeEventListener('change', change); shortMedia.removeEventListener('change', changeHeight); };
  }, []);

  useEffect(() => {
    const visibility = () => { motion.current.visible = !document.hidden; };
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      motion.current.pointerX = (event.clientX / window.innerWidth - .5) * 2;
      motion.current.pointerY = (event.clientY / window.innerHeight - .5) * 2;
    };
    const leave = () => { motion.current.pointerX = 0; motion.current.pointerY = 0; };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pointermove', pointer, { passive: true });
    document.addEventListener('pointerleave', leave);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pointermove', pointer); document.removeEventListener('pointerleave', leave); };
  }, []);

  useEffect(() => {
    if (staticMode) return;
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ scrollTrigger: {
        trigger: '.story', start: 'top top', end: 'bottom bottom', scrub: .55,
      } });
      timeline.to(motion.current, { progress: STORY_END, duration: STORY_END, ease: 'none' }, 0)
        .to('.hero-copy', { autoAlpha: 0, y: -75, duration: .18, ease: 'none' }, .03)
        .to('.hero-bottom', { autoAlpha: 0, duration: .1 }, .01)
        .to('.light-stage', { opacity: 1, duration: .36, ease: 'none' }, .4)
        .to('.account-copy', { opacity: 1, y: 0, duration: .17, ease: 'none' }, .67)
        .to('.account-detail', { opacity: 1, y: 0, duration: .13, ease: 'none' }, .84)
        .to('.nav', { color: '#17241c', duration: .2 }, .55)
        .to('.concept-label', { color: '#4b5951', duration: .2 }, .55)
        .to('.motion-toggle', { color: '#17241c', borderColor: '#bac6bf', duration: .2 }, .55)
        .to('.account-copy', { autoAlpha: 0, y: -35, duration: .15 }, 1.05)
        .to('.pix-copy', { autoAlpha: 1, y: 0, duration: .18 }, 1.2)
        .to('.pix-status', { autoAlpha: 1, duration: .08 }, 1.78)
        .to('.pix-copy', { autoAlpha: 0, y: -35, duration: .15 }, 1.94)
        .to('.cashback-copy', { autoAlpha: 1, y: 0, duration: .18 }, 2.13)
        .to('.return-status', { autoAlpha: 1, duration: .1 }, 2.84)
        .to('.cashback-copy', { autoAlpha: 0, y: -35, duration: .15 }, 3.05)
        .to('.cards-copy', { autoAlpha: 1, y: 0, duration: .18 }, 3.22)
        .to('.cards-copy', { autoAlpha: 0, y: -35, duration: .16 }, 4.07)
        .to('.light-stage', { backgroundColor: '#111b17', duration: .55, ease: 'none' }, 4.13)
        .to('.nav', { color: '#f1f6f2', duration: .35 }, 4.28)
        .to('.concept-label', { color: '#adbbb2', duration: .35 }, 4.28)
        .to('.motion-toggle', { color: '#d4e3d9', borderColor: '#5c7064', duration: .35 }, 4.28)
        .to('.security-copy', { autoAlpha: 1, y: 0, duration: .18 }, 4.45)
        .to('.security-status', { autoAlpha: 1, duration: .12 }, 4.87)
        .to('.security-copy', { autoAlpha: 0, y: -35, duration: .16 }, 5.04)
        .to('.light-stage', { backgroundColor: '#f4f6f2', duration: .55, ease: 'none' }, 5.12)
        .to('.nav', { color: '#17241c', duration: .3 }, 5.4)
        .to('.concept-label', { color: '#4b5951', duration: .3 }, 5.4)
        .to('.motion-toggle', { color: '#17241c', borderColor: '#bac6bf', duration: .3 }, 5.4)
        .to('.closing-copy', { autoAlpha: 1, y: 0, duration: .2 }, 5.48)
        .to('.progress-fill', { scaleX: 1, duration: STORY_END, ease: 'none' }, 0);
    }, root);
    let active = true;
    document.fonts.ready.then(() => { if (active) ScrollTrigger.refresh(); });
    return () => { active = false; context.revert(); motion.current.progress = 0; };
  }, [staticMode]);

  const goAccount = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (staticMode) return;
    event.preventDefault();
    const story = root.current?.querySelector('.story');
    if (story) window.scrollTo({ top: (story.getBoundingClientRect().bottom + window.scrollY - window.innerHeight) / STORY_END, behavior: 'smooth' });
    root.current?.querySelector<HTMLElement>('#conta')?.focus({ preventScroll: true });
    window.history.replaceState(null, '', '#conta');
  };

  useEffect(() => {
    if (window.location.hash !== '#conta' || staticMode) return;
    const id = window.setTimeout(() => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) / STORY_END), 150);
    return () => window.clearTimeout(id);
  }, [staticMode]);

  const mobilePoster = window.innerWidth < 760;
  const posterScale = mobilePoster ? .712 * window.innerWidth * Math.max(.65, Math.min(1, (window.innerHeight - 430) / 350)) / 365 : .495 * window.innerHeight / 365;
  const posterStyle = { '--poster-scale': posterScale, '--poster-top': `${mobilePoster ? window.innerHeight * .35 + 180 : window.innerHeight * .695}px` } as CSSProperties;
  return <div ref={root} style={posterStyle} className={`experience ${staticMode ? 'static-mode' : ''} ${ready ? 'scene-ready' : ''}`}>
    <a className="skip-link" href="#conta" onClick={goAccount}>Ir para conta digital</a>
    <header className="nav">
      <a className="wordmark" href="#" aria-label="PicPay, início">picpay<span className="brand-period">.</span></a>
      <a href="#conta" onClick={goAccount} className="nav-link">Conta digital <ArrowDown size={13} /></a>
      <a href="https://picpay.com/pt-br/pf" target="_blank" rel="noopener noreferrer" className="nav-external">Site oficial <ArrowUpRight size={15} /></a>
    </header>
    <main className="story" data-story-end={STORY_END}>
      <div className="stage">
        <div className="light-stage" />
        {!staticMode && webgl && <div className="webgl" aria-hidden="true"><SceneBoundary onError={sceneFailed}><Suspense fallback={null}><Scene motion={motion} paused={paused} onReady={sceneReady} onFailure={sceneFailed} /></Suspense></SceneBoundary></div>}
        <section className="hero-copy" aria-labelledby="hero-title">
          <div className="eyebrow"><span /> SIMPLES. DO SEU JEITO.</div>
          <h1 id="hero-title">Seu dinheiro.<br /><span>Em movimento.</span></h1>
          <a className="primary-cta" href="https://picpay.com/pt-br/pf" target="_blank" rel="noopener noreferrer">Abrir conta no PicPay <ArrowUpRight size={18} /></a>
        </section>
        <div className="fallback-hero" aria-hidden="true"><StaticCard /></div>
        <div className="hero-bottom"><span>CONTA DIGITAL<br /><b>Sua conta. Tudo à mão.</b></span><a href="#conta" onClick={goAccount} aria-label="Conhecer a conta digital"><ChevronDown size={20} /></a><span className="hero-bottom-right">FEITO PARA<br /><b>ACOMPANHAR VOCÊ.</b></span></div>
        <section id="conta" tabIndex={-1} className="account-copy" aria-labelledby="account-title">
          <div className="eyebrow"><span /> CONTA DIGITAL</div>
          <h2 id="account-title">Sua conta.<br /><span>Tudo à mão.</span></h2>
          <p>Seu dinheiro e seus próximos passos.<br className="desktop-break" /> No mesmo lugar.</p>
          <div className="account-detail"><div><Wallet size={19} /><span>Um olhar para sua conta.</span></div><div><EyeOff size={19} /><span>Você escolhe o que mostrar.</span></div><small>Interface conceitual. Dados demonstrativos.</small></div>
        </section>
        <div className="fallback-account" aria-hidden="true"><StaticPhone /><StaticCard /></div>
        {!staticMode && <>
          <section className="chapter-copy pix-copy" aria-labelledby="pix-title">
            <div className="eyebrow"><span /> PIX</div>
            <h2 id="pix-title">Enviou.<br /><span>Chegou.</span></h2>
            <p>De você. Para alguém.</p>
            <div className="chapter-note"><strong className="pix-status">Transferência concluída.</strong><small>Simulação visual. Pessoas e valores fictícios.</small></div>
          </section>
          <section className="chapter-copy cashback-copy" aria-labelledby="cashback-title">
            <div className="eyebrow"><span /> CASHBACK</div>
            <h2 id="cashback-title">Uma parte<br /><span>volta.</span></h2>
            <p>O movimento faz o caminho de volta.</p>
            <div className="chapter-note"><strong className="return-status">De volta ao saldo demonstrativo.</strong><small>R$ 12,40 ilustrativos. Não é uma oferta ou promessa de benefício.</small></div>
          </section>
          <section className="chapter-copy cards-copy" aria-labelledby="cards-title">
            <div className="eyebrow"><span /> PICPAY CARDS</div>
            <h2 id="cards-title">Escolha<br /><span>o seu.</span></h2>
            <p>O seu jeito, em cada detalhe.</p>
            <div className="chapter-note"><small>Acabamentos conceituais. Não representam produtos ou ofertas reais.</small></div>
          </section>
          <section className="chapter-copy security-copy" aria-labelledby="security-title">
            <div className="eyebrow"><span /> SEGURANÇA</div>
            <h2 id="security-title">Controle na<br /><span>sua mão.</span></h2>
            <p>Seu cartão. Suas decisões.</p>
            <div className="chapter-note"><strong className="security-status">Bloqueio ilustrativo ativo.</strong><small>Interface conceitual. Nenhum bloqueio real é realizado.</small></div>
          </section>
          <section className="chapter-copy closing-copy" aria-labelledby="closing-title">
            <h2 id="closing-title">Seu próximo<br /><span>movimento.</span></h2>
            <p>O próximo passo é seu.</p>
            <a className="primary-cta" href="https://picpay.com/pt-br/pf" target="_blank" rel="noopener noreferrer">Abrir conta no PicPay <ArrowUpRight size={18} /></a>
          </section>
        </>}
        <div className="concept-label">Unofficial Concept / Concept Redesign<span>Projeto independente de portfólio, sem vínculo com o PicPay.</span></div>
        {!staticMode && <button className="motion-toggle" aria-pressed={paused} aria-label={paused ? 'Retomar movimento ambiente' : 'Pausar movimento ambiente'} title={paused ? 'Retomar movimento ambiente' : 'Pausar movimento ambiente'} onClick={() => { motion.current.paused = !paused; setPaused(!paused); }}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>}
        <div className="story-progress"><div className="progress-fill" /></div>
      </div>
    </main>
    {staticMode && <div className="static-chapters">
      <section><div className="eyebrow">PIX</div><h2>Enviou. <span>Chegou.</span></h2><div className="static-transfer"><span>Você<small>Origem fictícia</small></span><ArrowUpRight /><span>Ana<small>Destino fictício</small></span></div><p>R$ 100,00 · Transferência demonstrativa concluída.</p><small>Simulação visual. Pessoas e valores fictícios.</small></section>
      <section><div className="eyebrow">CASHBACK</div><h2>Uma parte <span>volta.</span></h2><StaticCard /><p className="static-return">↩ R$ 12,40</p><p>De volta ao saldo demonstrativo.</p><small>Valor ilustrativo. Não é uma oferta ou promessa de benefício.</small></section>
    </div>}
    {staticMode && <div className="static-next-chapters">
      <section><div className="eyebrow">PICPAY CARDS</div><h2>Escolha <span>o seu.</span></h2><div className="static-stack" aria-label="Três acabamentos conceituais: prata, grafite e verde"><StaticCard /><StaticCard /><StaticCard /></div><small>Acabamentos conceituais. Não representam produtos ou ofertas reais.</small></section>
      <section className="static-security"><div className="eyebrow">SEGURANÇA</div><h2>Controle na <span>sua mão.</span></h2><div className="static-protection"><div className="static-phone"><div className="phone-island" /><div className="phone-welcome">Seu cartão</div><p>Bloqueio temporário</p><strong>Bloqueado</strong><div className="static-switch" /><small>SIMULAÇÃO · NENHUMA AÇÃO REAL</small></div></div><p>Bloqueio ilustrativo ativo.</p><small>Interface conceitual. Nenhum bloqueio real é realizado.</small></section>
    </div>}
    {staticMode && <section className="static-closing" aria-labelledby="closing-title">
      <div className="closing-copy"><h2 id="closing-title">Seu próximo<br /><span>movimento.</span></h2><p>O próximo passo é seu.</p><a className="primary-cta" href="https://picpay.com/pt-br/pf" target="_blank" rel="noopener noreferrer">Abrir conta no PicPay <ArrowUpRight size={18} /></a></div>
      <div className="static-closing-product" aria-hidden="true"><StaticPhone /><StaticCard /></div>
      <p className="static-closing-label">Unofficial Concept / Concept Redesign<br /><span>Projeto independente de portfólio, sem vínculo com o PicPay.</span></p>
    </section>}
  </div>;
}
