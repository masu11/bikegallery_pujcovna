'use client'

import { QRCodeSVG } from 'qrcode.react'

interface QRCodeProps {
  value: string
  size?: number
}

export default function QRCode({ value, size = 200 }: QRCodeProps) {
  return (
    <div className="inline-block rounded-lg border border-gray-200 bg-white p-3">
      <QRCodeSVG value={value} size={size} />
    </div>
  )
}