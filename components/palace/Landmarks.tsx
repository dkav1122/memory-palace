"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { mulberry32 } from "@/lib/rng";
import type { LandmarkType, Waypoint } from "@/lib/palace";
import {
	DEFAULT_PALACE_THEME,
	THEME_MODEL_ROOTS,
	type PalaceThemeId,
} from "@/lib/palaceThemes";
import { FitModel } from "./FitModel";

/**
 * 13 landmark types built from CC0 glTF models (Kenney nature / hexagon /
 * fantasy-town kits). Each of the 52 waypoints gets one, with seeded cosmetic
 * variation (scale/rotation) so every locus is visually distinct — the
 * player's job is to remember these places. City theme remaps the same slots
 * onto town props so the route stays familiar while the setting changes.
 */

const { NATURE, HEXAGON, TOWN } = THEME_MODEL_ROOTS;

const MODEL_URLS = [
	`${NATURE}/tree_oak.glb`,
	`${NATURE}/tree_pineTallA_detailed.glb`,
	`${NATURE}/tree_pineTallB_detailed.glb`,
	`${NATURE}/rock_largeA.glb`,
	`${NATURE}/rock_largeE.glb`,
	`${NATURE}/stone_tallB.glb`,
	`${NATURE}/campfire_logs.glb`,
	`${NATURE}/campfire_stones.glb`,
	`${NATURE}/lily_large.glb`,
	`${NATURE}/lily_small.glb`,
	`${NATURE}/flower_purpleA.glb`,
	`${NATURE}/flower_redA.glb`,
	`${NATURE}/flower_yellowA.glb`,
	`${NATURE}/statue_obelisk.glb`,
	`${NATURE}/statue_ring.glb`,
	`${NATURE}/log_stackLarge.glb`,
	`${NATURE}/plant_bush.glb`,
	`${HEXAGON}/unit-house.glb`,
	`${HEXAGON}/unit-mill.glb`,
	`${TOWN}/fountain-round.glb`,
	`${TOWN}/fountain-center.glb`,
	`${TOWN}/windmill.glb`,
	`${TOWN}/blade.glb`,
];
MODEL_URLS.forEach(url => useGLTF.preload(url));

function Campfire() {
	return (
		<group>
			<FitModel url={`${NATURE}/campfire_stones.glb`} size={1.7} />
			<FitModel url={`${NATURE}/campfire_logs.glb`} size={1.4} />
			<mesh position={[0, 0.75, 0]}>
				<coneGeometry args={[0.35, 1.0, 5]} />
				<meshStandardMaterial
					color="#ffb347"
					emissive="#ff6a00"
					emissiveIntensity={3}
					flatShading
					toneMapped={false}
				/>
			</mesh>
			<pointLight
				position={[0, 1.4, 0]}
				color="#ff9147"
				intensity={14}
				distance={14}
				decay={2}
			/>
		</group>
	);
}

function Pond() {
	return (
		<group>
			<mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<circleGeometry args={[3, 28]} />
				<meshStandardMaterial
					color="#2e6f9e"
					roughness={0.08}
					metalness={0}
					transparent
					opacity={0.92}
				/>
			</mesh>
			<FitModel
				url={`${NATURE}/lily_large.glb`}
				size={1.1}
				position={[0.9, 0.08, 0.5]}
			/>
			<FitModel
				url={`${NATURE}/lily_small.glb`}
				size={0.7}
				position={[-1.1, 0.08, -0.8]}
			/>
			<FitModel
				url={`${NATURE}/rock_largeE.glb`}
				size={1.4}
				position={[2.6, 0, 1.4]}
			/>
		</group>
	);
}

function Flowers() {
	const urls = [
		`${NATURE}/flower_purpleA.glb`,
		`${NATURE}/flower_redA.glb`,
		`${NATURE}/flower_yellowA.glb`,
	];
	return (
		<group>
			<FitModel url={`${NATURE}/plant_bush.glb`} size={0.9} />
			{[0, 1, 2, 3, 4, 5, 6].map(i => {
				const a = (i / 7) * Math.PI * 2;
				const r = 0.9 + (i % 3) * 0.5;
				return (
					<FitModel
						key={i}
						url={urls[i % urls.length]}
						size={0.8}
						position={[Math.cos(a) * r, 0, Math.sin(a) * r]}
						rotation={[0, a * 2, 0]}
					/>
				);
			})}
		</group>
	);
}

