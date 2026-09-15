import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CatmullRomCurve3, Color, Group, MathUtils, MeshBasicMaterial, Shape, TubeGeometry, Vector3 } from 'three';
import type { Mesh } from 'three';
import type { MotionState } from '../App';
import { securityTexture } from './textures';

export function SecurityControls({ motion, screen }: { motion: RefObject<MotionState>; screen: RefObject<MeshBasicMaterial | null> }) {
  const root = useRef<Group>(null); const knob = useRef<Mesh>(null); const track = useRef<MeshBasicMaterial>(null);
  const maps = useMemo(() => ({ available: securityTexture(false), blocked: securityTexture(true) }), []);
  const colors = useMemo(() => [new Color('#63776c'), new Color('#22b961')], []);
  const trackShape = useMemo(() => {
    const s = new Shape(); s.moveTo(-.11, .105); s.lineTo(.11, .105);
    s.absarc(.11, 0, .105, Math.PI / 2, -Math.PI / 2, true); s.lineTo(-.11, -.105);
    s.absarc(-.11, 0, .105, -Math.PI / 2, Math.PI / 2, true); s.closePath(); return s;
  }, []);
  useEffect(() => () => Object.values(maps).forEach(map => map.dispose()), [maps]);
  useFrame(() => {
    const p = motion.current.progress, active = p >= 4.28 && p < 5.45;
    const lock = MathUtils.smoothstep(p, 4.65, 4.86);
    if (root.current) { root.current.visible = active; root.current.scale.setScalar(1 - MathUtils.smoothstep(p, 5.1, 5.45)); }
    if (active && screen.current) screen.current.map = lock >= .98 ? maps.blocked : maps.available;
    if (knob.current) knob.current.position.x = -.09 + .18 * lock;
    if (track.current) track.current.color.copy(colors[0]).lerp(colors[1], lock);
    if (import.meta.env.DEV) {
      const diagnostic = window as unknown as { __sceneInfo?: Record<string, unknown> };
      Object.assign(diagnostic.__sceneInfo ??= {}, { protection: { active, lock, blocked: active && lock >= .98 } });
    }
  });
  return <group ref={root} visible={false} position={[.51, .3, .126]}>
    <mesh><shapeGeometry args={[trackShape, 12]} /><meshBasicMaterial ref={track} color="#63776c" toneMapped={false} /></mesh>
    <mesh ref={knob} position={[-.09, 0, .008]}><circleGeometry args={[.073, 20]} /><meshBasicMaterial color="#f5faf6" toneMapped={false} /></mesh>
  </group>;
}

export function ProtectionLayers({ motion, compact }: { motion: RefObject<MotionState>; compact: boolean }) {
  const root = useRef<Group>(null); const first = useRef<Group>(null); const second = useRef<Group>(null);
  const layers = useMemo(() => [first, second], []);
  const { size } = useThree();
  const mobileScale = MathUtils.clamp((size.height - 380) / 400, .52, 1);
  const width = compact ? MathUtils.lerp(5.5, 3.2, mobileScale) : 3.75;
  const geometry = useMemo(() => {
    const w = width / 2, h = 2.25, r = .26;
    const shape = new Shape(); shape.moveTo(-w + r, -h); shape.lineTo(w - r, -h);
    shape.quadraticCurveTo(w, -h, w, -h + r); shape.lineTo(w, h - r); shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h); shape.quadraticCurveTo(-w, h, -w, h - r); shape.lineTo(-w, -h + r); shape.quadraticCurveTo(-w, -h, -w + r, -h);
    const points = shape.getPoints(8).map(p => new Vector3(p.x, p.y, 0)); points.pop();
    return new TubeGeometry(new CatmullRomCurve3(points, true), 160, .008, 4, true);
  }, [width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    const p = motion.current.progress;
    const entry = MathUtils.smoothstep(p, 4.42, 4.62), align = MathUtils.smoothstep(p, 4.55, 4.86);
    const release = MathUtils.smoothstep(p, 5.05, 5.5);
    if (root.current) { root.current.visible = p > 4.42 && release < .999; root.current.position.x = (compact ? MathUtils.lerp(-1.7, -.4, mobileScale) : -.5) * (1 - release); }
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i].current;
      if (!layer) continue;
      layer.position.set((1 - align) * (i ? .3 : -.3), -.12, -.3 + i * (compact ? .48 : .72));
      layer.rotation.set((1 - align) * (i ? -.08 : .08), (1 - align) * .1, (1 - align) * (i ? -.13 : .13));
      layer.scale.set(1 - release * .5, Math.max(.001, entry * (1 - release)), 1);
    }
  });
  return <group ref={root} visible={false}>
    <group ref={first}><mesh geometry={geometry}><meshStandardMaterial color="#547966" metalness={.65} roughness={.4} /></mesh></group>
    <group ref={second}><mesh geometry={geometry}><meshStandardMaterial color="#a1b8aa" metalness={.75} roughness={.3} /></mesh></group>
  </group>;
}
