import { createElement as h } from 'react'
import dynamic from 'next/dynamic'
import { NotionRenderer as Renderer } from 'react-notion-x'
import { getTextContent } from 'notion-utils'
import { FONTS_SANS, FONTS_SERIF } from '@/consts'
import { useConfig } from '@/lib/config'
import Toggle from '@/components/notion-blocks/Toggle'
import { Code as CodeComponent } from 'react-notion-x/build/third-party/code'
// import "prismjs"
// import 'prismjs/components/prism-cpp.js'

// Lazy-load some heavy components & override the renderers of some block types
const components = {
  /* Lazy-load */

  // Database block
  Collection: dynamic(() => {
    return import('react-notion-x/build/third-party/collection').then(module => module.Collection)
  }),
  Code: CodeComponent,
  // Equation block & inline variant
  Equation: dynamic(() => {
    return import('react-notion-x/build/third-party/equation').then(module => module.Equation)
  }),
  // PDF (Embed block)
  Pdf: dynamic(() => {
    return import('react-notion-x/build/third-party/pdf').then(module => module.Pdf)
  }, { ssr: false }),
  // Tweet block
  Tweet: dynamic(() => {
    return import('react-tweet-embed').then(module => {
      const { default: TweetEmbed } = module
      return function Tweet ({ id }) {
        return <TweetEmbed tweetId={id} options={{ theme: 'dark' }} />
      }
    })
  }),
  /* Overrides */

  toggle_nobelium: ({ block, children }) => (
    <Toggle block={block}>{children}</Toggle>
  )
}

const mapPageUrl = id => `https://www.notion.so/${id.replace(/-/g, '')}`

/**
 * Notion page renderer
 *
 * A wrapper of react-notion-x/NotionRenderer with predefined `components` and `mapPageUrl`
 *
 * @param props - Anything that react-notion-x/NotionRenderer supports
 */
export default function NotionRenderer (props) {
  const config = useConfig()

  const font = {
    'sans-serif': FONTS_SANS,
    'serif': FONTS_SERIF
  }[config.font]

  // Mark block types to be custom rendered by appending a suffix
  // if (props.recordMap) {
  //   for (const { value: block } of Object.values(props.recordMap.block)) {
  //     switch (block?.type) {
  //       case 'toggle':
  //         block.type += '_nobelium'
  //         break
  //     }
  //   }
  // }

  return (
    <>
      <style jsx global>
        {`
        .notion {
          --notion-font: ${font};
        }
        `}
      </style>
      <Renderer
        components={components}
        mapPageUrl={mapPageUrl}
        {...props}
      />
    </>
  )
}
