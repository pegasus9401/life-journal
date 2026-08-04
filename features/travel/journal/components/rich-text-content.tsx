"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export function RichTextContent({ content }: { content: JSONContent }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable: false,
    immediatelyRender: false,
    editorProps: { attributes: { class: "journal-prose" } },
  });
  return <EditorContent editor={editor} />;
}
