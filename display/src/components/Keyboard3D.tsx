import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import type { KeyData, LayoutDetail } from "../lib/types";
import { FINGER_COLORS, heatColor, keyLabel } from "../lib/format";

export type ColorMode = "finger" | "heat";

const textureCache = new Map<string, THREE.CanvasTexture>();
function labelTexture(label: string): THREE.CanvasTexture {
  const key = label;
  const cached = textureCache.get(key);
  if (cached) return cached;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#f8fafc";
  ctx.font = `${label.length > 1 ? 54 : 74}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, size / 2, size / 2 + 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  textureCache.set(key, tex);
  return tex;
}

interface KeyCapProps {
  k: KeyData;
  color: string;
  onHover: (k: KeyData | null) => void;
  highlighted: boolean;
}

function KeyCap({ k, color, onHover, highlighted }: KeyCapProps) {
  const [hover, setHover] = useState(false);
  const lift = hover || highlighted ? 0.18 : 0;
  const tex = useMemo(() => labelTexture(keyLabel(k.char)), [k.char]);
  return (
    <group position={[k.x, lift, k.y]}>
      <RoundedBox
        args={[0.92, 0.42, 0.92]}
        radius={0.08}
        smoothness={4}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          onHover(k);
        }}
        onPointerOut={() => {
          setHover(false);
          onHover(null);
        }}
      >
        <meshStandardMaterial
          color={color}
          roughness={0.45}
          metalness={0.1}
          emissive={highlighted ? "#ffffff" : "#000000"}
          emissiveIntensity={highlighted ? 0.18 : 0}
        />
      </RoundedBox>
      <mesh position={[0, 0.212, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.74, 0.74]} />
        <meshBasicMaterial map={tex} transparent />
      </mesh>
    </group>
  );
}

// Frames the board so it fits the canvas regardless of aspect ratio.
function CameraRig({ halfW, halfD }: { halfW: number; halfD: number }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const vFov = (cam.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * cam.aspect);
    const pad = 0.6;
    const distW = (halfW + pad) / Math.tan(hFov / 2);
    const distD = (halfD + pad) / Math.tan(vFov / 2);
    const dist = Math.max(distW, distD);
    const dir = new THREE.Vector3(0, 0.82, 0.95).normalize();
    cam.position.copy(dir.multiplyScalar(dist));
    cam.near = 0.1;
    cam.far = dist * 4;
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, [camera, size.width, size.height, halfW, halfD, controls]);

  return null;
}

interface BoardProps {
  layout: LayoutDetail;
  mode: ColorMode;
  highlightChars?: Set<string>;
  onHover: (k: KeyData | null) => void;
}

function Board({ layout, mode, highlightChars, onHover }: BoardProps) {
  const { keys, cx, cz, maxFreq } = useMemo(() => {
    const xs = layout.keys.map((k) => k.x);
    const zs = layout.keys.map((k) => k.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const maxFreq = Math.max(...layout.keys.map((k) => k.freq), 1e-6);
    return { keys: layout.keys, cx, cz, maxFreq };
  }, [layout]);

  return (
    <group position={[-cx, 0, -cz]}>
      {keys.map((k) => {
        const color =
          mode === "finger"
            ? FINGER_COLORS[k.finger]
            : heatColor(k.freq / maxFreq);
        return (
          <KeyCap
            key={k.index}
            k={k}
            color={color}
            onHover={onHover}
            highlighted={!!highlightChars?.has(k.char)}
          />
        );
      })}
    </group>
  );
}

interface Keyboard3DProps {
  layout: LayoutDetail;
  mode: ColorMode;
  highlightChars?: Set<string>;
}

export default function Keyboard3D({ layout, mode, highlightChars }: Keyboard3DProps) {
  const [hovered, setHovered] = useState<KeyData | null>(null);
  const lastValid = useRef<KeyData | null>(null);
  if (hovered) lastValid.current = hovered;
  const info = hovered ?? null;

  const { halfW, halfD } = useMemo(() => {
    const xs = layout.keys.map((k) => k.x);
    const zs = layout.keys.map((k) => k.y);
    const halfW = (Math.max(...xs) - Math.min(...xs)) / 2 + 0.5;
    const halfD = (Math.max(...zs) - Math.min(...zs)) / 2 + 0.5;
    return { halfW, halfD };
  }, [layout]);

  return (
    <div className="relative min-h-[360px] flex-1">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 12, 12], fov: 40 }}
      >
        <CameraRig halfW={halfW} halfD={halfD} />
        <color attach="background" args={["#0c100f"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 12, 6]} intensity={1.1} castShadow />
        <directionalLight position={[-6, 6, -4]} intensity={0.4} />
        <Board
          layout={layout}
          mode={mode}
          highlightChars={highlightChars}
          onHover={setHovered}
        />
        <OrbitControls
          makeDefault
          enablePan={false}
          target={[0, 0, 0]}
          minDistance={6}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
      <div
        className={
          "pointer-events-none absolute bottom-3.5 left-3.5 flex items-center gap-3 rounded-lg border border-border bg-background/85 px-3 py-2 text-[13px] text-muted-foreground backdrop-blur transition-opacity " +
          (info ? "opacity-100" : "opacity-0")
        }
      >
        {info && (
          <>
            <span className="rounded-md bg-primary px-2.5 py-0.5 text-[15px] font-bold text-primary-foreground">
              {keyLabel(info.char)}
            </span>
            <span className="text-foreground">{info.finger_long}</span>
            <span className="tabular-nums">
              {(info.freq * 100).toFixed(2)}% of keystrokes
            </span>
          </>
        )}
      </div>
    </div>
  );
}
