"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Strikethrough, List, ListOrdered, Heading2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function RichTextEditor({ value, onChange, placeholder, disabled }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
        ],
        content: value,
        editable: !disabled,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 prose prose-sm dark:prose-invert max-w-none',
            },
        },
    });

    if (!editor) {
        return null;
    }

    const IconButton = ({ 
        isActive, 
        onClick, 
        children, 
        'aria-label': ariaLabel 
    }: { 
        isActive: boolean; 
        onClick: () => void; 
        children: React.ReactNode;
        'aria-label': string;
    }) => (
        <button
            type="button"
            aria-label={ariaLabel}
            onClick={onClick}
            className={cn(
                "inline-flex items-center justify-center rounded-sm px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                isActive && "bg-muted text-foreground"
            )}
        >
            {children}
        </button>
    );

    return (
        <div className="flex flex-col gap-2 w-full">
            {!disabled && (
                <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/30 border rounded-md">
                    <IconButton
                        isActive={editor.isActive('heading', { level: 2 })}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        aria-label="Toggle heading"
                    >
                        <Heading2 className="h-4 w-4" />
                    </IconButton>
                    <div className="w-[1px] h-4 bg-border mx-1" />
                    <IconButton
                        isActive={editor.isActive('bold')}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        aria-label="Toggle bold"
                    >
                        <Bold className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                        isActive={editor.isActive('italic')}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        aria-label="Toggle italic"
                    >
                        <Italic className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                        isActive={editor.isActive('strike')}
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        aria-label="Toggle strikethrough"
                    >
                        <Strikethrough className="h-4 w-4" />
                    </IconButton>
                    <div className="w-[1px] h-4 bg-border mx-1" />
                    <IconButton
                        isActive={editor.isActive('bulletList')}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        aria-label="Toggle bullet list"
                    >
                        <List className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                        isActive={editor.isActive('orderedList')}
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        aria-label="Toggle ordered list"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </IconButton>
                </div>
            )}
            <EditorContent editor={editor} />
        </div>
    );
}
