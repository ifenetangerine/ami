export async function runPostCallAnalytics(transcriptBuffer: string[]) {
  const fullTranscript = transcriptBuffer.join('\n')
  const res = await fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript: fullTranscript })
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Analytics API error: ${res.status} ${txt}`)
  }

  const data = await res.json()
  return data
}
