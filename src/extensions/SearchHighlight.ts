import { Mark } from "@tiptap/core"

export interface SearchHighlightOptions {
  multicolor: boolean
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    searchHighlight: {
      setSearchHighlight: (attributes?: { color?: string }) => ReturnType
      unsetSearchHighlight: () => ReturnType
    }
  }
}

const SearchHighlight = Mark.create<SearchHighlightOptions>({
  name: "searchHighlight",

  addOptions() {
    return { multicolor: true }
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", { style: `background-color: ${HTMLAttributes.color || "#fff9c4"}`, "data-search-highlight": "" }, 0]
  },

  parseHTML() {
    return [{ tag: "span[data-search-highlight]" }]
  },

  addAttributes() {
    return {
      color: { default: "#fff9c4" },
    }
  },

  addCommands() {
    return {
      setSearchHighlight:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes)
        },
      unsetSearchHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },
})

export default SearchHighlight
