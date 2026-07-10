"use client";

import { useMemo } from "react";
import { Clone, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";

/**
 * Clone of a glTF scene, uniformly scaled so its largest bounding-box
 * dimension measures `size`, and lifted so it sits on y=0. The asset kits we
 * pull models from (Kenney nature/hexagon/town) all use different unit
 * scales, so normalizing by bounding box keeps scene proportions predictable.
 * Fitting the largest dimension (rather than height) behaves sanely for both
 * tall models (trees) and flat ones (rocks, stone circles).
 */
export function FitModel({
	url,
	size,
	...groupProps
}: {
	url: string;
	size: number;
} & ThreeElements["group"]) {
	const { scene } = useGLTF(url);
	const { scale, lift } = useMemo(() => {
		const box = new THREE.Box3().setFromObject(scene);
		const dims = new THREE.Vector3();
		box.getSize(dims);
		const s = size / (Math.max(dims.x, dims.y, dims.z) || 1);
		return { scale: s, lift: -box.min.y * s };
	}, [scene, size]);

	return (
		<group {...groupProps}>
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
