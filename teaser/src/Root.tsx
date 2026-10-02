import { Composition } from 'remotion'
import { Teaser } from './Teaser'
import { CardPreview } from './Preview'
import { FPS, FRAMES } from './lib/timeline'

export const Root = () => (
  <>
    <Composition id="Teaser" component={Teaser} durationInFrames={FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="TeaserSquare" component={Teaser} durationInFrames={FRAMES} fps={FPS} width={1080} height={1080} />
    <Composition id="CardPreview" component={CardPreview} durationInFrames={12} fps={1} width={1216} height={816} />
  </>
)
