"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { pathXZ, terrainHeight } from "@/lib/palace";
import { appearanceById, type AppearanceId } from "@/lib/player";

/**
 * Low-poly third-person follower. Damps along pathXZ toward the current
 * waypoint index (same rate as CameraRig) and plays a simple walk cycle
 * while moving. No external character assets required.
 */
export function PlayerAvatar({
	index,
	name,
	appearance,
}: {
	index: number;
	name: string;
	appearance: AppearanceId;
}) {
	const group = useRef<THREE.Group>(null);
	const leftArm = useRef<THREE.Mesh>(null);
	const rightArm = useRef<THREE.Mesh>(null);
	const leftLeg = useRef<THREE.Mesh>(null);
	const rightLeg = useRef<THREE.Mesh>(null);
	const tRef = useRef(index);
	const phase = useRef(0);

	const colors = useMemo(() => appearanceById(appearance), [appearance]);

	useFrame((_, delta) => {
		const damp = 1 - Math.exp(-2.2 * delta);
		const prev = tRef.current;
		tRef.current += (index - tRef.current) * damp;
		const speed = Math.abs(tRef.current - prev) / Math.max(delta, 1e-4);
		const moving = speed > 0.05;

		const t = tRef.current;
		const p = pathXZ(t);
		const ahead = pathXZ(t + 0.15);
		const y = terrainHeight(p.x, p.z);
		const yaw = Math.atan2(ahead.x - p.x, ahead.z - p.z);

		const g = group.current;
		if (g) {
			g.position.set(p.x, y, p.z);
			g.rotation.y = yaw;
		}

		if (moving) {
			phase.current += delta * Math.min(12, 4 + speed * 3);
		} else {
			// Ease limbs back toward idle.
			phase.current *= 1 - Math.min(1, delta * 4);
		}

		const swing = Math.sin(phase.current) * (moving ? 0.7 : 0.05);
		if (leftArm.current) leftArm.current.rotation.x = swing;
		if (rightArm.current) rightArm.current.rotation.x = -swing;
		if (leftLeg.current) leftLeg.current.rotation.x = -swing;
		if (rightLeg.current) rightLeg.current.rotation.x = swing;
	});

	return (
		<group ref={group} castShadow>
			{/* body */}
			<mesh position={[0, 1.05, 0]} castShadow>
				<capsuleGeometry args={[0.28, 0.55, 4, 8]} />
				<meshStandardMaterial color={colors.shirt} roughness={0.85} />
			</mesh>
			{/* head */}
			<mesh position={[0, 1.72, 0]} castShadow>
				<sphereGeometry args={[0.22, 12, 12]} />
				<meshStandardMaterial color={colors.skin} roughness={0.7} />
			</mesh>
			{/* hair cap */}
			<mesh position={[0, 1.86, -0.02]} castShadow>
				<sphereGeometry args={[0.2, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
				<meshStandardMaterial color={colors.hair} roughness={0.9} />
			</mesh>
			{/* arms */}
			<mesh ref={leftArm} position={[-0.4, 1.2, 0]} castShadow>
				<capsuleGeometry args={[0.08, 0.35, 3, 6]} />
				<meshStandardMaterial color={colors.skin} roughness={0.75} />
			</mesh>
			<mesh ref={rightArm} position={[0.4, 1.2, 0]} castShadow>
				<capsuleGeometry args={[0.08, 0.35, 3, 6]} />
				<meshStandardMaterial color={colors.skin} roughness={0.75} />
			</mesh>
			{/* legs */}
			<mesh ref={leftLeg} position={[-0.14, 0.45, 0]} castShadow>
				<capsuleGeometry args={[0.1, 0.4, 3, 6]} />
				<meshStandardMaterial color={colors.pants} roughness={0.9} />
			</mesh>
			<mesh ref={rightLeg} position={[0.14, 0.45, 0]} castShadow>
				<capsuleGeometry args={[0.1, 0.4, 3, 6]} />
				<meshStandardMaterial color={colors.pants} roughness={0.9} />
			</mesh>
			{/* nameplate */}
			<Html
				position={[0, 2.15, 0]}
				center
				distanceFactor={10}
				style={{ pointerEvents: "none", userSelect: "none" }}
			>
				<div className="rounded bg-black/55 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white backdrop-blur-sm">
					{name}
				</div>
			</Html>
		</group>
	);
}
