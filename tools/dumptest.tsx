
test('DUMP the drawings for review', async ($, on) => {
  stub(on)
  const out: Record<string, unknown> = {}
  for (const [wname, joy, w] of [['day', 70, 'day'], ['night', 70, 'night'], ['storm', 10, 'day']] as const) {
    ;(globalThis as any).__now = w === 'night' ? 1_000_000_000_000 : Date.UTC(2026, 10, 9, 10)
    kept.set('critter-buddy.scene', { value: { shape: 'scene-5', value: { ...initial(), joy, streak: 5, cols: 80, night: w === 'night' } }, version: 1 })
    kept.set('critter-buddy.world', { value: { shape: 'world-1', value: w }, version: 1 })
    for (const [n, comp] of [['backdrop', row('Backdrop', { id: 'x', plugin: 'critter-buddy', glass: { blur: 14, opacity: 0.5 } })], ['band', { ...BAND, props: { ...BAND.props, bodyColumns: 110 } }], ['corner', { ...PANE, props: { ...PANE.props, bodyColumns: 60 } }], ['stage', { ...PANE, requestId: 'stage', props: { ...PANE.props, bodyColumns: 60 } }]] as const) {
      try {
        const ui = await $.ui.mount({ ...comp, surface: 'desktop' } as never)
        out[`${wname}-${n}`] = await ui.drawn()
        await ui.unmount()
      } catch (e) { out[`${wname}-${n}`] = { error: String(e) } }
    }
  }
  console.log('DUMP:' + JSON.stringify(out))
})
