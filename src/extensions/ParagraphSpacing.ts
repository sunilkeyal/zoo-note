import { Extension } from '@tiptap/core';

export interface ParagraphSpacingOptions {
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      setParagraphSpacing: (spacing: string) => ReturnType;
      unsetParagraphSpacing: () => ReturnType;
    };
  }
}

export const ParagraphSpacing = Extension.create<ParagraphSpacingOptions>({
  name: 'paragraphSpacing',

  addOptions() {
    return {
      types: ['paragraph', 'listItem'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          paragraphSpacing: {
            default: null,
            parseHTML: (element) => element.style.marginBottom?.replace(/['"]+/g, '') || null,
            renderHTML: (attributes) => {
              if (!attributes.paragraphSpacing) return {};
              return { style: `margin-top: ${attributes.paragraphSpacing}; margin-bottom: ${attributes.paragraphSpacing}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphSpacing:
        (spacing: string) =>
        ({ chain }) =>
          chain()
            .focus()
            .updateAttributes('paragraph', { paragraphSpacing: spacing })
            .updateAttributes('listItem', { paragraphSpacing: spacing })
            .run(),
      unsetParagraphSpacing:
        () =>
        ({ chain }) =>
          chain()
            .focus()
            .updateAttributes('paragraph', { paragraphSpacing: null })
            .updateAttributes('listItem', { paragraphSpacing: null })
            .run(),
    };
  },
});
