/**
 * Dependency Rule Tests — enforce Clean Architecture boundaries.
 *
 * Per clean-arch.md:
 *   Domain        → Nothing (no imports from application/infrastructure/presentation)
 *   Application   → Domain only (no imports from infrastructure/presentation)
 *   Infrastructure → Application + Domain (no imports from presentation)
 *   Presentation  → Application + Domain (types/constants only, no infrastructure)
 *   Shared        → Cannot import from features
 *
 * Exceptions:
 *   - `shared/kernel` may be imported by any layer
 *   - `shared/application` interfaces may be imported by domain via `type` imports only
 *   - External packages (better-result, elysia, drizzle-orm, etc.) are always allowed
 *   - Index files (barrel exports) are excluded
 *   - IOC/composition root files wire everything, so boundary checks are relaxed there
 *   - Test files (.test.ts) and __mocks__ are excluded
 */
import { describe, test, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const FEATURES_DIR = path.resolve(__dirname, "../src/features");
const SHARED_DIR = path.resolve(__dirname, "../src/shared");

// ── Helpers ──────────────────────────────────────────────────

type Layer =
	| "domain"
	| "application"
	| "infrastructure"
	| "presentation"
	| "ioc"
	| "unknown";

interface SourceFile {
	relativePath: string;
	absolutePath: string;
	layer: Layer;
	feature: string;
	imports: string[];
}

/** Determine which layer a file belongs to based on its path segments */
function getLayer(filePath: string): Layer {
	if (filePath.includes("/domain/")) return "domain";
	if (filePath.includes("/application/")) return "application";
	if (filePath.includes("/infrastructure/")) return "infrastructure";
	if (filePath.includes("/presentation/")) return "presentation";
	if (filePath.endsWith(".ioc.ts")) return "ioc";
	return "unknown";
}

/** Extract all import paths from a source file */
function extractImports(content: string): string[] {
	const imports: string[] = [];
	const regex = /from\s+["']([^"']+)["']/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(content)) !== null) {
		if (match[1]) imports.push(match[1]);
	}
	return imports;
}

/** Recursively collect all source .ts files */
function collectFiles(dir: string, baseDir: string): SourceFile[] {
	const files: SourceFile[] = [];
	if (!fs.existsSync(dir)) return files;

	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === "__mocks__" || entry.name === "node_modules") continue;
			files.push(...collectFiles(fullPath, baseDir));
		} else if (
			entry.isFile() &&
			entry.name.endsWith(".ts") &&
			!entry.name.endsWith(".test.ts") &&
			!entry.name.endsWith(".d.ts") &&
			entry.name !== "index.ts"
		) {
			const relativePath = path.relative(baseDir, fullPath);
			const content = fs.readFileSync(fullPath, "utf-8");
			const segments = relativePath.split(path.sep);
			const feature = segments.length > 1 ? segments[1]! : "unknown";

			files.push({
				relativePath,
				absolutePath: fullPath,
				layer: getLayer(relativePath),
				feature,
				imports: extractImports(content),
			});
		}
	}
	return files;
}

/** Check if an import path is an external package (not a relative import or alias) */
function isExternalPackage(importPath: string): boolean {
	return !importPath.startsWith(".") && !importPath.startsWith("@vboard/");
}

/** Check if an import is to shared/kernel (allowed everywhere) */
function isSharedKernel(importPath: string): boolean {
	return (
		importPath.includes("shared/kernel") ||
		importPath.includes("shared\\kernel")
	);
}

/** Check if an import is to shared/application (interfaces — allowed as type-only) */
function isSharedApplication(importPath: string): boolean {
	return (
		importPath.includes("shared/application") ||
		importPath.includes("shared\\application")
	);
}

/** Determine the target layer of a relative import */
function getImportLayer(importPath: string): string | null {
	const normalized = importPath.replace(/\\/g, "/");

	// Relative imports: figure out target
	if (normalized.startsWith(".")) {
		if (normalized.includes("/domain/")) return "domain";
		if (normalized.includes("/application/")) return "application";
		if (normalized.includes("/infrastructure/")) return "infrastructure";
		if (normalized.includes("/presentation/")) return "presentation";
		// Same-directory or parent import without layer segment — intra-layer
		return null;
	}

	// Workspace alias imports
	if (normalized.startsWith("@vboard/")) {
		if (normalized.includes("shared/kernel")) return "shared/kernel";
		if (normalized.includes("shared/application")) return "shared/application";
		if (normalized.includes("shared/infrastructure"))
			return "shared/infrastructure";
		if (normalized.includes("shared/presentation"))
			return "shared/presentation";
		return "external-workspace";
	}

	return "external";
}

// ── Collect all source files ──────────────────────────────────

const allFiles = collectFiles(FEATURES_DIR, FEATURES_DIR);
const sharedFiles = collectFiles(SHARED_DIR, SHARED_DIR);

// ── Tests ─────────────────────────────────────────────────────

