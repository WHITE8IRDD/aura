import React, { useEffect, useRef } from 'react'

interface Props {
  data: number[]
  max?: number
  color?: string
  height?: number
}

const Sparkline: React.FC<Props> = ({
  data,
  max,
  color = '#30d158',
  height = 60,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    if (data.length < 2) return

    const ceiling = max ?? Math.max(...data, 1)
    const step = w / Math.max(1, data.length - 1)
    const points: Array<[number, number]> = data.map((v, i) => [
      i * step,
      h - (v / ceiling) * (h - 6) - 3,
    ])

    const buildPath = (): void => {
      ctx.beginPath()
      ctx.moveTo(points[0][0], points[0][1])
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i][0] + points[i + 1][0]) / 2
        const yc = (points[i][1] + points[i + 1][1]) / 2
        ctx.quadraticCurveTo(points[i][0], points[i][1], xc, yc)
      }
      const last = points[points.length - 1]
      ctx.lineTo(last[0], last[1])
    }

    ctx.save()
    buildPath()
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, hexToRgba(color, 0.28))
    grad.addColorStop(1, hexToRgba(color, 0))
    ctx.fillStyle = grad
    ctx.fill()
    ctx.restore()

    buildPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.75
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    const lastPt = points[points.length - 1]
    ctx.beginPath()
    ctx.arc(lastPt[0], lastPt[1], 2.5, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.beginPath()
    ctx.arc(lastPt[0], lastPt[1], 5, 0, Math.PI * 2)
    ctx.fillStyle = hexToRgba(color, 0.22)
    ctx.fill()
  }, [data, max, color, height])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: `${height}px`, display: 'block' }}
    />
  )
}

function hexToRgba(input: string, alpha: number): string {
  if (input.startsWith('rgb')) {
    const m = input.match(/\d+/g)
    if (!m) return `rgba(48,209,88,${alpha})`
    return `rgba(${m[0]},${m[1]},${m[2]},${alpha})`
  }
  let hex = input.replace('#', '')
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
  const r = parseInt(hex.slice(0, 2), 16) || 48
  const g = parseInt(hex.slice(2, 4), 16) || 209
  const b = parseInt(hex.slice(4, 6), 16) || 88
  return `rgba(${r},${g},${b},${alpha})`
}

export default Sparkline
