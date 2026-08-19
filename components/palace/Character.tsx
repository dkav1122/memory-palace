"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CharacterAppearance } from "@/lib/character";
import { pathXZ, terrainHeight, WAYPOINTS } from "@/lib/palace";

/**
 * Low-poly walker on the path. Position lerps between waypoint stops so it
 * stays in frame with the third-person CameraRig. Built from primitives —
 * public/models has no humanoid assets.
 */
export function Character({
	index,
	appearance,
}: {
	index: number;
	appearance: CharacterAppearance;
}) {
	const group = useRef<THREE.Group>(null);
	const pos = useRef(new THREE.Vector3());
	const target = useRef(new THREE.Vector3());
	const facing = useRef(new THREE.Vector3(0, 0, -1));
	const look = useRef(new THREE.Vector3());

	const mats = useMemo(
		() => ({
			skin: new THREE.MeshStandardMaterial({
				color: appearance.skin,
				roughness: 0.85,
			}),
			hair: new THREE.MeshStandardMaterial({
				color: appearance.hair,
				roughness: 0.9,
			}),
			shirt: new THREE.MeshStandardMaterial({
				color: appearance.shirt,
				roughness: 0.75,
			}),
			pants: new THREE.MeshStandardMaterial({
				color: appearance.pants,
				roughness: 0.8,
			}),
		}),
		[appearance.skin, appearance.hair, appearance.shirt, appearance.pants],
	);

	useFrame((_, delta) => {
		const g = group.current;
		if (!g) return;

		const waypoint = WAYPOINTS[index] ?? WAYPOINTS[0];
		const [px, , pz] = waypoint.pathPos;
		target.current.set(px, terrainHeight(px, pz), pz);

		const t = 1 - Math.exp(-3.2 * delta);
		pos.current.lerp(target.current, t);

		// Face along the path toward the next stop (or billboard side of travel).
		const along = pathXZ(index + 0.35);
		facing.current.set(along.x - pos.current.x, 0, along.z - pos.current.z);
		if (facing.current.lengthSq() > 1e-6) {
			facing.current.normalize();
			look.current.copy(pos.current).add(facing.current);
			g.lookAt(look.current.x, pos.current.y, look.current.z);
		}

		g.position.copy(pos.current);
		g.scale.setScalar(appearance.scale);
	});

	return (
		<group ref={group} castShadow>
			{/* legs */}
			<mesh
				castShadow
				position={[-0.14, 0.42, 0]}
				material={mats.pants}
			>
				<capsuleGeometry args={[0.11, 0.48, 4, 8]} />
			</mesh>
			<mesh
				castShadow
				position={[0.14, 0.42, 0]}
				material={mats.pants}
			>
				<capsuleGeometry args={[0.11, 0.48, 4, 8]} />
			</mesh>
			{/* torso */}
			<mesh castShadow position={[0, 1.05, 0]} material={mats.shirt}>
				<capsuleGeometry args={[0.28, 0.55, 4, 10]} />
			</mesh>
			{/* arms */}
			<mesh
				castShadow
				position={[-0.4, 1.05, 0]}
				rotation={[0, 0, 0.18]}
				material={mats.shirt}
			>
				<capsuleGeometry args={[0.08, 0.42, 4, 8]} />
			</mesh>
			<mesh
				castShadow
				position={[0.4, 1.05, 0]}
				rotation={[0, 0, -0.18]}
				material={mats.shirt}
			>
				<capsuleGeometry args={[0.08, 0.42, 4, 8]} />
			</mesh>
			{/* head */}
			<mesh castShadow position={[0, 1.62, 0]} material={mats.skin}>
				<sphereGeometry args={[0.22, 16, 12]} />
			</mesh>
			{/* hair */}
			<mesh castShadow position={[0, 1.78, -0.02]} material={mats.hair}>
				<sphereGeometry args={[0.2, 12, 10]} />
			</mesh>
		</group>
	);
}
