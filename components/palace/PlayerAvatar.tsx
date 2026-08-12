"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Clone, useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { pathPoint, pathXZ } from "@/lib/palace";

const MODEL_URL = "/models/character/player.glb";
const TARGET_HEIGHT = 1.65;
const LERP = 2.2;

useGLTF.preload(MODEL_URL);

export type AvatarPose = {
	position: THREE.Vector3;
	forward: THREE.Vector3;
	moving: boolean;
};

export function createAvatarPose(): AvatarPose {
	return {
		position: new THREE.Vector3(),
		forward: new THREE.Vector3(0, 0, -1),
		moving: false,
	};
}

/**
 * CC0 Kenney blocky character that walks the palace path in sync with the
 * camera rig. Exposes its live pose via `poseRef` so CameraRig can follow.
 */
export function PlayerAvatar({
	index,
	poseRef,
}: {
	index: number;
	poseRef: React.MutableRefObject<AvatarPose>;
}) {
	const rootRef = useRef<THREE.Group>(null);
	const pathT = useRef(index);
	const { scene, animations } = useGLTF(MODEL_URL);
	const { actions, mixer } = useAnimations(animations, rootRef);

	const { scale, lift } = useMemo(() => {
		const box = new THREE.Box3().setFromObject(scene);
		const h = box.max.y - box.min.y || 1;
		const s = TARGET_HEIGHT / h;
		return { scale: s, lift: -box.min.y * s };
	}, [scene]);

	useEffect(() => {
		actions.idle?.reset().fadeIn(0.2).play();
		actions.walk?.reset().fadeIn(0.2).play();
		return () => {
			actions.idle?.fadeOut(0.2);
			actions.walk?.fadeOut(0.2);
		};
	}, [actions]);

	useFrame((_, delta) => {
		const t = 1 - Math.exp(-LERP * delta);
		pathT.current += (index - pathT.current) * t;

		const pos = pathPoint(pathT.current);
		const a = pathXZ(pathT.current - 0.1);
		const b = pathXZ(pathT.current + 0.1);
		let dx = b.x - a.x;
		let dz = b.z - a.z;
		const len = Math.hypot(dx, dz) || 1;
		dx /= len;
		dz /= len;

		const moving = Math.abs(index - pathT.current) > 0.015;

		if (rootRef.current) {
			rootRef.current.position.set(pos[0], pos[1], pos[2]);
			rootRef.current.lookAt(pos[0] + dx, pos[1], pos[2] + dz);
		}

		poseRef.current.position.set(pos[0], pos[1], pos[2]);
		poseRef.current.forward.set(dx, 0, dz);
		poseRef.current.moving = moving;

		if (actions.walk && actions.idle) {
			const walkW = moving ? 1 : 0;
			const idleW = 1 - walkW;
			actions.walk.setEffectiveWeight(
				THREE.MathUtils.lerp(actions.walk.getEffectiveWeight(), walkW, t),
			);
			actions.idle.setEffectiveWeight(
				THREE.MathUtils.lerp(actions.idle.getEffectiveWeight(), idleW, t),
			);
		}
		mixer?.update(delta);
	});

	return (
		<group ref={rootRef}>
			<Clone
				object={scene}
				scale={scale}
				position={[0, lift, 0]}
				castShadow
				receiveShadow
			/>
		</group>
	);
}
