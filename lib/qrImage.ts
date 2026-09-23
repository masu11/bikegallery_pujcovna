'use client'

/**
 * Pomocné funkce pro QR obrázky v e-mailoch.
 *
 * E-mailové klienty (Gmail, Outlook, Apple Mail…) NEPODPORUJÍ SVG v HTML e-mailu
 * a Gmail navíc BLOKUJE data: URI v obrázcích. Proto QR pro e-mail:
 * 1) převedeme na PNG (canvas),
 * 2) uložíme do Supabase Storage a použijeme veřejný URL (funguje ve všech klientoch).
 *
 * Funguje jen v browseru (canvas, atob), proto 'use client'.
 */

/** Převede base64 řetězec na Blob (pro upload do Supabase Storage). */
export function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: contentType })
}

/** Převede SVG řetězec na PNG data URI (pro upload do Storage). */
export async function svgToPngDataUri(svg: string, size = 400): Promise<string> {
  // SVG musí mít xmlns, jinak browser ho nenačte jako obrázek
  const svgWithXmlns = svg.includes('xmlns')
    ? svg
    : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')

  const blob = new Blob([svgWithXmlns], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const img = document.createElement('img')
    img.src = url
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('SVG se nepodařilo načíst jako obrázek'))
    })

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas není podporovaný')

    // Bílé pozadí (QR kód je černý na bílém)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(img, 0, 0, size, size)

    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}