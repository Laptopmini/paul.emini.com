// Plain values shared by the Worker and the site, kept free of zod so the landing page
// can import them without pulling the tool schemas into its bundle.

export const AGENT_ID = 'default';
export const MAX_PROMPT_LENGTH = 400;
