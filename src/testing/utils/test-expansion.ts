// https://github.com/import-js/eslint-plugin-import/issues/1739
// https://github.com/import-js/eslint-plugin-import/issues/3076
// eslint-disable-next-line import/no-unresolved
import baseSchema from '#app/fixtures/base.gql?raw'
import { buildSchema } from 'graphql'
import type { Document } from '#app/document.js'
import { expect } from 'vitest'
import { invoke } from '#app/utils/invoke.js'
import { Kind } from 'graphql'
import { parse } from 'graphql'
import * as prettier from 'prettier'
import { print } from 'graphql'

export async function testExpansion({
  expand,
  initialSchema,
  expandedSchema,
}: {
  expand: (document: Document) => void
  initialSchema: string
  expandedSchema: string
}) {
  buildSchema(initialSchema)
  buildSchema(baseSchema + expandedSchema)

  const initialAST = parse(initialSchema)
  const document: Document = {
    bundles: initialAST.definitions.map((node) => ({
      node,
      expansions: [],
    })),
    globals: [],
  }

  expand(document)

  const result = await invoke(async () => {
    let x

    x = [
      print({
        kind: Kind.DOCUMENT,
        definitions: document.bundles.flatMap((bundle) => {
          return [bundle.node, ...bundle.expansions]
        }),
      }),
      ...document.globals.reduce((set, definition) => {
        const printed = print({
          kind: Kind.DOCUMENT,
          definitions: [definition],
        })

        set.add(printed)

        return set
      }, new Set<string>()),
    ].join('\n\n')

    x = await prettier.format(x, { parser: 'graphql' })

    return x
  })

  expect(result).toBe(expandedSchema)
}
