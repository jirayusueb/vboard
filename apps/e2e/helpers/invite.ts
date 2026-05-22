/**
 * Creates a board invite by calling the API directly.
 * There is no frontend UI for invite creation, so E2E tests
 * must go through the HTTP endpoint.
 *
 * @param cookies - Session cookie string from an authenticated browser context
 * @param boardId - The board to invite someone to
 * @param role - The role for the invited user
 * @returns The invite token
 */
export async function createInviteViaApi(
  cookies: string,
  boardId: string,
  role: "editor" | "viewer" = "editor",
): Promise<{ token: string }> {
  const res = await fetch(
    `http://localhost:3000/board/${boardId}/invite`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify({ role }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create invite (${res.status}): ${text}`);
  }

  return res.json() as Promise<{ token: string }>;
}
