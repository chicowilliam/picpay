import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { CubicBezierCurve3, Group, MathUtils, Mesh, MeshBasicMaterial, TubeGeometry, Vector3 } from 'three';
import type { Texture } from 'three';
import type { MotionState } from '../App';
import { amountTexture, transferTexture } from './textures';

// One baked screen and one bounded path per event. No particle system or per-frame textures.
export default function Transfer({ motion, compact, screenMaterial, accountMap }: { motion: RefObject<MotionState>; compact: boolean; screenMaterial: RefObject<MeshBasicMaterial | null>; accountMap: Texture }) {
  const root = useRef<Group>(null);
  const token = useRef<Group>(null);
  const path = useRef<Mesh>(null);
  const tokenMaterial = useRef<MeshBasicMaterial>(null);
  const maps = useMemo(() => ({ pix: transferTexture('pix'), sent: transferTexture('sent'), cashback: transferTexture('cashback'), returned: transferTexture('returned'), outgoing: amountTexture(false), incoming: amountTexture(true) }), []);
  const paths = useMemo(() => {
    const depth = compact ? .33 : .8;
    const pix = new CubicBezierCurve3(new Vector3(0, .55, .17), new Vector3(compact ? .7 : 1.35, .55, depth), new Vector3(compact ? .7 : 1.35, -.62, depth), new Vector3(0, -.65, .17));
    const cashback = new CubicBezierCurve3(new Vector3(compact ? -1 : -1.3, -.8, .9), new Vector3(compact ? -1.15 : -2.05, .1, depth + .5), new Vector3(-.75, 1.3, depth), new Vector3(0, .55, .17));
    return { pix, cashback, pixGeometry: new TubeGeometry(pix, 48, .012, 5, false), cashbackGeometry: new TubeGeometry(cashback, 48, .012, 5, false) };
  }, [compact]);
  const point = useMemo(() => new Vector3(), []);
  useEffect(() => () => Object.values(maps).forEach(map => map.dispose()), [maps]);
  useEffect(() => () => { paths.pixGeometry.dispose(); paths.cashbackGeometry.dispose(); }, [paths]);
  useFrame(() => {
    const p = motion.current.progress;
    const cash = p >= 2.14;
    const travel = MathUtils.smoothstep(p, cash ? 2.48 : 1.43, cash ? 2.85 : 1.78);
    const entry = MathUtils.smoothstep(p, 1.12, 1.32);
    if (root.current) { root.current.visible = p > 1.12; root.current.scale.y = Math.max(.001, entry); }
    if (screenMaterial.current && p < 4.28) screenMaterial.current.map = p < 1.22 ? accountMap : cash ? travel >= .999 ? maps.returned : maps.cashback : travel >= .999 ? maps.sent : maps.pix;
    const active = cash ? p >= 2.45 && p <= 2.89 : p >= 1.4 && p <= 1.82;
    if (path.current) {
      path.current.visible = active;
      path.current.geometry = cash ? paths.cashbackGeometry : paths.pixGeometry;
      const count = path.current.geometry.index!.count;
      const tail = Math.max(0, travel - .32);
      path.current.geometry.setDrawRange(Math.floor(tail * count / 30) * 30, Math.max(0, Math.floor((travel - tail) * count / 30) * 30));
    }
    if (token.current) {
      token.current.visible = active;
      (cash ? paths.cashback : paths.pix).getPoint(travel, point);
      token.current.position.copy(point);
      const appear = MathUtils.smoothstep(p, cash ? 2.45 : 1.4, cash ? 2.5 : 1.45);
      const absorb = 1 - MathUtils.smoothstep(travel, .87, 1);
      token.current.scale.setScalar(Math.max(.001, appear * absorb) * (compact ? 1.2 : 1.1));
      token.current.rotation.y = Math.sin(travel * Math.PI) * (cash ? -.15 : .12);
    }
    if (tokenMaterial.current) tokenMaterial.current.map = cash ? maps.incoming : maps.outgoing;
    if (import.meta.env.DEV) {
      const diagnostic = window as unknown as { __sceneInfo?: { transfer?: unknown } };
      if (diagnostic.__sceneInfo) diagnostic.__sceneInfo.transfer = { chapter: p < 1.22 ? 'account' : cash ? 'cashback' : 'pix', travel, active, complete: travel >= .999, token: point.toArray() };
    }
  });
  return <group ref={root} visible={false}>
    <mesh ref={path} geometry={paths.pixGeometry}><meshBasicMaterial color="#25c875" toneMapped={false} /></mesh>
    <group ref={token}>
      <mesh><planeGeometry args={[1.32, .44]} /><meshBasicMaterial ref={tokenMaterial} map={maps.outgoing} toneMapped={false} /></mesh>
    </group>
  </group>;
}
