import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei/core/Environment';
import { Lightformer } from '@react-three/drei/core/Lightformer';
import { RoundedBox } from '@react-three/drei/core/RoundedBox';
import { ACESFilmicToneMapping, Color, Group, MathUtils, PerspectiveCamera, Shape, ShapeGeometry, Vector3 } from 'three';
import type { Texture, DirectionalLight, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial } from 'three';
import type { MotionState } from '../App';
import { sampleCardPresence, samplePose } from '../story/chapters';
import { backTexture, cardTexture, digitalCardTexture, finishTexture, layerTexture, phoneTexture } from './textures';
import Transfer from './Transfer';
import { ProtectionLayers, SecurityControls } from './Security';

interface Props { motion: RefObject<MotionState>; onReady: () => void; onFailure: () => void }

function roundedFace(width: number, height: number, radius: number) {
  const x = -width / 2; const y = -height / 2;
  const shape = new Shape();
  shape.moveTo(x + radius, y); shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius); shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height); shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius); shape.quadraticCurveTo(x, y, x + radius, y);
  const geometry = new ShapeGeometry(shape, 8);
  const position = geometry.attributes.position; const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) uv.setXY(i, (position.getX(i) + width / 2) / width, (position.getY(i) + height / 2) / height);
  return geometry;
}

