import path from 'path'
import fs from 'fs'

export default function (req, res, next) {
  const ua = req.headers['user-agent'] || ''
  const isIE =
    ua.includes('MSIE') ||
    ua.includes('Trident/') ||
    ua.includes('compatible; MSIE')

  if (isIE) {
    const filePath = path.resolve(
      __dirname,
      '../static/unsupported-browser.html'
    )
    if (fs.existsSync(filePath)) {
      // HTML을 직접 반환
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      const html = fs.readFileSync(filePath, 'utf8')
      res.end(html)
    } else {
      // fallback
      res.writeHead(302, { Location: '/unsupported-browser.html' })
      res.end()
    }
    return
  }

  next()
}
