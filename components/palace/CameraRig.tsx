"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OVERVIEW_POSE, WAYPOINTS } from "@/lib/palace";

/**
 * Camera on rails: damps position and look-target toward the pose for the
 * current waypoint. Starting the Canvas camera at the overview pose gives a
 * free fly-in on mount.
 */
export function CameraRig({ index }: { index: number }) {
	const lookTarget = useRef(new THREE.Vector3(...OVERVIEW_POSE.target));
	const desiredPos = useRef(new THREE.Vector3());
	const desiredTarget = useRef(new THREE.Vector3());

	useFrame((state, delta) => {
		const waypoint = WAYPOINTS[index];
		if (!waypoint) return;
		desiredPos.current.set(...waypoint.cameraPos);
		desiredTarget.current.set(...waypoint.cameraTarget);

		const t = 1 - Math.exp(-2.2 * delta);
		state.camera.position.lerp(desiredPos.current, t);
		lookTarget.current.lerp(desiredTarget.current, t);
		state.camera.lookAt(lookTarget.current);
	});

	return null;
}
