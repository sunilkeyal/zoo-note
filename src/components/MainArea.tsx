import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { FontSize } from '@/extensions/FontSize';
import {
  Box, Typography, Divider, TextField,
  ToggleButtonGroup, ToggleButton, Select, MenuItem,
} from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import { useNotes } from '@/contexts/NoteContext';
import NoteEditor from './NoteEditor';

const FONTS = ['Arial', 'Georgia', 'Courier New', 'Times New Roman', 'Verdana'];
const FONT_SIZES = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '20', '24'];
const HEADINGS = [
  { label: 'Paragraph', value: 'paragraph' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
];

export default function MainArea() {
  const { activeNote, activeNoteId, updateNote } = useNotes();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingUpdate = useRef<{ id: string; content: string } | null>(null);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeNoteIdRef = useRef(activeNoteId);
  activeNoteIdRef.current = activeNoteId;
  const [title, setTitle] = useState('');
  const [, setSelectionVersion] = useState(0);

  const handleUpdate = useCallback((id: string, content: string) => {
    pendingUpdate.current = { id, content };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (pendingUpdate.current) {
        updateNote(pendingUpdate.current.id, { content: pendingUpdate.current.content });
        pendingUpdate.current = null;
      }
    }, 1000);
  }, [updateNote]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
    ],
    content: activeNote?.content || '<p></p>',
    editorProps: {
      attributes: { class: 'note-editor' },
    },
    onUpdate: ({ editor: ed }) => {
      const id = activeNoteIdRef.current;
      if (id) handleUpdate(id, ed.getHTML());
    },
    onSelectionUpdate: () => {
      setSelectionVersion((v) => v + 1);
    },
  });

  useEffect(() => {
    if (editor && activeNote && activeNote.content !== editor.getHTML()) {
      editor.commands.setContent(activeNote.content || '<p></p>');
    }
  }, [activeNote?._id]);

  useEffect(() => {
    if (activeNote) setTitle(activeNote.title);
  }, [activeNote?._id]);

  const handleTitleChange = useCallback((id: string, value: string) => {
    setTitle(value);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      updateNote(id, { title: value });
    }, 600);
  }, [updateNote]);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.default' }}>
      {activeNote ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Toolbar — now above the title */}
          {editor && (
            <Box sx={{ px: '40px', pt: 2, maxWidth: 1140, width: '100%' }}>
              <Box
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.3,
                  px: 1.5, py: 0.5, bgcolor: 'background.paper',
                  border: 1, borderColor: 'divider', borderRadius: 1,
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
                  value={editor.getAttributes('textStyle').fontSize?.replace('px', '') || '15'}
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
          )}

          {/* Title */}
          <Box sx={{ px: '40px', pt: 3, pb: 0, maxWidth: 1140, width: '100%' }}>
            <TextField
              fullWidth
              variant="standard"
              value={title}
              onChange={(e) => handleTitleChange(activeNote._id, e.target.value)}
              slotProps={{
                input: {
                  sx: {
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    '&:before': { borderBottom: 'none' },
                    '&:hover:not(.Mui-disabled, .Mui-error):before': { borderBottom: 'none' },
                    '&:after': { borderBottom: '2px solid' },
                  },
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              Last updated: {new Date(activeNote.updatedAt).toLocaleString()}
            </Typography>
            <Divider sx={{ mt: 1, mb: 0 }} />
          </Box>

          {/* Editor content */}
          <Box sx={{ flex: 1, overflow: 'auto', px: '40px', maxWidth: 1140, width: '100%', py: 2 }}>
            <NoteEditor note={activeNote} editor={editor} />
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Select a note or create a new one
          </Typography>
        </Box>
      )}
    </Box>
  );
}
