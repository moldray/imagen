import QRCode from 'qrcode'

CanvasRenderingContext2D.prototype.wrapText = function (t, x, y, w, l) {
  if (typeof t != 'string' || typeof x != 'number' || typeof y != 'number') {
    return
  }

  var context = this
  var canvas = context.canvas

  if (typeof w == 'undefined') {
    w = (canvas && canvas.width) || 300
  }
  if (typeof l == 'undefined') {
    l = (canvas && parseInt(window.getComputedStyle(canvas).lineHeight)) || parseInt(window.getComputedStyle(document.body).lineHeight)
  }

  // 字符分隔为数组
  var arrText = t.split('')
  var line = ''

  for (var n = 0; n < arrText.length; n++) {
    var testLine = line + arrText[n]
    var metrics = context.measureText(testLine)
    var testWidth = metrics.width
    if (testWidth > w && n > 0) {
      context.fillText(line, x, y)
      line = arrText[n]
      y += l
    } else {
      line = testLine
    }
  }
  context.fillText(line, x, y)
}

CanvasRenderingContext2D.prototype.drawDiv = function (x, y, w, h, g, r) {
  if (w < 2 * r) r = w / 2
  if (h < 2 * r) r = h / 2
  this.beginPath()
  this.moveTo(x + r, y)
  this.arcTo(x + w, y, x + w, y + h, r)
  this.arcTo(x + w, y + h, x, y + h, r)
  this.arcTo(x, y + h, x, y, r)
  this.arcTo(x, y, x + w, y, r)
  this.closePath()
  this.fillStyle = g
  this.fill()
}

export default ({canvas, layers}) => {
  const loadPicPromise = layers.map(l => {
    return new Promise((resolve, reject) => {
      if (l.type === 'image') {
        l.elem = new Image()
        l.elem.src = l.image
        l.elem.onload = function () {
          resolve(l)
        }
        l.elem.onerror = function (err) {
          console.log(l.image, err)
          reject(err)
        }
      } else if (l.type === 'qrcode') {
        QRCode.toDataURL(l.text, {
          errorCorrectionLevel: 'L',
          margin: 1,
          width: l.width
        }, function (err, url) {
          if (err) {
            console.log(err)
            reject(err)
          } else {
            l.type = 'image'
            l.image = url

            // FIXME: preaty
            l.elem = new Image()
            l.elem.src = l.image
            l.elem.onload = function () {
              resolve(l)
            }
            l.elem.onerror = function (err) {
              console.log(err)
              reject(err)
            }
          }
        })
      } else {
        resolve(l)
      }
    })
  })
  return new Promise((resolve, reject) => {
    Promise.all(loadPicPromise).then((lys) => {
      const cav = document.createElement('canvas')
      cav.width = canvas.width
      cav.height = canvas.height

      const ctx = cav.getContext('2d')
      ctx.fillStyle = canvas.background || '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      try {
        lys.forEach(ly => {
          if (ly.type === 'image') {
            let args = [ly.elem, ly.left || 0, ly.top || 0]
            if (ly.width && ly.height) {
              args = args.concat([ly.width, ly.height])
            }
            ctx.drawImage.apply(ctx, args)
          }
          if (ly.type === 'text') {
            ctx.textBaseline = ly.verticalAlign || 'top'
            ctx.fillStyle = ly.color || '#000'
            ctx.textAlign = ly.textAlign || 'left'
            ctx.font = `${ly.fontSize || 12}px sans-serif`

            if (ly.width) {
              ctx.wrapText(ly.text, ly.left || 0, ly.top || 0, ly.width, ly.lineHeight || ly.fontSize * 1.5)
            } else {
              ctx.fillText(ly.text, ly.left || 0, ly.top || 0)
            }
          }
          if (ly.type === 'div') {
            ctx.drawDiv(ly.left, ly.top, ly.width, ly.height, ly.background, ly.borderRadius)
          }
        })

        const base64 = cav.toDataURL('image/jpeg', 0.7)
        resolve(base64)
      } catch (err) {
        console.log(err)
        reject(err)
      }
    })
  })
}
