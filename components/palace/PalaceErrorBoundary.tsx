"use client";

import { Component, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	onError: () => void;
}

interface State {
	hasError: boolean;
}

/**
 * Catches uncaught R3F / Suspense / loader failures so a mid-walk crash
 * shows a retry UI instead of whitening out the whole page.
 */
export class PalaceErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	componentDidCatch(): void {
		this.props.onError();
	}

	render() {
		if (this.state.hasError) return null;
		return this.props.children;
	}
}
