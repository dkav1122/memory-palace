"use client";

import { Suspense, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { Waypoint } from "@/lib/palace";

const PHOTO_SIZE = 2.6;
const FRAME_SIZE = PHOTO_SIZE + 0.35;

function PhotoPlane({ url }: { url: string }) {
	const texture = useLoader(THREE.TextureLoader, url);
	return (
		<mesh position={[0, 0, 0.08]}>
			<planeGeometry args={[PHOTO_SIZE, PHOTO_SIZE]} />
			<meshBasicMaterial
				map={texture}
				map-colorSpace={THREE.SRGBColorSpace}
				toneMapped={false}
			/>
		</mesh>
	);
}

function QuestionPlane() {
	const texture = useMemo(() => {
		const canvas = document.createElement("canvas");
		canvas.width = 256;
		canvas.height = 256;
		const ctx = canvas.getContext("2d")!;
		ctx.fillStyle = "#1c2430";
		ctx.fillRect(0, 0, 256, 256);
		ctx.fillStyle = "#8fa3bd";
		ctx.font = "bold 150px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("?", 128, 140);
		const tex = new THREE.CanvasTexture(canvas);
		tex.colorSpace = THREE.SRGBColorSpace;
		return tex;
	}, []);
	return (
		<mesh position={[0, 0, 0.08]}>
			<planeGeometry args={[PHOTO_SIZE, PHOTO_SIZE]} />
			<meshBasicMaterial map={texture} toneMapped={false} />
		</mesh>
	);
}

export function PhotoBillboard({
	waypoint,
	url,
	revealed,
}: {
	waypoint: Waypoint | undefined;
	url: string;
	revealed: boolean;
}) {
	if (!waypoint) return null;
	const [x, y, z] = waypoint.billboardPos;
	const groundY = y - 2.6;

	return (
		<group>
			{/* stand (doesn't rotate with the billboard) */}
			<mesh position={[x, (groundY + y) / 2 - 0.6, z]} castShadow>
				<cylinderGeometry args={[0.09, 0.13, y - groundY, 6]} />
				<meshStandardMaterial color="#4a3826" flatShading />
			</mesh>
			<Billboard position={[x, y, z]}>
				<mesh castShadow>
					<boxGeometry args={[FRAME_SIZE, FRAME_SIZE, 0.12]} />
					<meshStandardMaterial color="#3b2f22" flatShading />
				</mesh>
				{revealed ? (
					<Suspense fallback={<QuestionPlane />}>
						<PhotoPlane url={url} />
					</Suspense>
				) : (
					<QuestionPlane />
				)}
			</Billboard>
		</group>
	);
}