function Face({ width, height, radius, map, z, lit = false, materialRef, finish }: { width: number; height: number; radius: number; map: Texture; z: number; lit?: boolean; materialRef?: RefObject<MeshBasicMaterial | null>; finish?: 'graphite' | 'silver' }) {
  const geometry = useMemo(() => roundedFace(width, height, radius), [width, height, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position-z={z}>{lit ? <meshPhysicalMaterial map={map} metalness={finish === 'silver' ? .55 : finish ? .55 : .26} roughness={finish === 'graphite' ? .5 : .24} clearcoat={finish ? .2 : .65} clearcoatRoughness={.22} envMapIntensity={finish === 'silver' ? 1.8 : 1.1} /> : <meshBasicMaterial ref={materialRef} map={map} toneMapped={false} />}</mesh>;
}

function Card({ finish, motion }: { finish?: 'graphite' | 'silver'; motion?: RefObject<MotionState> }) {
  const front = useRef<Group>(null), chip = useRef<Group>(null);
  const digital = useRef<Mesh>(null), digitalMaterial = useRef<MeshPhysicalMaterial>(null), chipMaterial = useRef<MeshStandardMaterial>(null);
  const chipColors = useMemo(() => [new Color('#d5d4b8'), new Color('#58ba8a')], []);
  const surface = useMemo(() => motion ? { map: digitalCardTexture(), geometry: roundedFace(3.63, 2.28, .11) } : null, [motion]);
  useEffect(() => () => { surface?.map.dispose(); surface?.geometry.dispose(); }, [surface]);
  useFrame(() => {
    if (!motion) return;
    const blend = 1 - MathUtils.smoothstep(motion.current.progress, .035, .22);
    if (front.current) front.current.visible = blend < .999;
    if (digital.current) digital.current.visible = blend > .001;
    if (digitalMaterial.current) digitalMaterial.current.opacity = blend;
    if (chip.current) {
      chip.current.scale.set(1 - blend * .3, 1 - blend * .3, 1 - blend * .88);
      chip.current.position.z = .045 - blend * .008;
    }
    if (chipMaterial.current) {
      chipMaterial.current.color.lerpColors(chipColors[0], chipColors[1], blend);
      chipMaterial.current.metalness = .94 - blend * .76;
      chipMaterial.current.roughness = .29 + blend * .39;
    }
  });
  const maps = useMemo(() => {
    const front = finish ? finishTexture(finish) : cardTexture();
    return { front, back: finish ? front : backTexture() };
  }, [finish]);
  useEffect(() => () => {
    maps.front.dispose();
    if (maps.back !== maps.front) maps.back.dispose();
  }, [maps]);
  return <group>
    <RoundedBox args={[3.65, 2.3, .065]} radius={.115} smoothness={4} bevelSegments={3}><meshPhysicalMaterial color={finish === 'silver' ? '#bac8c0' : finish ? '#26342d' : '#198e49'} metalness={.52} roughness={.3} clearcoat={.32} /></RoundedBox>
    <group ref={front}><Face width={3.63} height={2.28} radius={.11} map={maps.front} z={.035} lit finish={finish} /></group>
    {surface && <mesh ref={digital} geometry={surface.geometry} position-z={.036}>
      <meshPhysicalMaterial ref={digitalMaterial} map={surface.map} metalness={.12} roughness={.36} clearcoat={.32} clearcoatRoughness={.26} envMapIntensity={1} transparent depthWrite={false} />
    </mesh>}
    <group rotation-y={Math.PI}><Face width={3.63} height={2.28} radius={.11} map={maps.back} z={.035} lit finish={finish} /></group>
    <group ref={chip} position={[-1.03, .035, .045]}>
      <RoundedBox args={[.47, .35, .016]} radius={.06} smoothness={3}><meshStandardMaterial ref={chipMaterial} color="#d5d4b8" metalness={.94} roughness={.29} /></RoundedBox>
      {[-.09, .09].map((x) => <mesh key={x} position={[x, 0, .011]}><boxGeometry args={[.008, .33, .002]} /><meshStandardMaterial color="#76836c" metalness={.6} roughness={.45} /></mesh>)}
      {[-.065, .065].map((y) => <mesh key={y} position={[0, y, .011]}><boxGeometry args={[.455, .008, .002]} /><meshStandardMaterial color="#76836c" metalness={.6} roughness={.45} /></mesh>)}
    </group>
  </group>;
}

function CardStack({ motion, compact, ambientTime }: { motion: RefObject<MotionState>; compact: boolean; ambientTime: RefObject<number> }) {
  const graphite = useRef<Group>(null), silver = useRef<Group>(null);
  const short = useThree(state => state.size.height < 740);
  const cards = useMemo(() => [graphite, silver], []);
  useFrame(() => {
    const p = motion.current.progress;
    const spread = MathUtils.smoothstep(p, 3.42, 3.8) * (1 - MathUtils.smoothstep(p, 4, 4.25));
    const heroSpread = 1 - MathUtils.smoothstep(p, .015, .16);
    for (let i = 0; i < cards.length; i++) {
      const group = cards[i].current;
      if (!group) continue;
      group.visible = spread > .001 || (heroSpread > .001 && (!compact || i === 0));
      group.position.set((i + 1) * .22 * spread, (i + 1) * (compact ? .92 : 1.05) * spread, -(i + 1) * (compact ? .32 : .5) * spread - .075);
      group.rotation.set(.035 * spread * (i + 1), .07 * spread * (i + 1), .045 * spread * (i + 1));
      if (heroSpread > 0) {
        const depth = (i + 1) * heroSpread;
        const breathe = Math.sin(ambientTime.current * .7 + i * .8) * .018 * heroSpread;
        group.position.set(-depth * (compact ? .13 : .2), depth * (compact ? short ? .17 : .3 : .47) + breathe, -.075 - depth * .19);
        group.rotation.set(depth * .035, -depth * .035, depth * (compact ? .055 : .07));
      }
    }
    if (import.meta.env.DEV) {
      const diagnostic = window as unknown as { __sceneInfo?: Record<string, unknown> };
      Object.assign(diagnostic.__sceneInfo ??= {}, { cards: { spread, heroSpread, count: spread > .001 ? 3 : heroSpread > .001 ? compact ? 2 : 3 : 1 } });
    }
  });
  return <><group ref={graphite} visible={false}><Card finish="graphite" /></group><group ref={silver} visible={false}><Card finish="silver" /></group></>;
}

function Phone({ spread, compact, motion }: { spread: RefObject<number>; compact: boolean; motion: RefObject<MotionState> }) {
  const balance = useRef<Group>(null); const activity = useRef<Group>(null);
  const layers = useMemo(() => [balance, activity], []);
  const screenMaterial = useRef<MeshBasicMaterial>(null);
  const maps = useMemo(() => ({ phone: phoneTexture(), balance: layerTexture('balance'), activity: layerTexture('activity') }), []);
  useEffect(() => () => Object.values(maps).forEach((map) => map.dispose()), [maps]);
  useFrame(() => {
    const value = spread.current;
    if (balance.current) { balance.current.position.set(-.24 * value, .78, .16 + value * .58); balance.current.rotation.y = -.07 * value; }
    if (activity.current) { activity.current.position.set(.3 * value, compact ? -.18 : -.68, .16 + value * .39); activity.current.rotation.y = .045 * value; }
    const recompose = 1 - MathUtils.smoothstep(motion.current.progress, 1.03, 1.22);
    for (const ref of layers) { const layer = ref.current; if (layer) { layer.visible = recompose > .001; layer.scale.setScalar(Math.max(.001, recompose)); } }
    if (motion.current.progress >= 5.45 && screenMaterial.current) screenMaterial.current.map = maps.phone;
  });
  return <group>
    <RoundedBox args={[1.94, 4.02, .21]} radius={.24} smoothness={5} bevelSegments={4}><meshStandardMaterial color="#66716e" metalness={.84} roughness={.3} /></RoundedBox>
    <RoundedBox args={[1.885, 3.955, .225]} radius={.22} smoothness={5}><meshPhysicalMaterial color="#0c1110" metalness={.45} roughness={.23} clearcoat={.5} /></RoundedBox>
    <Face width={1.77} height={3.8} radius={.18} z={.119} map={maps.phone} materialRef={screenMaterial} />
    <Transfer motion={motion} compact={compact} screenMaterial={screenMaterial} accountMap={maps.phone} />
    <SecurityControls motion={motion} screen={screenMaterial} />
    <ProtectionLayers motion={motion} compact={compact} />
    <RoundedBox args={[.59, .13, .013]} radius={.062} position={[0, 1.76, .13]} smoothness={4}><meshBasicMaterial color="#101512" /></RoundedBox>
    <mesh position={[.195, 1.76, .141]}><circleGeometry args={[.023, 16]} /><meshStandardMaterial color="#163143" metalness={.7} roughness={.12} /></mesh>
    <RoundedBox args={[.58, .021, .005]} position={[0, -1.79, .125]} radius={.009}><meshBasicMaterial color="#26332b" /></RoundedBox>
    <RoundedBox args={[.035, .45, .09]} position={[-.98, .67, 0]} radius={.013}><meshStandardMaterial color="#919996" metalness={.9} roughness={.23} /></RoundedBox>
    <RoundedBox args={[.035, .32, .09]} position={[.98, .46, 0]} radius={.013}><meshStandardMaterial color="#919996" metalness={.9} roughness={.23} /></RoundedBox>
    <group ref={balance}>
      <RoundedBox args={[1.92, .69, .055]} radius={.07} smoothness={4}><meshStandardMaterial color="#d4e7d8" roughness={.4} metalness={.12} /></RoundedBox>
      <Face width={1.91} height={.686} radius={.065} map={maps.balance} z={.03} />
    </group>
    <group ref={activity}>
      <RoundedBox args={[2.03, .495, .055]} radius={.07} smoothness={4}><meshStandardMaterial color="#e4eae5" roughness={.5} /></RoundedBox>
      <Face width={2.02} height={.489} radius={.065} map={maps.activity} z={.03} />
    </group>
  </group>;
}

function World({ motion, onReady, onFailure }: Props) {
  const card = useRef<Group>(null); const phone = useRef<Group>(null); const light = useRef<DirectionalLight>(null); const fill = useRef<DirectionalLight>(null);
  const spread = useRef(0); const ambientTime = useRef(0); const pointer = useRef({ x: 0, y: 0 });
  const { size, camera, gl, invalidate, setDpr } = useThree();
  const mobile = size.width < 760;
  const ready = useRef(false); const samples = useRef({ count: 0, slow: 0 });
  const target = useMemo(() => new Vector3(0, 0, 0), []);
  const fillColors = useMemo(() => [new Color('#f8fff9'), new Color('#c1ffd6')], []);
  const sampledPose = useMemo(() => samplePose(0, false), []);
  const readyFrame = useRef<number | null>(null);
  useEffect(() => () => { if (readyFrame.current !== null) cancelAnimationFrame(readyFrame.current); }, []);

  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, onFailure]);

  useEffect(() => {
    let previousProgress = -1; let previousX = 0; let previousY = 0;
    // Demand rendering is awakened by scroll/pointer changes, and only runs continuously for ambient motion.
    const tick = () => {
      const state = motion.current;
      if (!state.visible) return;
      const changed = state.progress !== previousProgress || state.pointerX !== previousX || state.pointerY !== previousY;
      const settling = (state.progress < 1 || state.progress > 5) && (Math.abs(pointer.current.x - (mobile ? 0 : state.pointerX)) > .0005 || Math.abs(pointer.current.y - (mobile ? 0 : state.pointerY)) > .0005);
      if (changed || settling || (ambientTime.current < 4 && state.progress < .95)) invalidate();
      previousProgress = state.progress; previousX = state.pointerX; previousY = state.pointerY;
    };
    gsapTicker.add(tick);
    return () => gsapTicker.remove(tick);
  }, [invalidate, motion, mobile]);

  useFrame((_, delta) => {
    const state = motion.current;
    const pose = samplePose(state.progress, mobile, sampledPose);
    const cardsFocus = MathUtils.smoothstep(state.progress, 3, 3.4) * (1 - MathUtils.smoothstep(state.progress, 4.25, 4.55));
    const closing = MathUtils.smoothstep(state.progress, 5, 5.8);
    const mobileScale = MathUtils.clamp((size.height - 380) / 400, .52, 1);
    const pixelsPerUnit = size.width / 4.05;
    const phoneScale = .95 * mobileScale;
    const phoneCenter = size.height * .16 + 212 + 4.02 * phoneScale * pixelsPerUnit / 2;
    const heroBlend = 1 - MathUtils.smoothstep(state.progress, 0, 1);
    const heroY = (size.height * .15 - 180) / pixelsPerUnit;
    const heroScale = MathUtils.clamp((size.height - 430) / 350, .65, 1);
    const heroPixelsPerUnit = mobile ? pixelsPerUnit : size.height / (2 * Math.tan(MathUtils.degToRad(37 / 2)) * 8.6);
    const heroCenterY = mobile ? size.height * .56 : size.height * .57;
    const campaignScale = mobile ? (size.height < 740 ? .68 : .8) : MathUtils.clamp(size.width / size.height * .48, .45, 1.05);
    // A short ambient entrance settles automatically; pointer and scroll remain interactive.
    if (state.visible) ambientTime.current = Math.min(4, ambientTime.current + Math.min(delta, .05));
    pointer.current.x = MathUtils.damp(pointer.current.x, mobile ? 0 : state.pointerX, 5, Math.min(delta, .05));
    pointer.current.y = MathUtils.damp(pointer.current.y, mobile ? 0 : state.pointerY, 5, Math.min(delta, .05));
    const float = Math.sin(ambientTime.current * .8) * .035 * Math.max(0, 1 - state.progress);
    if (card.current) {
      const mobileAccountY = (size.height / 2 - (phoneCenter + 65 * mobileScale)) / pixelsPerUnit;
      const initialY = MathUtils.lerp(pose.y, heroY, heroBlend);
      const y = mobile ? MathUtils.lerp(initialY, mobileAccountY, pose.phone) : pose.y;
      card.current.position.set(pose.x, y + float + (mobile ? .55 * cardsFocus - .1 * closing : 0), pose.z);
      card.current.rotation.set(pose.rx + pointer.current.y * .025, pose.ry + pointer.current.x * .045, pose.rz);
      const responsiveScale = MathUtils.lerp(1, heroScale, heroBlend) * MathUtils.lerp(1, Math.max(.75, mobileScale), pose.phone);
      card.current.scale.setScalar(pose.scale * (mobile ? responsiveScale : 1));
      // Release the responsive Hero pose over one continuous descent into Account.
      card.current.position.x = MathUtils.lerp(card.current.position.x, mobile ? .08 : size.width * .215 / heroPixelsPerUnit, heroBlend);
      card.current.position.y = MathUtils.lerp(card.current.position.y, (size.height / 2 - heroCenterY) / heroPixelsPerUnit + float, heroBlend);
      card.current.scale.setScalar(MathUtils.lerp(card.current.scale.x, campaignScale * (1 + Math.sin(ambientTime.current * .45) * .005), heroBlend));
      card.current.rotation.x += heroBlend * (.07 + Math.sin(ambientTime.current * .38) * .008);
      card.current.rotation.y += heroBlend * ((mobile ? -.13 : -.24) + Math.sin(ambientTime.current * .32) * .012);
      card.current.rotation.z += heroBlend * (mobile ? .46 : .49);
      const presence = sampleCardPresence(state.progress);
      card.current.scale.multiplyScalar(presence);
      card.current.visible = presence > .001;
      if (state.progress > 1 && state.progress < 1.25) {
        card.current.position.x = MathUtils.lerp(card.current.position.x, mobile ? .37 : 2.08, 1 - presence);
        card.current.position.y = MathUtils.lerp(card.current.position.y, mobile ? (size.height / 2 - phoneCenter) / pixelsPerUnit : .03, 1 - presence);
      }
    }
    if (phone.current) {
      phone.current.visible = pose.phone > .002;
      phone.current.position.set(mobile ? .37 : 2.08, (mobile ? (size.height / 2 - phoneCenter) / pixelsPerUnit : .03) - (1 - pose.phone) * 2.3, -.15);
      phone.current.rotation.set(.025, -.2 + (1 - pose.phone) * .3, -.055);
      phone.current.scale.setScalar((mobile ? phoneScale : 1.04) * Math.max(.001, pose.phone));
      // Recede before the extra cards separate: at most three product objects on mobile.
      if (state.progress > 3) {
        phone.current.position.z -= cardsFocus * 1.35;
        phone.current.scale.multiplyScalar(Math.max(.16, 1 - cardsFocus * .84));
        phone.current.visible = pose.phone > .002;
      }
      if (closing > 0) {
        phone.current.position.x += closing * (mobile ? .04 : .2);
        phone.current.position.y -= closing * (mobile ? .17 : 0);
        phone.current.rotation.y += closing * (.09 + pointer.current.x * (mobile ? 0 : .025));
        phone.current.rotation.z += closing * .035;
        phone.current.scale.multiplyScalar(1 - closing * (mobile ? .1 : 0));
      }
    }
    spread.current = pose.spread;
    camera.position.set(pointer.current.x * .09 * heroBlend, -pointer.current.y * .05 * heroBlend, pose.cameraZ);
    const perspective = camera as PerspectiveCamera;
    const fov = mobile ? MathUtils.radToDeg(2 * Math.atan(4.05 / (2 * (size.width / size.height) * 8.6))) : 37;
    if (perspective.fov !== fov) { perspective.fov = fov; perspective.updateProjectionMatrix(); }
    camera.lookAt(target);
    if (light.current) {
      light.current.intensity = pose.light * (1.5 - heroBlend * .22);
      light.current.position.set(-4 + heroBlend * (1.8 + Math.sin(ambientTime.current * .35) * .55), 6, 7);
    }
    if (fill.current) {
      fill.current.color.lerpColors(fillColors[0], fillColors[1], heroBlend);
      fill.current.intensity = .65 + heroBlend * .22;
    }
    if (!ready.current) { ready.current = true; readyFrame.current = requestAnimationFrame(onReady); }
    if (samples.current.count < 180 && delta < .2) {
      samples.current.count++; if (delta > .028) samples.current.slow++;
      if (samples.current.count === 180 && samples.current.slow > 70) setDpr(1);
    }
    if (import.meta.env.DEV) {
      const diagnostic = window as unknown as { __sceneInfo?: Record<string, unknown> };
      Object.assign(diagnostic.__sceneInfo ??= {}, { progress: state.progress, ambientTime: ambientTime.current, calls: gl.info.render.calls, triangles: gl.info.render.triangles, dpr: gl.getPixelRatio(), mobile, card: card.current?.position.toArray(), cardVisible: card.current?.visible, rotation: card.current?.rotation.toArray(), phoneVisible: phone.current?.visible, phone: phone.current?.position.toArray(), scale: card.current?.scale.x, cameraZ: pose.cameraZ, spread: pose.spread });
    }
  }, -1);

  return <>
    <ambientLight intensity={.55} />
    <directionalLight ref={light} position={[-4, 6, 7]} intensity={2.2} color="#effff3" />
    <directionalLight ref={fill} position={[4, 1, 4]} intensity={.65} color="#f8fff9" />
    <Environment frames={1} resolution={128}>
      <Lightformer form="rect" intensity={4} color="white" position={[-4, 4, 3]} scale={[5, 2, 1]} rotation={[0, Math.PI / 4, 0]} />
      <Lightformer form="rect" intensity={3} color="#e2ffe9" position={[4, 0, 2]} scale={[1, 5, 1]} rotation={[0, -Math.PI / 4, 0]} />
      <Lightformer form="rect" intensity={2} color="white" position={[0, -3, 4]} scale={[4, 1, 1]} />
    </Environment>
    <group ref={phone}><Phone spread={spread} compact={mobile} motion={motion} /></group>
    <group ref={card}><Card motion={motion} /><CardStack motion={motion} compact={mobile} ambientTime={ambientTime} /></group>
  </>;
}

import gsap from 'gsap';
const gsapTicker = gsap.ticker;

export default function Scene({ motion, onReady, onFailure }: Props) {
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => { let active = true; document.fonts.ready.then(() => { if (active) setFontsReady(true); }); return () => { active = false; }; }, []);
  if (!fontsReady) return null;
  return <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0, 8.6], fov: 37, near: .1, far: 30 }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power', toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }} fallback={null}>
    <World motion={motion} onReady={onReady} onFailure={onFailure} />
  </Canvas>;
}
