"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
	Environment,
	Instance,
	Instances,
	Sky,
	useGLTF,
	useTexture,
} from "@react-three/drei";
import {
	Bloom,
	EffectComposer,
	N8AO,
	ToneMapping,
	Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import {
	OVERVIEW_POSE,
	pathXZ,
	terrainHeight,
	TOTAL_WAYPOINTS,
	WAYPOINTS,
	type Waypoint,
} from "@/lib/palace";
import { mulberry32 } from "@/lib/rng";
import { Landmarks } from "./Landmarks";
import { PhotoBillboard } from "./PhotoBillboard";
import { CameraRig } from "./CameraRig";
import { FitModel } from "./FitModel";
import { PalaceErrorBoundary } from "./PalaceErrorBoundary";

const SUN_DIR = new THREE.Vector3(80, 120, -200).normalize();
const SUN_DIST = 140;

/**
 * Shadow-casting sun that follows the camera. The world is ~1000 units long,
 * so a single static shadow camera would be far too coarse — instead a tight
 * ortho frustum tracks the player along the path.
 */
function Sun() {
	const lightRef = useRef<THREE.DirectionalLight>(null);
	const targetRef = useRef<THREE.Object3D>(null);

	useEffect(() => {
		if (lightRef.current && targetRef.current) {
			lightRef.current.target = targetRef.current;
		}
	}, []);

	useFrame(({ camera }) => {
		const light = lightRef.current;
		const target = targetRef.current;
		if (!light || !target) return;
		target.position.set(camera.position.x, 0, camera.position.z - 14);
		light.position.copy(target.position).addScaledVector(SUN_DIR, SUN_DIST);
		target.updateMatrixWorld();
	});

	return (
		<>
			<object3D ref={targetRef} />
			<directionalLight
				ref={lightRef}
				castShadow
				intensity={3.2}
				color="#fff2dc"
				shadow-mapSize={[2048, 2048]}
				shadow-camera-left={-55}
				shadow-camera-right={55}
				shadow-camera-top={55}
				shadow-camera-bottom={-55}
				shadow-camera-near={20}
				shadow-camera-far={340}
				shadow-bias={-0.0002}
				shadow-normalBias={0.1}
			/>
		</>
	);
}

// Stable module-level onLoad callback: drei re-runs it whenever its identity
// changes, and mutating textures here keeps react-hooks/immutability happy.
function configureGrassTextures(textures: {
	map: THREE.Texture;
	normalMap: THREE.Texture;
}) {
	for (const tex of Object.values(textures)) {
		tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
		tex.repeat.set(45, 132);
		tex.anisotropy = 8;
	}
	textures.map.colorSpace = THREE.SRGBColorSpace;
}

function Terrain() {
	const geometry = useMemo(() => {
		const geo = new THREE.PlaneGeometry(360, 1060, 90, 240);
		geo.rotateX(-Math.PI / 2);
		geo.translate(0, 0, -380);
		const pos = geo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
		}
		geo.computeVertexNormals();
		return geo;
	}, []);

	const textures = useTexture(
		{
			map: "/textures/grass_color.jpg",
			normalMap: "/textures/grass_normal.jpg",
		},
		configureGrassTextures,
	);

	return (
		<mesh geometry={geometry} receiveShadow>
			<meshStandardMaterial {...textures} roughness={1} metalness={0} />
		</mesh>
	);
}

/** Dirt ribbon mesh draped over the terrain along the walking path. */
function DirtPath() {
	const geometry = useMemo(() => {
		const HALF = 1.35;
		const positions: number[] = [];
		const uvs: number[] = [];
		const indices: number[] = [];
		let row = 0;
		for (let t = -1; t <= TOTAL_WAYPOINTS + 0.5; t += 0.25, row++) {
			const p = pathXZ(t);
			const a = pathXZ(t - 0.1);
			const b = pathXZ(t + 0.1);
			let dx = b.x - a.x;
			let dz = b.z - a.z;
			const len = Math.hypot(dx, dz) || 1;
			dx /= len;
			dz /= len;
			for (const s of [-1, 1]) {
				const x = p.x + -dz * s * HALF;
				const z = p.z + dx * s * HALF;
				positions.push(x, terrainHeight(x, z) + 0.12, z);
				uvs.push(s * 0.5 + 0.5, t * 5.5);
			}
			if (row > 0) {
				const i = row * 2;
				indices.push(i - 2, i - 1, i, i - 1, i + 1, i);
			}
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(positions, 3),
		);
		geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
		geo.setIndex(indices);
		geo.computeVertexNormals();
		return geo;
	}, []);

	const textures = useTexture({
		map: "/textures/dirt_color.jpg",
		normalMap: "/textures/dirt_normal.jpg",
	});
	useMemo(() => {
		for (const tex of Object.values(textures)) {
			tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
			tex.anisotropy = 8;
		}
		textures.map.colorSpace = THREE.SRGBColorSpace;
	}, [textures]);

	return (
		<mesh geometry={geometry} receiveShadow>
			<meshStandardMaterial {...textures} roughness={1} metalness={0} />
		</mesh>
	);
}

