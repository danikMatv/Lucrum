import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.resolve(__dirname, '..')
const distDir = path.join(appDir, 'dist')
const serverDir = path.join(distDir, 'server')
const serverEntry = path.join(serverDir, 'entry-server.js')

const templatePath = path.join(distDir, 'index.html')
const template = await readFile(templatePath, 'utf8')
const server = await import(pathToFileURL(serverEntry).href)

const renderPage = (url) => {
  const rendered = server.render(url)
  const withHead = template.includes('<!--seo-head-->')
    ? template.replace('<!--seo-head-->', rendered.headHtml)
    : template.replace('</head>', `${rendered.headHtml}\n</head>`)

  return withHead
    .replace(/<html lang="[^"]*">/, `<html lang="${rendered.lang}">`)
    .replace('<div id="root"></div>', `<div id="root">${rendered.appHtml}</div>`)
}

const getOutputPath = (url) => {
  if (url === '/') {
    return path.join(distDir, 'index.html')
  }

  const segments = url.replace(/^\//, '').split('/')
  return path.join(distDir, ...segments, 'index.html')
}

for (const url of server.getPrerenderPaths()) {
  const outputPath = getOutputPath(url)
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, renderPage(url))
}

await writeFile(path.join(distDir, 'sitemap.xml'), server.createSitemapXml())
await writeFile(path.join(distDir, 'robots.txt'), server.createRobotsTxt())
await writeFile(path.join(distDir, '_redirects'), server.createRedirects())
await rm(serverDir, { recursive: true, force: true })
