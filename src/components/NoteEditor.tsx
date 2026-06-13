import React from 'react';
import { Editor, EditorContent } from '@tiptap/react';
import { Box } from '@mui/material';
import { Note } from '@/types';

interface Props {
  note: Note;
  editor: Editor | null;
}

export default function NoteEditor({ note, editor }: Props) {
  if (!editor) return null;

  return (
    <Box sx={{ flex: 1 }}>
      <EditorContent editor={editor} />
    </Box>
  );
}
