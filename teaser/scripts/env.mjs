// Where Chromium lives on this machine, and how it draws WebGL without a GPU.
export const CHROME = process.env.REMOTION_CHROME ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'
export const GL = process.env.REMOTION_GL ?? 'swangle'
