"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { terrainHeight, WAYPOINTS } from "@/lib/palace";
import type { AvatarPose } from "./PlayerAvatar";

const LERP = 2.2;
const CAM_BEHIND = 9;
const CAM_HEIGHT = 3.4;

/**
 * Third-person follow camera: tracks behind the player avatar along the path
 * and looks toward the current waypoint's billboard. Starting the Canvas
 * camera at the overview pose gives a free fly-in on mount.
 */
export function CameraRig({
	index,
	poseRef,
}: {
	index: number;
	poseRef: React.MutableRefObject<AvatarPose>;
}) {
	const lookTarget = useRef(new THREE.Vector3());
	const desiredPos = useRef(new THREE.Vector3());
	const desiredTarget = useRef(new THREE.Vector3());

	useFrame((state, delta) => {
		const { position, forward } = poseRef.current;
		const waypoint = WAYPOINTS[index];

		const camX = position.x - forward.x * CAM_BEHIND;
		const camZ = position.z - forward.z * CAM_BEHIND;
		desiredPos.current.set(
			camX,
			terrainHeight(camX, camZ) + CAM_HEIGHT,
			camZ,
		);
		desiredTarget.current.set(...waypoint.cameraTarget);

		const t = 1 - Math.exp(-LERP * delta);
		state.camera.position.lerp(desiredPos.current, t);
		lookTarget.current.lerp(desiredTarget.current, t);
		state.camera.lookAt(lookTarget.current);
	});

	return null;
}
