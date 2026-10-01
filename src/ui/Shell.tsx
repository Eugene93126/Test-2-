import { Hud } from './Hud'
import { Glances } from './Glances'
import { MainWindow } from './MainWindow'
import { Dock } from './Dock'
import { ModelPicker } from './ModelPicker'

// The glasses interface: chrome at head height (near), glance cards in the
// periphery (far), the main window where your eyes rest (mid), and sheets that
// float just in front of it when you choose a model or customize the Dock.
export function Shell() {
  return (
    <>
      <Hud />
      <Glances />
      <MainWindow />
      <Dock />
      <ModelPicker />
    </>
  )
}
