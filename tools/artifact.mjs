// Turns dist/index.html into an artifact page: the artifact host supplies the
// document skeleton, so keep only the title, styles, root and module script.
// Prints the published-path -> source-file map for every other build file.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const dist = resolve(process.argv[2] ?? 'dist')
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const pick = re => [...html.matchAll(re)].map(m => m[0])
const title = pick(/<title>[^<]*<\/title>/g)
const links = pick(/<link rel="stylesheet"[^>]*>/g)
const scripts = pick(/<script type="module"[^>]*><\/script>/g)
const page = [...title, '<meta name="theme-color" content="#141413">', ...links,
  '<style>html,body,#root{height:100%;margin:0;background:#141413;overflow:hidden}</style>',
  '<div id="root"></div>', ...scripts].join('\n') + '\n'
writeFileSync(join(dist, 'artifact.html'), page)

const files = {}
const walk = d => readdirSync(d).forEach(f => {
  const p = join(d, f)
  if (statSync(p).isDirectory()) return walk(p)
  const rel = relative(dist, p)
  if (rel === 'index.html' || rel === 'artifact.html') return
  files[rel] = relative(process.cwd(), p)
})
walk(dist)
console.log(JSON.stringify(files, null, 1))
