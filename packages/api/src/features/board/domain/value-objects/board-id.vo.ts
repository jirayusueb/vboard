/**
 * BoardIdVO — branded type for board identifiers.
 * Prevents accidental mixing of board IDs with other strings.
 */
import { type Brand, IdVO } from "../../../../shared/kernel/types/brand";

export type BoardIdVO = Brand<string, "BoardId">;

export const BoardIdVO = new IdVO<BoardIdVO, "BoardId">("BoardId");
