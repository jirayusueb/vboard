import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	test: {
		globals: true,
		include: ["src/**/*.test.ts"],
		setupFiles: ["./vitest.setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "text-summary", "lcov"],
			include: [
				"src/features/board/domain/**",
				"src/features/board/application/**",
			],
			exclude: [
				"src/features/**/index.ts",
				"src/**/__mocks__/**",
				"src/**/dtos.ts",
				"src/**/ports/**",
			],
			thresholds: {
				lines: 80,
				branches: 80,
				functions: 80,
				statements: 80,
			},
		},
	},
	resolve: {
		alias: {
			"@vboard/db": path.resolve(__dirname, "../db/src/index.ts"),
		},
	},
});
