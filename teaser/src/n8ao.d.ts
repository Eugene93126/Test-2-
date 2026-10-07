// n8ao ships without types; the parts used here.
declare module 'n8ao' {
  import type { Camera, Scene } from 'three'
  import { Pass } from 'postprocessing'
  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number)
    autosetGamma: boolean
    configuration: Record<string, unknown>
  }
}
