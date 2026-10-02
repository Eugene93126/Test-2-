import { Config } from '@remotion/cli/config'
import { CHROME, GL } from './scripts/env.mjs'

// No GPU in the render box: Chromium draws WebGL with SwiftShader via ANGLE.
Config.setBrowserExecutable(CHROME)
Config.setChromiumOpenGlRenderer(GL)
Config.setVideoImageFormat('png')
