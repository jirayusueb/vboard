import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
	plugins: [
		wasm(),
		topLevelAwait(),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
	resolve: {
		tsconfigPaths: true,
	},
	server: {
		port: 3001,
		proxy: {
			"/ws": {
				target: "ws://localhost:3000",
				ws: true,
			},
		},
	},
});