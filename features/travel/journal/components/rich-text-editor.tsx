"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type RichTextEditorProps = {
  value: JSONContent;
  onChange: (content: JSONContent, text: string) => void;
};

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: "What made today worth remembering?" })],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { class: "journal-prose editor-body", "aria-label": "Journal story" } },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getJSON(), currentEditor.getText()),
  });

  if (!editor) return <div className="editor-loading">Preparing your journal…</div>;

  const controls = [
    { label: "Bold", short: "B", active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", short: "I", active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: "Heading", short: "H2", active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Quote", short: "“ ”", active: editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "List", short: "•", active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
  ];

  return (
    <div className="editor-frame">
      <div className="editor-toolbar" aria-label="Text formatting">
        {controls.map((control) => (
          <button key={control.label} type="button" className={control.active ? "active" : ""} aria-label={control.label} aria-pressed={control.active} onClick={control.run}>
            {control.short}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
