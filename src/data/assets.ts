// Claude World: things people you follow made with Fable Duo (canon §6, §12).
// Certified devices sign real recordings and generated work carries its
// provenance; unsigned media is presumed unverified and kept out of search.

export type AssetKind = 'Worlds' | '3D' | 'Video' | 'Audio' | 'Image'
export type ArtId = 'rainline' | 'orrery' | 'ferry' | 'choir' | 'courtyard' | 'greenhouse' | 'saltflats' | 'lakefront' | 'alderman'

export interface Asset {
  id: ArtId
  title: string
  by: string
  kind: AssetKind
  remixes: string
  signed: boolean
  chain: { label: string; detail: string }[]
}

const signedChain = (who: string, made: string, sig: string, date: string, remixes: string) => [
  { label: 'Made by', detail: `${who} · identity signed on a certified device` },
  { label: 'Generated with', detail: made },
  { label: 'Signature', detail: `${sig} · verified by Keystone attestation` },
  { label: 'Published', detail: date },
  { label: 'Remixes', detail: `${remixes}, each signed with its parent` },
]

export const ASSETS: Asset[] = [
  { id: 'rainline', title: 'Rainline Chicago, 1893', by: '@mirelle · remixable', kind: 'Worlds', remixes: '2.1k remixes', signed: true,
    chain: signedChain('@mirelle', 'Fable Duo 4.1 · memory stream ms-7a31 · 5 h 40 min', 'sig 4C1E…9A02', 'Jun 21, 2034', '2,104') },
  { id: 'orrery', title: 'Brass orrery, working gears', by: '@ivo_makes', kind: '3D', remixes: '640 remixes', signed: true,
    chain: signedChain('@ivo_makes', 'Fable Duo 4.1 · physics from Pantheon fleet data', 'sig 77B0…11FC', 'Jul 2, 2034', '640') },
  { id: 'ferry', title: 'Night ferry, 40-second loop', by: '@harborlight', kind: 'Video', remixes: '1.3k remixes', signed: true,
    chain: signedChain('@harborlight', 'Captured on glasses, graded with Fable Duo 4.1', 'sig 0D3A…C77E', 'Jul 5, 2034', '1,312') },
  { id: 'choir', title: 'Low choir in C minor', by: '@deltagrey', kind: 'Audio', remixes: '310 remixes', signed: true,
    chain: signedChain('@deltagrey', 'Fable Duo 4.1 · 24 voices, no real singers cloned', 'sig 9E12…4B60', 'Jun 30, 2034', '310') },
  { id: 'courtyard', title: 'Monsoon courtyard', by: '@anaya.r', kind: 'Worlds', remixes: '980 remixes', signed: true,
    chain: signedChain('@anaya.r', 'Fable Duo 4.1 · memory stream ms-21d8 · 4 h 55 min', 'sig 5A9F…E304', 'Jun 14, 2034', '980') },
  { id: 'greenhouse', title: 'Glass greenhouse kit', by: '@studio_fern', kind: '3D', remixes: '450 remixes', signed: true,
    chain: signedChain('@studio_fern', 'Fable Duo 4.1 · modular, 38 parts', 'sig C4E7…0A9B', 'Jul 6, 2034', '450') },
  { id: 'saltflats', title: 'Salt flats haptic pack', by: '@kenji.o · certified drivers', kind: 'Audio', remixes: '210 remixes', signed: true,
    chain: signedChain('@kenji.o', 'Haptic profiles by Fable Duo 4.1; played by certified suit drivers only', 'sig 2B88…D51C', 'Jul 1, 2034', '210') },
  { id: 'lakefront', title: 'Lakefront at blue hour', by: '@theo.vr', kind: 'Image', remixes: '120 remixes', signed: true,
    chain: signedChain('@theo.vr', 'Captured on glasses, Lakeview, 8:52 PM', 'sig E019…66A3', 'Jul 7, 2034', '120') },
  { id: 'alderman', title: 'Alderman statement, "leaked"', by: 'uploader unknown', kind: 'Video', remixes: 'remix disabled', signed: false,
    chain: [
      { label: 'Made by', detail: 'Unknown · no signed identity' },
      { label: 'Device signature', detail: 'None. No certified camera recorded this.' },
      { label: 'Voice check', detail: 'Matches a known clone model sold on gray-market endpoints' },
      { label: 'Coverage', detail: '0 certified outlets carry it' },
      { label: 'Status', detail: 'Hidden from search · remix disabled · reported to the Trust center' },
    ] },
]

export const KINDS: ('All' | AssetKind)[] = ['All', 'Worlds', '3D', 'Video', 'Audio', 'Image']
