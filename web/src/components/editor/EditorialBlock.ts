import { Node, mergeAttributes } from '@tiptap/core';
import { EDITORIAL_BLOCKS } from '../../lib/articleEditorial';
import type { EditorialBlockKind } from '../../types';

const VALID_KINDS = new Set<EditorialBlockKind>(EDITORIAL_BLOCKS.map((block) => block.kind));

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    editorialBlock: {
      insertEditorialBlock: (kind: EditorialBlockKind) => ReturnType;
    };
  }
}

export const EditorialBlock = Node.create({
  name: 'editorialBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      kind: {
        default: 'dalil',
        parseHTML: (element) => {
          const kind = element.getAttribute('data-editorial-block') as EditorialBlockKind | null;
          return kind && VALID_KINDS.has(kind) ? kind : 'dalil';
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-editorial-block]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const kind = node.attrs.kind as EditorialBlockKind;
    return [
      'section',
      mergeAttributes(HTMLAttributes, {
        'data-editorial-block': VALID_KINDS.has(kind) ? kind : 'dalil',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertEditorialBlock:
        (kind) =>
        ({ commands }) => {
          const block = EDITORIAL_BLOCKS.find((candidate) => candidate.kind === kind);
          if (!block) return false;
          return commands.insertContent({
            type: this.name,
            attrs: { kind },
            content: [
              {
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: block.label }],
              },
              { type: 'paragraph' },
            ],
          });
        },
    };
  },
});
