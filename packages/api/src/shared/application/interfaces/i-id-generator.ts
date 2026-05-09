/**
 * ID generation interface — abstracts ID creation.
 * Application layer generates IDs before persistence (domain purity).
 */
export interface IIdGenerator {
	generate(): string;
}
