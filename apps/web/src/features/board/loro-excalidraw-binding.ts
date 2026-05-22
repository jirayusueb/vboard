import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { restoreElements } from "@excalidraw/excalidraw";
import type { LoroDoc, LoroList, LoroEventBatch } from "loro-crdt";
import { LoroMap } from "loro-crdt";

/**
 * LoroExcalidrawBinding — bidirectional sync between Loro CRDT and Excalidraw.
 *
 * Modeled after the loro-dev/loro-excalidraw demo. Stores Excalidraw elements
 * as a LoroList of LoroMap entries. Diffs local changes from Excalidraw and
 * applies them to Loro; pushes remote Loro changes to Excalidraw via
 * updateScene().
 *
 * Optimization: Uses container-level subscription on the elements list to
 * detect changes granularly, and a version-based diff to skip unchanged
 * elements in the local → Loro path.
 */
export class LoroExcalidrawBinding {
	private doc: LoroDoc;
	private elementsList: LoroList;
	private excalidrawAPI: ExcalidrawImperativeAPI | null = null;
	private unsubscribe: (() => void) | null = null;
	private destroyed = false;

	constructor(doc: LoroDoc) {
		this.doc = doc;
		this.elementsList = doc.getList("elements");

		// Subscribe to remote Loro changes at the container level.
		// event.by === "import" means remote changes; "local" means our own.
		// We only push to Excalidraw on remote (import) changes.
		this.unsubscribe = doc.subscribe((event: LoroEventBatch) => {
			if (this.destroyed) return;
			if (event.by === "local") return;

			// Check if any events target the elements list
			const hasElementChanges = event.events.some(
				(e) =>
					e.target === "cid:root-list:elements" ||
					e.path.some((p) => p === "elements"),
			);

			if (hasElementChanges && this.excalidrawAPI) {
				this.pushToExcalidraw();
			}
		});
	}

	/**
	 * Push current LoroList state to Excalidraw.
	 *
	 * Uses resetScene + updateScene with captureUpdate="NEVER" to match
	 * Excalidraw's own collab pattern (see Collab.tsx in excalidraw-app).
	 * This prevents Excalidraw from re-broadcasting synced elements and
	 * avoids state conflicts in collaboration mode.
	 */
	private pushToExcalidraw(): void {
		if (!this.excalidrawAPI) return;

		const raw = this.elementsList.toJSON();
		// eslint-disable-next-line typescript/no-explicit-any
		const elements = restoreElements(raw as any[], null);

		if (elements.length === 0) {
			return;
		}

		this.excalidrawAPI.resetScene({ resetScroll: true, resetZoom: true });
		this.excalidrawAPI.updateScene({
			elements,
			captureUpdate: "NEVER",
		});
	}

	/**
	 * Connect the binding to an Excalidraw instance.
	 * Pushes current Loro state to the canvas immediately.
	 */
	setExcalidraw(api: ExcalidrawImperativeAPI): void {
		this.excalidrawAPI = api;
		this.pushToExcalidraw();
	}

	/**
	 * Called on every Excalidraw onChange.
	 * Diffs the new elements against the current LoroList and applies changes.
	 *
	 * Optimization: Uses the `version` field as a quick skip check —
	 * unchanged elements are skipped entirely without iterating their keys.
	 *
	 * When the LoroList already has elements but Excalidraw reports empty
	 * (happens during mount/reconnect), the call is skipped to prevent
	 * the snapshot from being wiped.
	 */
	onElementsChange(
		elements: readonly { version: number; isDeleted?: boolean }[],
	): void {
		if (this.destroyed) {
			return;
		}

		const liveElements = elements.filter((e) => !e.isDeleted);

		// Guard: if Loro has data but Excalidraw reports nothing, this is a
		// mount/reconnect event — don't overwrite the snapshot.
		if (this.elementsList.length > 0 && liveElements.length === 0) {
			return;
		}

		const changed = applyElementDiff(this.elementsList, liveElements);
		if (changed) {
			this.doc.commit();
		}
	}

	getDoc(): LoroDoc {
		return this.doc;
	}

	destroy(): void {
		this.destroyed = true;
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
		this.excalidrawAPI = null;
	}
}

/**
 * Diff Excalidraw elements against the LoroList and apply changes.
 * Returns true if any changes were applied.
 *
 * Optimization notes:
 * - Uses `version` field as a quick skip check per element
 * - Only iterates keys of elements whose version changed
 * - Deletes trailing elements in a single batch operation
 */
const applyElementDiff = (
	loroList: LoroList,
	elements: readonly Record<string, unknown>[],
): boolean => {
	let changed = false;
	const listLen = loroList.length;
	const elemLen = elements.length;

	// Batch insert new containers if elements were added
	for (let i = listLen; i < elemLen; i += 1) {
		loroList.insertContainer(i, new LoroMap());
		changed = true;
	}

	// Batch delete trailing elements if elements were removed
	if (elemLen < listLen) {
		loroList.delete(elemLen, listLen - elemLen);
		changed = true;
	}

	// Update changed elements — skip unchanged ones via version check
	const n = Math.min(elemLen, listLen);
	for (let i = 0; i < n; i += 1) {
		const map = loroList.get(i) as LoroMap | undefined;
		if (!map) break;

		const elem = elements[i];
		// Quick skip: if version hasn't changed, no keys need updating
		if (map.get("version") === elem.version) continue;

		for (const [key, value] of Object.entries(elem)) {
			if (map.get(key) !== value) {
				map.set(key, value);
				changed = true;
			}
		}
	}

	return changed;
};
