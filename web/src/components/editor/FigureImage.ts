import { Node, mergeAttributes } from '@tiptap/core';

export interface FigureImageAttrs {
  src: string;
  alt?: string;
  caption?: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figureImage: {
      setFigureImage: (attrs: FigureImageAttrs) => ReturnType;
    };
  }
}

/** Image node that renders as <figure><img><figcaption> so photos can carry an
 *  optional caption. Caption is set/edited via the toolbar's insert dialog
 *  (re-insert to change it) rather than inline contenteditable, to keep this
 *  node a plain atom instead of needing a stateful NodeView. */
export const FigureImage = Node.create({
  name: 'figureImage',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      caption: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-type="figure-image"]',
        getAttrs: (el) => {
          const node = el as HTMLElement;
          const img = node.querySelector('img');
          const cap = node.querySelector('figcaption');
          return {
            src: img?.getAttribute('src') ?? null,
            alt: img?.getAttribute('alt') ?? null,
            caption: cap?.textContent ?? null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { src, alt, caption } = node.attrs as { src: string; alt: string | null; caption: string | null };
    const attrs = mergeAttributes(HTMLAttributes, { 'data-type': 'figure-image' });
    const imgTuple = ['img', { src, alt: alt ?? '' }] as const;
    if (caption) {
      return ['figure', attrs, imgTuple, ['figcaption', {}, caption]];
    }
    return ['figure', attrs, imgTuple];
  },

  addCommands() {
    return {
      setFigureImage:
        (attrs: FigureImageAttrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
