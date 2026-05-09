// Type declarations for modules without TypeScript types
declare module "@y/protocols/sync" {
	export function writeSyncStep1(encoder: any, doc: any): void;
	export function writeSyncStep2(encoder: any, doc: any): void;
	export function writeUpdate(encoder: any, update: Uint8Array): void;
	export function readSyncMessage(
		decoder: any,
		encoder: any,
		doc: any,
		origin: any,
	): number;
}

declare module "@y/protocols/awareness" {
	export class Awareness {
		constructor(doc: any);
		setLocalState(state: any): void;
		getLocalState(): any;
		on(event: string, handler: (...args: any[]) => void): void;
		off(event: string, handler: (...args: any[]) => void): void;
		getStates(): Map<number, any>;
		clients: Map<number, any>;
		meta: Map<number, any>;
		doc: any;
		removeAwarenessStates: any;
	}
	export function encodeAwarenessUpdate(
		awareness: Awareness,
		clients: number[],
	): Uint8Array;
	export function applyAwarenessUpdate(
		awareness: Awareness,
		update: Uint8Array,
		origin: any,
	): void;
	export function removeAwarenessStates(
		awareness: Awareness,
		clients: number[],
		origin: any,
	): void;
}
