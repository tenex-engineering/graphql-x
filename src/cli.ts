import { cmdErrorHandling } from '#package/utils/cmd-error-handling.js'
import { expand } from '#package/expand.js'
import { invoke } from '@txe/invoke'
import { mkdir } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'

const args = parseArgs({
  options: {
    schema: { type: 'string' },
    output: { type: 'string' },
    watch: { type: 'boolean' },
  },
  strict: true,
})

const {
  schema: schemaPath = '',
  output: outputPath = '',
  watch = false,
} = args.values

async function main() {
  console.log('Expanding...')

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const initial = await readFile(schemaPath, { encoding: 'utf-8' })
  const expanded = await expand(initial)

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await writeFile(outputPath, expanded, { encoding: 'utf-8' })

  console.log('Schema expanded.')
}

const waitDurationInMs = 128

const cmd = await invoke(async () => {
  let x

  x = main
  x = cmdErrorHandling({ watch }, x)

  if (watch) {
    const { default: debounce } = await import('debounce')
    const { traillead } = await import('#package/utils/traillead.js')

    x = traillead(x)
    x = debounce(x, waitDurationInMs)
  }

  return x
})

export const cli = async () => {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await readFile(schemaPath)
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(path.dirname(outputPath), { recursive: true })

  cmd()

  if (watch) {
    const { subscribe } = await import('@parcel/watcher')

    await subscribe(
      path.join(process.cwd(), path.dirname(schemaPath)),
      (_, events) => {
        for (const event of events) {
          if (path.relative(event.path, schemaPath) === '') {
            cmd()

            return
          }
        }
      },
    )
  }
}