describe("Clean Architecture Dependency Rules", () => {
	describe("Domain layer — zero outward dependencies", () => {
		const domainFiles = allFiles.filter((f) => f.layer === "domain");

		test.each(
			domainFiles.map((f) => [f.relativePath, f] as const),
		)("%s must not import from application/infrastructure/presentation", (_name, file) => {
			for (const imp of file.imports) {
				if (isExternalPackage(imp)) continue;
				if (isSharedKernel(imp)) continue;
				if (isSharedApplication(imp)) continue;

				const target = getImportLayer(imp);

				expect(
					target,
					`${file.relativePath} imports "${imp}" (layer: ${target})`,
				).not.toBe("application");
				expect(
					target,
					`${file.relativePath} imports "${imp}" (layer: ${target})`,
				).not.toBe("infrastructure");
				expect(
					target,
					`${file.relativePath} imports "${imp}" (layer: ${target})`,
				).not.toBe("presentation");
				expect(
					target,
					`${file.relativePath} imports "${imp}" (layer: ${target})`,
				).not.toBe("shared/infrastructure");
				expect(
					target,
					`${file.relativePath} imports "${imp}" (layer: ${target})`,
				).not.toBe("shared/presentation");
			}
		});
	});

	describe("Application layer — depends on domain only", () => {
		const appFiles = allFiles.filter((f) => f.layer === "application");

		test.each(
			appFiles.map((f) => [f.relativePath, f] as const),
		)("%s must not import from infrastructure/presentation", (_name, file) => {
			for (const imp of file.imports) {
				if (isExternalPackage(imp)) continue;
				if (isSharedKernel(imp)) continue;
				if (isSharedApplication(imp)) continue;

				const target = getImportLayer(imp);

				expect(
					target,
					`${file.relativePath} imports "${imp}" (layer: ${target})`,
				).not.toBe("infrastructure");
				expect(
					target,
					`${file.relativePath} imports "${imp}" (layer: ${target})`,
				).not.toBe("presentation");
				expect(
					target,
					`${file.relativePath} imports "${imp}" (layer: ${target})`,
				).not.toBe("shared/infrastructure");
				expect(
					target,
					`${file.relativePath} imports "${imp}" (layer: ${target})`,
				).not.toBe("shared/presentation");
			}
		});
	});

	describe("Infrastructure layer — no imports from presentation", () => {
		const infraFiles = allFiles.filter((f) => f.layer === "infrastructure");

		test.each(
			infraFiles.map((f) => [f.relativePath, f] as const),
		)("%s must not import from presentation", (_name, file) => {
			for (const imp of file.imports) {
				if (isExternalPackage(imp)) continue;
				if (isSharedKernel(imp)) continue;
				if (isSharedApplication(imp)) continue;

				const target = getImportLayer(imp);

				expect(
					target,
					`${file.relativePath} imports "${imp}" (layer: ${target})`,
				).not.toBe("presentation");
				expect(
					target,
					`${file.relativePath} imports "${imp}" (layer: ${target})`,
				).not.toBe("shared/presentation");
			}
		});
	});

	describe("Presentation layer — no imports from infrastructure", () => {
		const presFiles = allFiles.filter((f) => f.layer === "presentation");

		test.each(
			presFiles.map((f) => [f.relativePath, f] as const),
		)("%s must not import from infrastructure", (_name, file) => {
			for (const imp of file.imports) {
				if (isExternalPackage(imp)) continue;
				if (isSharedKernel(imp)) continue;
				if (isSharedApplication(imp)) continue;

				const target = getImportLayer(imp);

				expect(
					target,
					`${file.relativePath} imports "${imp}" (layer: ${target})`,
				).not.toBe("infrastructure");
				expect(
					target,
					`${file.relativePath} imports "${imp}" (layer: ${target})`,
				).not.toBe("shared/infrastructure");
			}
		});
	});

	describe("Shared kernel — must not import from features", () => {
		const kernelFiles = sharedFiles.filter((f) =>
			f.relativePath.includes("kernel"),
		);

		test.each(
			kernelFiles.map((f) => [f.relativePath, f] as const),
		)("%s must not import from features", (_name, file) => {
			for (const imp of file.imports) {
				if (isExternalPackage(imp)) continue;
				expect(
					imp.includes("/features/") || imp.includes("\\features\\"),
					`${file.relativePath} imports "${imp}" from features`,
				).toBe(false);
			}
		});
	});

	test("domain layer has source files", () => {
		expect(allFiles.filter((f) => f.layer === "domain").length).toBeGreaterThan(
			0,
		);
	});

	test("application layer has source files", () => {
		expect(
			allFiles.filter((f) => f.layer === "application").length,
		).toBeGreaterThan(0);
	});

	test("infrastructure layer has source files", () => {
		expect(
			allFiles.filter((f) => f.layer === "infrastructure").length,
		).toBeGreaterThan(0);
	});

	test("presentation layer has source files", () => {
		expect(
			allFiles.filter((f) => f.layer === "presentation").length,
		).toBeGreaterThan(0);
	});
});
