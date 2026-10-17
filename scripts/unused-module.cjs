// Stand-in for parts of CopilotKit's built-in chat UI that this site's headless chat
// never runs: markdown and math rendering, web components, the inspector, the A2UI and
// MCP renderers, Radix menus, icons. CopilotKit imports them eagerly; next.config.ts
// aliases them here, which keeps ~330 KB (gzip) out of the chat bundle.
//
// Named imports from this module come through as undefined, so only packages that are
// used inside components and hooks the chat never renders can be listed, never ones
// called while CopilotKit loads (tailwind-merge, class-variance-authority). The chat e2e
// suite runs against the aliased build.
module.exports = {};
