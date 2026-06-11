import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { FontSize } from '@/extensions/FontSize';
import { Box, ToggleButtonGroup, ToggleButton, Select, MenuItem, Divider } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import { Note } from '@/types';

interface Props {
  note: Note;
  onUpdate: (id: string, content: string) => void;
}

const FONTS = ['Arial', 'Georgia', 'Courier New', 'Times New Roman', 'Verdana'];
const FONT_SIZES = ['12', '14', '16', '18', '24', '32'];
const HEADINGS = [
  { label: 'Paragraph', value: 'paragraph' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
];

export default function NoteEditor({ note, onUpdate }: Props) {
  const noteIdRef = useRef(note._id);
  noteIdRef.current = note._id;

  const [, setSelectionVersion] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
    ],
    content: note.content || '<p></p>',
    editorProps: {
      attributes: { class: 'note-editor' },
    },
    onUpdate: ({ editor: ed }) => {
      onUpdate(noteIdRef.current, ed.getHTML());
    },
    onSelectionUpdate: () => {
      setSelectionVersion((v) => v + 1);
    },
  });

  useEffect(() => {
    if (editor && note.content !== editor.getHTML()) {
      editor.commands.setContent(note.content || '<p></p>');
    }
  }, [note._id]);

  if (!editor) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', bgcolor: 'background.paper' }}>
        <ToggleButtonGroup size="small">
          <ToggleButton
            value="bold"
            selected={editor.isActive('bold')}
            onChange={() => editor.chain().focus().toggleBold().run()}
            sx={{ border: 1, borderColor: 'divider', p: 0.5, minWidth: 32 }}
          >
            <FormatBoldIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="italic"
            selected={editor.isActive('italic')}
            onChange={() => editor.chain().focus().toggleItalic().run()}
            sx={{ border: 1, borderColor: 'divider', p: 0.5, minWidth: 32 }}
          >
            <FormatItalicIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="underline"
            selected={editor.isActive('underline')}
            onChange={() => editor.chain().focus().toggleUnderline().run()}
            sx={{ border: 1, borderColor: 'divider', p: 0.5, minWidth: 32 }}
          >
            <FormatUnderlinedIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="bulletList"
            selected={editor.isActive('bulletList')}
            onChange={() => editor.chain().focus().toggleBulletList().run()}
            sx={{ border: 1, borderColor: 'divider', p: 0.5, minWidth: 32 }}
          >
            <FormatListBulletedIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="orderedList"
            selected={editor.isActive('orderedList')}
            onChange={() => editor.chain().focus().toggleOrderedList().run()}
            sx={{ border: 1, borderColor: 'divider', p: 0.5, minWidth: 32 }}
          >
            <FormatListNumberedIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Select
          size="small"
          value={
            editor.isActive('heading', { level: 1 }) ? 'h1' :
            editor.isActive('heading', { level: 2 }) ? 'h2' :
            editor.isActive('heading', { level: 3 }) ? 'h3' : 'paragraph'
          }
          onChange={(e) => {
            const val = e.target.value;
            editor.chain().focus().setParagraph().run();
            if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
            if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
            if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          sx={{ minWidth: 110, height: 32, fontSize: '0.85rem' }}
        >
          {HEADINGS.map((h) => (
            <MenuItem key={h.value} value={h.value}>{h.label}</MenuItem>
          ))}
        </Select>

        <Select
          size="small"
          value={editor.getAttributes('textStyle').fontSize?.replace('px', '') || '16'}
          onChange={(e) => editor.chain().focus().setFontSize(e.target.value + 'px').run()}
          sx={{ minWidth: 80, height: 32, fontSize: '0.85rem' }}
        >
          {FONT_SIZES.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </Select>

        <Select
          size="small"
          value={editor.getAttributes('textStyle').fontFamily || 'Arial'}
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          sx={{ minWidth: 120, height: 32, fontSize: '0.85rem' }}
        >
          {FONTS.map((f) => (
            <MenuItem key={f} value={f} style={{ fontFamily: f }}>{f}</MenuItem>
          ))}
        </Select>
      </Box>

      <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
        <EditorContent editor={editor} />
      </Box>

      <style jsx global>{`
        .ProseMirror { outline: none; min-height: 200px; }
        .ProseMirror p { margin: 0 0 0.5rem 0; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.5rem; }
        .ProseMirror h1 { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.5rem 0; }
        .ProseMirror h2 { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem 0; }
        .ProseMirror h3 { font-size: 1.1rem; font-weight: 600; margin: 0 0 0.5rem 0; }
      `}</style>
    </Box>
  );
}
