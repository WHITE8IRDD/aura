/**
 * tab.ts — Preload script for web-content tabs (untrusted web pages).
 *
 * Intentionally empty in Stage 1. This file MUST exist and be referenced
 * in tabs.ts webPreferences.preload so Electron can load it.
 *
 * Stage 7 will add a narrow, read-only bridge here that lets the AI
 * summarizer extract the page's text content. It will never expose write
 * access or any Node/Electron API to the web page.
 */
export {}
