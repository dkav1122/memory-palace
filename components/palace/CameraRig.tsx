"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OVERVIEW_POSE, pathXZ, terrainHeight, WAYPOINTS } from "@/lib/palace";

/**
 * Camera on rails: damps position and look-target toward the pose for the
 * current waypoint. Starting the Canvas camera at the overview pose gives a
 * free fly-in on mount.
 *
 * When overShoulder is set, the rig pulls back/higher and aims slightly toward
 * the path so the walking avatar stays in frame without free-roam.
 */
export function CameraRig({
	index,
	overShoulder = false,
}: {
	index: number;
	overShoulder?: boolean;
}) {
	const lookTarget = useRef(new THREE.Vector3(...OVERVIEW_POSE.target));
	const desiredPos = useRef(new THREE.Vector3());
	const desiredTarget = useRef(new THREE.Vector3());

	useFrame((state, delta) => {
		const waypoint = WAYPOINTS[index];

		if (overShoulder) {
			const p = pathXZ(index);
			const prev = pathXZ(index - 0.35);
			const next = pathXZ(index + 0.2);
			let dx = next.x - prev.x;
			let dz = next.z - prev.z;
			const len = Math.hypot(dx, dz) || 1;
			dx /= len;
			dz /= len;
			// Behind the player on the path, elevated for an over-shoulder view.
			const camX = p.x - dx * 7.5;
			const camZ = p.z - dz * 7.5;
			desiredPos.current.set(
				camX,
				terrainHeight(camX, camZ) + 4.2,
				camZ,
			);
			// Look past the player toward the billboard so both stay framed.
			desiredTarget.current.set(
				waypoint.billboardPos[0] * 0.55 + p.x * 0.45,
				waypoint.billboardPos[1] * 0.65 + (terrainHeight(p.x, p.z) + 1.4) * 0.35,
				waypoint.billboardPos[2] * 0.55 + p.z * 0.45,
			);
		} else {
			desiredPos.current.set(...waypoint.cameraPos);
			desiredTarget.current.set(...waypoint.cameraTarget);
		}

		const t = 1 - Math.exp(-2.2 * delta);
		state.camera.position.lerp(desiredPos.current, t);
		lookTarget.current.lerp(desiredTarget.current, t);
		state.camera.lookAt(lookTarget.current);
	});

	return null;
}