/** Stone circles marking each waypoint on the path. */
function WaypointMarkers({ waypoints }: { waypoints: Waypoint[] }) {
	return (
		<>
			{waypoints.map(w => (
				<FitModel
					key={w.index}
					url="/models/nature/path_stoneCircle.glb"
					size={2.4}
					position={[w.pathPos[0], w.pathPos[1] + 0.08, w.pathPos[2]]}
				/>
			))}
		</>
	);
}

function preferDegradedGraphics(): boolean {
	if (typeof navigator === "undefined") return false;
	const cores = navigator.hardwareConcurrency || 8;
	const memory = (navigator as Navigator & { deviceMemory?: number })
		.deviceMemory;
	const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
	return mobile || cores <= 4 || (memory !== undefined && memory <= 4);
}

/** Listens for GPU context loss inside the Canvas and notifies the parent. */
function WebGLContextGuard({ onLost }: { onLost: () => void }) {
	const gl = useThree(s => s.gl);
	useEffect(() => {
		const el = gl.domElement;
		const handleLost = (e: Event) => {
			e.preventDefault();
			onLost();
		};
		el.addEventListener("webglcontextlost", handleLost);
		return () => el.removeEventListener("webglcontextlost", handleLost);
	}, [gl, onLost]);
	return null;
}

