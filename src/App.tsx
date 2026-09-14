import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
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
    window.history.replaceState(null, '', '#conta');
  };

  useEffect(() => {
    if (window.location.hash !== '#conta' || staticMode) return;
    const id = window.setTimeout(() => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) / STORY_END), 150);
    return () => window.clearTimeout(id);
  }, [staticMode]);

  return <div ref={root} className={`experience ${staticMode ? 'static-mode' : ''} ${ready ? 'scene-ready' : ''}`}>
    <a className="skip-link" href="#conta" onClick={goAccount}>Ir para conta digital</a>
    <header className="nav">
      <a className="wordmark" href="#" aria-label="PicPay, início">picpay<span className="brand-period">.</span></a>
      <a href="#conta" onClick={goAccount} className="nav-link">Conta digital <ArrowDown size={13} /></a>
      <a href="https://picpay.com/pt-br/pf" target="_blank" rel="noopener noreferrer" className="nav-external">Site oficial <ArrowUpRight size={15} /></a>
    </header>
    <main className="story" data-story-end={STORY_END}>
      <div className="stage">
        <div className="light-stage" />
        {!staticMode && webgl && <div className="webgl" aria-hidden="true"><SceneBoundary onError={() => setFailed(true)}><Suspense fallback={null}><Scene motion={motion} paused={paused} onReady={() => setReady(true)} onFailure={() => setFailed(true)} /></Suspense></SceneBoundary></div>}
        <section className="hero-copy" aria-labelledby="hero-title">
          <div className="eyebrow"><span /> SIMPLES. DO SEU JEITO.</div>
          <h1 id="hero-title">Seu dinheiro.<br /><span>Em movimento.</span></h1>
          <a className="primary-cta" href="https://picpay.com/pt-br/pf" target="_blank" rel="noopener noreferrer">Abrir conta no PicPay <ArrowUpRight size={18} /></a>
        </section>
        <div className="fallback-hero" aria-hidden="true"><StaticCard /></div>
        <div className="hero-bottom"><span>CONTA DIGITAL<br /><b>Sua conta. Tudo à mão.</b></span><a href="#conta" onClick={goAccount} aria-label="Conhecer a conta digital"><ChevronDown size={20} /></a><span className="hero-bottom-right">FEITO PARA<br /><b>ACOMPANHAR VOCÊ.</b></span></div>
        <section id="conta" className="account-copy" aria-labelledby="account-title">
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
        </>}
        <div className="concept-label">Unofficial Concept / Concept Redesign<span>Projeto independente, sem vínculo oficial com o PicPay.</span></div>
        {!staticMode && <button className="motion-toggle" aria-pressed={paused} aria-label={paused ? 'Retomar movimento ambiente' : 'Pausar movimento ambiente'} title={paused ? 'Retomar movimento ambiente' : 'Pausar movimento ambiente'} onClick={() => { motion.current.paused = !paused; setPaused(!paused); }}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>}
        <div className="story-progress"><div className="progress-fill" /></div>
      </div>
    </main>
    {staticMode && <div className="static-chapters">
      <section><div className="eyebrow">PIX</div><h2>Enviou. <span>Chegou.</span></h2><div className="static-transfer"><span>Você<small>Origem fictícia</small></span><ArrowUpRight /><span>Ana<small>Destino fictício</small></span></div><p>R$ 100,00 · Transferência demonstrativa concluída.</p><small>Simulação visual. Pessoas e valores fictícios.</small></section>
      <section><div className="eyebrow">CASHBACK</div><h2>Uma parte <span>volta.</span></h2><StaticCard /><p className="static-return">↩ R$ 12,40</p><p>De volta ao saldo demonstrativo.</p><small>Valor ilustrativo. Não é uma oferta ou promessa de benefício.</small></section>
    </div>}
  </div>;
}
