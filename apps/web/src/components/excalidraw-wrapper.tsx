import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useCollab } from "../lib/collab";

// Lazy-load Excalidraw (it's huge — ~2MB)
const Excalidraw = lazy(() =>
	import("@excalidraw/excalidraw").then((mod) => ({
		default: mod.Excalidraw,
	})),
);

interface ExcalidrawWrapperProps {
	boardId: string;
	readOnly?: boolean;
}

/**
 * Wraps Excalidraw with Yjs collaboration.
 * Lazy-loaded to avoid SSR/bundle issues.
 */
export function ExcalidrawWrapper({
	boardId,
	readOnly = false,
}: ExcalidrawWrapperProps) {
	const { binding, connected } = useCollab({ boardId, readOnly });
	const [excalidrawAPI, setExcalidrawAPI] = useState<
		import("@excalidraw/excalidraw/types").ExcalidrawImperativeAPI | null
	>(null);

	// Connect binding to Excalidraw API when both are ready
	useEffect(() => {
		if (binding && excalidrawAPI) {
			binding.setExcalidraw(excalidrawAPI);
		}
	}, [binding, excalidrawAPI]);

	const handleExcalidrawAPI = useCallback(
		(api: import("@excalidraw/excalidraw/types").ExcalidrawImperativeAPI) => {
			setExcalidrawAPI(api);
		},
		[],
	);

	return (
		<div style={{ height: "100vh", width: "100vw", position: "relative" }}>
			{/* Connection status indicator */}
			<div
				style={{
					position: "absolute",
					top: 8,
					right: 8,
					zIndex: 9999,
					display: "flex",
					alignItems: "center",
					gap: 6,
					padding: "4px 10px",
					borderRadius: 6,
					background: connected ? "#e8f5e9" : "#fff3e0",
					fontSize: 12,
					color: connected ? "#2e7d32" : "#e65100",
				}}
			>
				<span
					style={{
						width: 8,
						height: 8,
						borderRadius: "50%",
						background: connected ? "#4caf50" : "#ff9800",
					}}
				/>
				{connected ? "Connected" : "Connecting..."}
			</div>

			<Suspense
				fallback={
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							height: "100%",
							color: "#666",
						}}
					>
						Loading Excalidraw...
					</div>
				}
			>
				<Excalidraw
					excalidrawAPI={handleExcalidrawAPI}
					isCollaborating={connected}
					viewModeEnabled={readOnly}
					UIOptions={{
						canvasActions: {
							changeViewBackgroundColor: !readOnly,
							toggleTheme: true,
						},
					}}
				/>
			</Suspense>
		</div>
	);
}