function PlazaFountain() {
	return (
		<group>
			<FitModel url={`${TOWN}/fountain-round.glb`} size={3.2} />
			<FitModel
				url={`${TOWN}/fountain-center.glb`}
				size={1.8}
				position={[0, 0.35, 0]}
			/>
		</group>
	);
}

function StreetLamp() {
	return (
		<group>
			<FitModel url={`${TOWN}/blade.glb`} size={3.5} />
			<pointLight
				position={[0, 3.2, 0]}
				color="#ffd6a0"
				intensity={10}
				distance={16}
				decay={2}
			/>
		</group>
	);
}

function NatureLandmark({ type }: { type: LandmarkType }) {
	switch (type) {
		case "oak":
			return <FitModel url={`${NATURE}/tree_oak.glb`} size={5} />;
		case "pines":
			return (
				<group>
					<FitModel url={`${NATURE}/tree_pineTallA_detailed.glb`} size={7} />
					<FitModel
						url={`${NATURE}/tree_pineTallB_detailed.glb`}
						size={5.2}
						position={[2.0, 0, 0.9]}
					/>
					<FitModel
						url={`${NATURE}/tree_pineTallA_detailed.glb`}
						size={6}
						position={[-1.7, 0, 1.3]}
						rotation={[0, 2.1, 0]}
					/>
				</group>
			);
		case "boulder":
			return (
				<group>
					<FitModel url={`${NATURE}/rock_largeA.glb`} size={3.4} />
					<FitModel
						url={`${NATURE}/rock_largeE.glb`}
						size={1.7}
						position={[2.1, 0, 0.9]}
						rotation={[0, 1.2, 0]}
					/>
				</group>
			);
		case "standingStone":
			return <FitModel url={`${NATURE}/stone_tallB.glb`} size={4} />;
		case "campfire":
			return <Campfire />;
		case "pond":
			return <Pond />;
		case "cabin":
			return <FitModel url={`${HEXAGON}/unit-house.glb`} size={4.2} />;
		case "well":
			return (
				<group>
					<FitModel url={`${TOWN}/fountain-round.glb`} size={2.8} />
					<FitModel
						url={`${TOWN}/fountain-center.glb`}
						size={1.6}
						position={[0, 0.3, 0]}
					/>
				</group>
			);
		case "arch":
			return <FitModel url={`${NATURE}/statue_ring.glb`} size={4.6} />;
		case "obelisk":
			return <FitModel url={`${NATURE}/statue_obelisk.glb`} size={5} />;
		case "flowers":
			return <Flowers />;
		case "windmill":
			return <FitModel url={`${HEXAGON}/unit-mill.glb`} size={7} />;
		case "logpile":
			return <FitModel url={`${NATURE}/log_stackLarge.glb`} size={2.6} />;
	}
}

/** Same waypoint slots, town/hexagon props — a city reading of the route. */
function CityLandmark({ type }: { type: LandmarkType }) {
	switch (type) {
		case "oak":
			return <FitModel url={`${HEXAGON}/unit-house.glb`} size={5} />;
		case "pines":
			return (
				<group>
					<FitModel url={`${HEXAGON}/unit-house.glb`} size={4.5} />
					<FitModel
						url={`${HEXAGON}/unit-house.glb`}
						size={3.8}
						position={[3.2, 0, 1.1]}
						rotation={[0, 1.1, 0]}
					/>
					<FitModel
						url={`${HEXAGON}/unit-mill.glb`}
						size={5.5}
						position={[-2.8, 0, 1.6]}
						rotation={[0, -0.7, 0]}
					/>
				</group>
			);
		case "boulder":
			return <PlazaFountain />;
		case "standingStone":
			return <StreetLamp />;
		case "campfire":
			return <StreetLamp />;
		case "pond":
			return <PlazaFountain />;
		case "cabin":
			return <FitModel url={`${HEXAGON}/unit-house.glb`} size={5.2} />;
		case "well":
			return <PlazaFountain />;
		case "arch":
			return <FitModel url={`${NATURE}/statue_ring.glb`} size={4.6} />;
		case "obelisk":
			return <FitModel url={`${NATURE}/statue_obelisk.glb`} size={5.5} />;
		case "flowers":
			return (
				<group>
					<FitModel url={`${NATURE}/plant_bush.glb`} size={1.1} />
					<FitModel
						url={`${TOWN}/fountain-center.glb`}
						size={1.4}
						position={[0, 0, 0]}
					/>
				</group>
			);
		case "windmill":
			return <FitModel url={`${TOWN}/windmill.glb`} size={8} />;
		case "logpile":
			return <FitModel url={`${HEXAGON}/unit-house.glb`} size={3.6} />;
	}
}

