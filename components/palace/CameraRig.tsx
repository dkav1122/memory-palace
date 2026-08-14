"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OVERVIEW_POSE, WAYPOINTS } from "@/lib/palace";

/**
 * Third-person camera on rails: sits behind the path walker and looks toward
 * the billboard so both the character and the locus image stay in frame.
 */
export function CameraRig({ index }: { index: number }) {
	const lookTarget = useRef(new THREE.Vector3(...OVERVIEW_POSE.target));
	const desiredPos = useRef(new THREE.Vector3());
	const desiredTarget = useRef(new THREE.Vector3());
	const path = useRef(new THREE.Vector3());
	const forward = useRef(new THREE.Vector3());

	useFrame((state, delta) => {
		const waypoint = WAYPOINTS[index];
		path.current.set(...waypoint.pathPos);

		// Path tangent from stored cameraPose (already behind path along travel).
		forward.current
			.set(
				waypoint.pathPos[0] - waypoint.cameraPos[0],
				0,
				waypoint.pathPos[2] - waypoint.cameraPos[2],
			)
			.normalize();

		// Pull further back and up than the old first-person rail so the walker
		// at pathPos is clearly visible while still facing the billboard.
		desiredPos.current
			.copy(path.current)
			.addScaledVector(forward.current, -11)
			.setY(path.current.y + 4.6);

		const [bx, by, bz] = waypoint.cameraTarget;
		// Bias the look target slightly toward the character so framing stays
		// third-person rather than cropping them out of the lower edge.
		desiredTarget.current.set(
			path.current.x * 0.35 + bx * 0.65,
			path.current.y + 1.4 * 0.35 + by * 0.65,
			path.current.z * 0.35 + bz * 0.65,
		);

		const t = 1 - Math.exp(-2.2 * delta);
		state.camera.position.lerp(desiredPos.current, t);
		lookTarget.current.lerp(desiredTarget.current, t);
		state.camera.lookAt(lookTarget.current);
	});

	return null;
}