function RecoveryScreen({
	reason,
	onRetry,
}: {
	reason: "error" | "context";
	onRetry: () => void;
}) {
	return (
		<div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-[#0b0f14] px-6 text-center">
			<h2 className="text-xl font-semibold text-white">
				{reason === "context"
					? "Graphics context was lost"
					: "Something went wrong in the palace"}
			</h2>
			<p className="max-w-md text-sm text-zinc-400">
				The walk can continue with lighter graphics. Your progress is kept —
				retry to remount the scene.
			</p>
			<button
				type="button"
				onClick={onRetry}
				className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
			>
				Retry with safer graphics
			</button>
		</div>
	);
}

/** Instanced grass tufts scattered near the trail. */
function GrassTufts() {
	const { scene } = useGLTF("/models/nature/grass_leafs.glb");
	const { geometry, material, baseScale } = useMemo(() => {
		let mesh: THREE.Mesh | undefined;
		scene.traverse(o => {
			if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh;
		});
		const geo = mesh!.geometry;
		geo.computeBoundingBox();
		const h = geo.boundingBox!.max.y - geo.boundingBox!.min.y || 1;
		// Custom material so the tufts match the grass texture rather than the
		// teal Kenney palette.
		const mat = new THREE.MeshStandardMaterial({
			color: "#7fa64f",
			roughness: 1,
		});
		return { geometry: geo, material: mat, baseScale: 0.45 / h };
	}, [scene]);

	const tufts = useMemo(() => {
		const rand = mulberry32(4242);
		const result: { pos: [number, number, number]; rot: number; scale: number }[] =
			[];
		for (let i = 0; i < 1800; i++) {
			const t = rand() * (TOTAL_WAYPOINTS + 1.5) - 1;
			const a = pathXZ(t - 0.3);
			const b = pathXZ(t + 0.3);
			let dx = b.x - a.x;
			let dz = b.z - a.z;
			const len = Math.hypot(dx, dz) || 1;
			dx /= len;
			dz /= len;
			const side = rand() < 0.5 ? -1 : 1;
			const off = 1.9 + Math.pow(rand(), 1.6) * 16;
			const p = pathXZ(t);
			const x = p.x + -dz * side * off;
			const z = p.z + dx * side * off;
			result.push({
				pos: [x, terrainHeight(x, z), z],
				rot: rand() * Math.PI * 2,
				scale: baseScale * (0.7 + rand() * 0.9),
			});
		}
		return result;
	}, [baseScale]);

	return (
		<Instances
			geometry={geometry}
			material={material}
			limit={tufts.length}
			receiveShadow
			frustumCulled={false}
		>
			{tufts.map((t, i) => (
				<Instance key={i} position={t.pos} rotation-y={t.rot} scale={t.scale} />
			))}
		</Instances>
	);
}

/** Distant scatter trees for depth — decorative only, kept far from the path. */
function ScatterTrees() {
	const trees = useMemo(() => {
		const rand = mulberry32(777);
		const result: { pos: [number, number, number]; size: number; variant: number }[] =
			[];
		for (let i = 0; i < 90; i++) {
			const z = -rand() * 880 + 20;
			const side = rand() < 0.5 ? -1 : 1;
			const x = side * (55 + rand() * 90);
			result.push({
				pos: [x, terrainHeight(x, z), z],
				size: 4 + rand() * 4,
				variant: rand() < 0.5 ? 0 : 1,
			});
		}
		return result;
	}, []);

	return (
		<>
			{trees.map((t, i) => (
				<FitModel
					key={i}
					url={
						t.variant === 0
							? "/models/nature/tree_pineRoundA.glb"
							: "/models/nature/tree_pineRoundC.glb"
					}
					size={t.size}
					position={t.pos}
				/>
			))}
		</>
	);
}

export interface BillboardState {
	/** cardId at this waypoint */
	cardId: string;
	url: string;
	revealed: boolean;
}

export function PalaceScene({
	billboards,
	index,
}: {
	/** one entry per waypoint in play (order.length entries) */
	billboards: BillboardState[];
	index: number;
}) {
	const [canvasKey, setCanvasKey] = useState(0);
	const [degraded, setDegraded] = useState(preferDegradedGraphics);
	const [failure, setFailure] = useState<null | "error" | "context">(null);

	const activeWaypoints = useMemo(
		() => WAYPOINTS.slice(0, Math.max(billboards.length, 1)),
		[billboards.length],
	);

	const handleLost = useCallback(() => {
		setDegraded(true);
		setFailure("context");
	}, []);

	const handleError = useCallback(() => {
		setDegraded(true);
		setFailure("error");
	}, []);

	const retry = useCallback(() => {
		setDegraded(true);
		setFailure(null);
		setCanvasKey(k => k + 1);
	}, []);

	if (failure) {
		return <RecoveryScreen reason={failure} onRetry={retry} />;
	}

	return (
		<PalaceErrorBoundary key={canvasKey} onError={handleError}>
			<Canvas
				shadows={!degraded}
				dpr={degraded ? [1, 1.25] : [1, 2]}
				camera={{
					fov: 55,
					near: 0.1,
					far: 900,
					position: OVERVIEW_POSE.position,
				}}
				className="!absolute inset-0"
			>
				<WebGLContextGuard onLost={handleLost} />
				<Sky sunPosition={[80, 120, -200]} turbidity={6} />
				<fog attach="fog" args={["#cfe3f2", 60, 420]} />
				{/* The HDRI has a bright sun disk baked in, so keep its intensity low —
				    otherwise it double-lights the scene and washes out the sun shadows. */}
				<Environment files="/hdri/sky_1k.hdr" environmentIntensity={0.2} />
				{degraded ? (
					<ambientLight intensity={0.85} />
				) : (
					<Sun />
				)}
				{degraded && (
					<directionalLight
						position={[80, 120, -200]}
						intensity={2.2}
						color="#fff2dc"
					/>
				)}

				<Suspense fallback={null}>
					<Terrain />
					<DirtPath />
					<WaypointMarkers waypoints={activeWaypoints} />
					{!degraded && <GrassTufts />}
					{!degraded && <ScatterTrees />}
					<Landmarks waypoints={activeWaypoints} />
				</Suspense>

				{billboards.map((b, i) => (
					<PhotoBillboard
						key={`${i}-${b.cardId}`}
						waypoint={WAYPOINTS[i]}
						url={b.url}
						revealed={b.revealed}
					/>
				))}

				<CameraRig index={index} />

				{degraded ? (
					<EffectComposer multisampling={0}>
						<Vignette eskil={false} offset={0.25} darkness={0.45} />
						<ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
					</EffectComposer>
				) : (
					<EffectComposer multisampling={4}>
						<N8AO aoRadius={2} intensity={2.5} distanceFalloff={1} halfRes />
						<Bloom mipmapBlur luminanceThreshold={1.1} intensity={0.5} />
						<Vignette eskil={false} offset={0.25} darkness={0.5} />
						<ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
					</EffectComposer>
				)}
			</Canvas>
		</PalaceErrorBoundary>
	);
}
