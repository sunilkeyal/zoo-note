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
      <Box sx={{ flex: 1 }}>
        <EditorContent editor={editor} />
      </Box>

      <Box
        sx={{
          position: 'sticky',
          bottom: 16,
          alignSelf: 'center',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.3,
          px: 1.5,
          py: 0.5,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          boxShadow: (theme: any) => `0 2px 12px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)'}`,
          mx: 'auto',
          zIndex: 10,
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
      >
        <ToggleButtonGroup size="small" exclusive={false}>
          <ToggleButton
            value="bold"
            selected={editor.isActive('bold')}
            onChange={() => editor.chain().focus().toggleBold().run()}
            sx={{ border: 0, p: 0.5, minWidth: 30, borderRadius: 1 }}
          >
            <FormatBoldIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="italic"
            selected={editor.isActive('italic')}
            onChange={() => editor.chain().focus().toggleItalic().run()}
            sx={{ border: 0, p: 0.5, minWidth: 30, borderRadius: 1 }}
          >
            <FormatItalicIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="underline"
            selected={editor.isActive('underline')}
            onChange={() => editor.chain().focus().toggleUnderline().run()}
            sx={{ border: 0, p: 0.5, minWidth: 30, borderRadius: 1 }}
          >
            <FormatUnderlinedIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.3 }} />

        <ToggleButtonGroup size="small" exclusive={false}>
          <ToggleButton
            value="bulletList"
            selected={editor.isActive('bulletList')}
            onChange={() => editor.chain().focus().toggleBulletList().run()}
            sx={{ border: 0, p: 0.5, minWidth: 30, borderRadius: 1 }}
          >
            <FormatListBulletedIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="orderedList"
            selected={editor.isActive('orderedList')}
            onChange={() => editor.chain().focus().toggleOrderedList().run()}
            sx={{ border: 0, p: 0.5, minWidth: 30, borderRadius: 1 }}
          >
            <FormatListNumberedIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.3 }} />

        <Select
          size="small"
          value={
            editor.isActive('heading', { level: 1 }) ? 'h1' :
            editor.isActive('heading', { level: 2 }) ? 'h2' :
            editor.isActive('heading', { level: 3 }) ? 'h3' : 'paragraph'
          }
          onChange={(e) => {
            const val = e.target.value;
            const chain = editor.chain().focus().setParagraph();
            if (val === 'h1') chain.unsetFontFamily().unsetFontSize().toggleHeading({ level: 1 });
            else if (val === 'h2') chain.unsetFontFamily().unsetFontSize().toggleHeading({ level: 2 });
            else if (val === 'h3') chain.unsetFontFamily().unsetFontSize().toggleHeading({ level: 3 });
            chain.run();
          }}
          sx={{ minWidth: 100, height: 30, fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.3 } }}
        >
          {HEADINGS.map((h) => (
            <MenuItem key={h.value} value={h.value}>{h.label}</MenuItem>
          ))}
        </Select>

        <Select
          size="small"
          disabled={editor.isActive('heading')}
          value={editor.getAttributes('textStyle').fontSize?.replace('px', '') || '16'}
          onChange={(e) => editor.chain().focus().setFontSize(e.target.value + 'px').run()}
          sx={{ minWidth: 70, height: 30, fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.3 } }}
        >
          {FONT_SIZES.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </Select>

        <Select
          size="small"
          value={editor.getAttributes('textStyle').fontFamily || 'Arial'}
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          sx={{ minWidth: 100, height: 30, fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.3 } }}
        >
          {FONTS.map((f) => (
            <MenuItem key={f} value={f} style={{ fontFamily: f }}>{f}</MenuItem>
          ))}
        </Select>
      </Box>
    </Box>
  );
}