/** Nature landmarks with denser tree clusters for a jungle feel. */
function JungleLandmark({ type }: { type: LandmarkType }) {
	switch (type) {
		case "oak":
			return (
				<group>
					<FitModel url={`${NATURE}/tree_oak.glb`} size={6.5} />
					<FitModel
						url={`${NATURE}/tree_oak.glb`}
						size={4.5}
						position={[2.4, 0, 1.2]}
						rotation={[0, 1.4, 0]}
					/>
					<FitModel
						url={`${NATURE}/plant_bush.glb`}
						size={1.4}
						position={[-1.8, 0, 1.5]}
					/>
				</group>
			);
		case "pines":
			return (
				<group>
					<FitModel url={`${NATURE}/tree_pineTallA_detailed.glb`} size={9} />
					<FitModel
						url={`${NATURE}/tree_pineTallB_detailed.glb`}
						size={7}
						position={[2.4, 0, 1.1]}
					/>
					<FitModel
						url={`${NATURE}/tree_pineTallA_detailed.glb`}
						size={8}
						position={[-2.2, 0, 1.6]}
						rotation={[0, 2.1, 0]}
					/>
					<FitModel
						url={`${NATURE}/tree_pineTallB_detailed.glb`}
						size={5.5}
						position={[0.4, 0, 2.8]}
						rotation={[0, 0.8, 0]}
					/>
				</group>
			);
		case "flowers":
			return (
				<group>
					<Flowers />
					<FitModel
						url={`${NATURE}/plant_bush.glb`}
						size={1.3}
						position={[1.6, 0, -1.2]}
					/>
					<FitModel
						url={`${NATURE}/plant_bush.glb`}
						size={1.1}
						position={[-1.8, 0, 1.4]}
					/>
				</group>
			);
		default:
			return <NatureLandmark type={type} />;
	}
}

function LandmarkModel({
	type,
	themeId,
}: {
	type: LandmarkType;
	themeId: PalaceThemeId;
}) {
	if (themeId === "city") return <CityLandmark type={type} />;
	if (themeId === "jungle") return <JungleLandmark type={type} />;
	return <NatureLandmark type={type} />;
}

function Landmark({
	waypoint,
	themeId,
}: {
	waypoint: Waypoint;
	themeId: PalaceThemeId;
}) {
	const { landmarkType, seed } = waypoint;
	const variant = useMemo(() => {
		const rand = mulberry32(seed);
		return {
			scale: 0.85 + rand() * 0.5,
			rotation: rand() * Math.PI * 2,
		};
	}, [seed]);

	return (
		<group
			position={waypoint.landmarkPos}
			rotation={[0, variant.rotation, 0]}
			scale={variant.scale}
		>
			<LandmarkModel type={landmarkType} themeId={themeId} />
		</group>
	);
}

export function Landmarks({
	waypoints,
	themeId = DEFAULT_PALACE_THEME,
}: {
	waypoints: Waypoint[];
	themeId?: PalaceThemeId;
}) {
	return (
		<>
			{waypoints.map(w => (
				<Landmark key={w.index} waypoint={w} themeId={themeId} />
			))}
		</>
	);
}
