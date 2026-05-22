import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Spinner } from "@vboard/ui/components/spinner";
import { cn } from "@vboard/ui/lib/utils";
import {
	type Component,
	type ReactNode,
	type ErrorInfo,
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import "@excalidraw/excalidraw/index.css";

import { useCollab, type ConnectionState } from "@/features/board/collab";

// Lazy-load Excalidraw (it's huge — ~2MB)
const Excalidraw = lazy(async () => {
	const mod = await import("@excalidraw/excalidraw");
	return { default: mod.Excalidraw };
});

// ── Connection Status Config ────────────────────────────────────────────

interface StatusConfig {
	label: string;
	icon: Component<{ className?: string }>;
	containerClass: string;
	dotClass: string;
}

const STATUS_CONFIG: Record<ConnectionState, StatusConfig> = {
	connecting: {
		label: "Connecting...",
		icon: WifiOff,
		containerClass: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
		dotClass: "bg-orange-500",
	},
	connected: {
		label: "Connected",
		icon: Wifi,
		containerClass: "bg-green-500/10 text-green-700 dark:text-green-400",
		dotClass: "bg-green-500",
	},
	reconnecting: {
		label: "Reconnecting...",
		icon: WifiOff,
		containerClass: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
		dotClass: "bg-orange-500 animate-pulse",
	},
	disconnected: {
		label: "Disconnected",
		icon: WifiOff,
		containerClass: "bg-red-500/10 text-red-700 dark:text-red-400",
		dotClass: "bg-red-500",
	},
};

// ── Error Boundary ─────────────────────────────────────────────────────

interface ErrorBoundaryProps {
	children: ReactNode;
	boardId: string;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

/**
 * Catches rendering errors from Excalidraw or Loro WASM initialization.
 * Shows a recoverable error UI with a retry button.
 */
class ExcalidrawErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		console.error("[ExcalidrawErrorBoundary] Uncaught error:", error, errorInfo);
	}

	handleRetry = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex h-full flex-col items-center justify-center gap-4 p-8">
					<AlertTriangle className="size-12 text-destructive" />
					<div className="text-center">
						<h2 className="text-lg font-semibold text-foreground">
							Canvas Error
						</h2>
						<p className="mt-1 max-w-md text-sm text-muted-foreground">
							The drawing canvas encountered an error and needs to be reloaded.
							Your work has been saved.
						</p>
						{this.state.error && (
							<pre className="mt-2 max-w-lg overflow-auto rounded-md bg-muted p-2 text-xs text-muted-foreground">
								{this.state.error.message}
							</pre>
						)}
					</div>
					<button
						type="button"
						onClick={this.handleRetry}
						className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
					>
						<RefreshCw className="size-4" />
						Retry
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}

// ── Wrapper Component ──────────────────────────────────────────────────

interface ExcalidrawWrapperProps {
	boardId: string;
	readOnly?: boolean;
}

/**
 * Wraps Excalidraw with Loro collaboration and error boundary.
 * Lazy-loaded to avoid SSR/bundle issues.
 */
export const ExcalidrawWrapper = ({
	boardId,
	readOnly = false,
}: ExcalidrawWrapperProps) => {
	const { binding, connectionState, connected, retry } = useCollab({ boardId, readOnly });
	const [excalidrawAPI, setExcalidrawAPI] =
		useState<ExcalidrawImperativeAPI | null>(null);
	const lastVersionRef = useRef(-1);

	// Connect binding to Excalidraw API when both are ready.
	useEffect(() => {
		if (binding && excalidrawAPI) {
			binding.setExcalidraw(excalidrawAPI);
		}
	}, [binding, excalidrawAPI]);

	const handleExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
		setExcalidrawAPI(api);
		// Expose for E2E tests (dev only)
		if (import.meta.env.DEV) {
			(window as Record<string, unknown>).__excalidrawAPI = api;
		}
	}, []);

	const status = STATUS_CONFIG[connectionState];
	const StatusIcon = status.icon;

	return (
		<div className="relative h-screen w-screen">
			{/* Connection status indicator */}
			<div
				className={cn(
					"absolute right-2 top-2 z-[9999] flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs",
					status.containerClass,
				)}
			>
				<span
					className={cn(
						"size-2 rounded-full",
						status.dotClass,
					)}
				/>
				<StatusIcon className="size-3" />
				{status.label}
				{connectionState === "disconnected" && (
					<button
						type="button"
						onClick={retry}
						className="ml-1 inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 hover:bg-foreground/10"
					>
						<RefreshCw className="size-3" />
						Retry
					</button>
				)}
			</div>

			<ExcalidrawErrorBoundary boardId={boardId}>
				<Suspense
					fallback={
						<div className="flex h-full items-center justify-center text-muted-foreground">
							<Spinner className="mr-2" />
							Loading Excalidraw...
						</div>
					}
				>
					<Excalidraw
						excalidrawAPI={handleExcalidrawAPI}
						isCollaborating
						viewModeEnabled={readOnly}
						onChange={(elements) => {
							if (!binding) {
								return;
							}
							// Compute version checksum to detect actual changes
							const v = elements.reduce(
								(acc: number, curr: { version: number }) => acc + curr.version,
								0,
							);
							if (lastVersionRef.current !== v) {
								binding.onElementsChange(elements);
								lastVersionRef.current = v;
							}
						}}
						UIOptions={{
							canvasActions: {
								changeViewBackgroundColor: !readOnly,
								toggleTheme: true,
							},
						}}
					/>
				</Suspense>
			</ExcalidrawErrorBoundary>
		</div>
	);
};
