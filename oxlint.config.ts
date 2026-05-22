import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";

export default defineConfig({
	extends: [core, react],
	rules: {
		"no-use-before-define": "off",
	},
	ignorePatterns: [
		"**/routeTree.gen.ts",
		"**/$*",
	],
});