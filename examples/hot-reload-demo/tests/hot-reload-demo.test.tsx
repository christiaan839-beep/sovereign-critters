import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 4, bodyColumns: 80, scroll: { offset: 0, bodyRows: 4 }, view: {} },
} as const

// The engine raises the band above the prompt on these two surfaces only.
const SURFACES = ['terminal', 'desktop'] as const

test('the count rides in $.state and the band reads it on both surfaces that raise it', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))
  for (const text of ['one', 'two', 'three']) await $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'hot-reload-demo', surface, ...BAND })
    expect((await ui.find({ type: 'Text', text: /this session/ }))?.text).toBe('$.state: 3 prompts this session')
    await ui.unmount()
  }
})

test('a prompt dropped beneath crab never entered, so it is not counted', async ($, on) => {
  on('prompt.submit', ($, e) => (e.text === 'blocked' ? { drop: 'policy' } : { text: e.text }))
  for (const text of ['one', 'blocked', 'two']) await $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })
  const ui = await $.ui.mount({ plugin: 'hot-reload-demo', surface: 'terminal', ...BAND })
  expect((await ui.find({ type: 'Text', text: /this session/ }))?.text).toBe('$.state: 2 prompts this session')
  await ui.unmount()
})

test('a band drawn before session.start redraws with the load time, in UTC', async ($, on) => {
  mock.clock(on, { now: Date.UTC(2026, 9, 7, 14, 9, 30) })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  const ui = await $.ui.mount({ plugin: 'hot-reload-demo', surface: 'terminal', ...BAND })
  expect((await ui.find({ type: 'Text', text: /module's own/ }))?.text).toBe("module's own: loaded just now · ")
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect((await ui.find({ type: 'Text', text: /module's own/ }))?.text).toBe("module's own: loaded 14:09:30 UTC · ")
  await ui.unmount()
})

test('the band steps aside for a survey', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>the engine's own band</Text>
  })
  const ui = await $.ui.mount({ plugin: 'hot-reload-demo', surface: 'terminal', ...BAND, props: { ...BAND.props, hasSurvey: true } })
  expect(await ui.find({ type: 'Text', text: /prompts? this session/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: "the engine's own band" })).toBeDefined()
  await ui.unmount()
})
