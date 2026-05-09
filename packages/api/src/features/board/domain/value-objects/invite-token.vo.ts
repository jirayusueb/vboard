/**
 * InviteTokenVO — branded type for board invite tokens.
 */
import { type Brand, IdVO } from "../../../../shared/kernel/types/brand";

export type InviteTokenVO = Brand<string, "InviteToken">;

export const InviteTokenVO = new IdVO<InviteTokenVO, "InviteToken">(
	"InviteToken",
);
