import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Node as TiptapNode, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Bold as BoldExt } from '@tiptap/extension-bold';
import { Italic as ItalicExt } from '@tiptap/extension-italic';
import { Strike as StrikeExt } from '@tiptap/extension-strike';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Link } from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Link as LinkIcon, Unlink, List, ListOrdered, Quote, Minus, Eraser, Check, X,
  ImageIcon, Upload, Globe, Trash2, PencilLine,
} from 'lucide-react';

// ─── Color palette ──────────────────────────────────────────────────────────────
const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Red',     value: '#dc2626' },
  { label: 'Orange',  value: '#ea580c' },
  { label: 'Yellow',  value: '#ca8a04' },
  { label: 'Green',   value: '#218545ff' },
  { label: 'Blue',    value: '#164cc2ff' },
  { label: 'Black',   value: '#000000ff' },
  { label: 'Gray',    value: '#6b7280' },
];

// ─── ResizableImage node view ───────────────────────────────────────────────────
function ResizableImageView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { src, alt, width } = node.attrs as { src: string; alt: string; width: number | null };
  const [editingAlt, setEditingAlt] = useState(false);
  const [altDraft, setAltDraft] = useState(alt || '');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);   // ← NEW

  const startResize = useCallback((e: React.MouseEvent, handle: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    // ← Read from the img element so we always get a non-zero value
    const startWidth =
      wrapperRef.current?.getBoundingClientRect().width ||
      imgRef.current?.offsetWidth ||
      width ||
      400;
    const multiplier = handle === 'right' ? 1 : -1;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = (ev.clientX - startX) * multiplier;
      const newWidth = Math.max(80, Math.round(startWidth + delta));
      updateAttributes({ width: newWidth });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  // ← Remove `width` from deps; startWidth is read from DOM at event time
  }, [updateAttributes]);

  const commitAlt = () => {
    updateAttributes({ alt: altDraft });
    setEditingAlt(false);
  };

  return (
    // ← Remove data-drag-handle from here; keep contentEditable false
    <NodeViewWrapper className="rte-image-wrapper" contentEditable={false}>
      <div
        ref={wrapperRef}
        data-drag-handle                          // ← Move here
        className={`rte-image-inner ${selected ? 'rte-image-selected' : ''}`}
        style={{ width: width ? `${width}px` : '100%', maxWidth: '100%' }}
      >
        <img
          ref={imgRef}                            // ← Attach ref
          src={src}
          alt={alt || ''}
          draggable={false}
          className="rte-img"
        />

        <div
          className="rte-resize-handle rte-resize-left"
          onMouseDown={(e) => startResize(e, 'left')}
        />
        <div
          className="rte-resize-handle rte-resize-right"
          onMouseDown={(e) => startResize(e, 'right')}
        />

        {selected && (
          <div className="rte-image-toolbar" contentEditable={false}>
            {editingAlt ? (
              <div className="rte-alt-edit">
                <input
                  autoFocus
                  value={altDraft}
                  onChange={(e) => setAltDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); commitAlt(); }
                    if (e.key === 'Escape') { setEditingAlt(false); setAltDraft(alt || ''); }
                  }}
                  placeholder="Alt text…"
                  className="rte-alt-input"
                />
                <button type="button" onClick={commitAlt} className="rte-tb-btn" title="Save alt text">
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingAlt(false); setAltDraft(alt || ''); }}
                  className="rte-tb-btn"
                  title="Cancel"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { setAltDraft(alt || ''); setEditingAlt(true); }}
                  className="rte-tb-btn rte-tb-alt"
                  title="Edit alt text"
                >
                  <PencilLine size={12} />
                  <span className="rte-tb-label">
                    {alt ? `Alt: ${alt.slice(0, 20)}${alt.length > 20 ? '…' : ''}` : 'Add alt'}
                  </span>
                </button>
                <div className="rte-tb-divider" />
                <button
                  type="button"
                  onClick={() => deleteNode()}
                  className="rte-tb-btn rte-tb-delete"
                  title="Delete image"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ─── Custom ResizableImage Tiptap extension ────────────────────────────────────
const ResizableImage = TiptapNode.create({
  name: 'resizableImage',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src:   { default: null },
      alt:   { default: '' },
      title: { default: null },
      width: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = { ...HTMLAttributes };
    if (attrs.width) attrs.style = `width:${attrs.width}px;max-width:100%`;
    return ['img', mergeAttributes(attrs)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },

  addCommands() {
    return {
      setResizableImage: (options: { src: string; alt?: string; width?: number }) => ({ commands }: any) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    } as any;
  },
});

// ─── Toolbar Button ─────────────────────────────────────────────────────────────
interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`
        flex items-center justify-center rounded px-1.5 py-1 text-xs transition-colors
        ${active ? 'bg-lng-blue text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
        ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-4 bg-gray-200 mx-0.5" />;
}

// ─── Link Popover ───────────────────────────────────────────────────────────────
interface LinkPopoverProps {
  open: boolean;
  initialUrl: string;
  onApply: (url: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

function LinkPopover({ open, initialUrl, onApply, onRemove, onClose }: LinkPopoverProps) {
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setUrl(initialUrl); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open, initialUrl]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); onApply(url.trim()); }
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="absolute top-full left-0 z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
      onMouseDown={(e) => e.preventDefault()}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Insert Link</p>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com"
          className="flex-1 rounded border border-gray-300 px-2.5 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
        />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); onApply(url.trim()); }}
          className="flex items-center gap-1 rounded bg-lng-blue px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors">
          <Check size={12} /> Apply
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        {initialUrl ? (
          <button type="button" onMouseDown={(e) => { e.preventDefault(); onRemove(); }}
            className="flex items-center gap-1 text-[11px] font-medium text-lng-red hover:underline">
            <Unlink size={11} /> Remove link
          </button>
        ) : <span />}
        <button type="button" onMouseDown={(e) => { e.preventDefault(); onClose(); }}
          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600">
          <X size={11} /> Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Image Popover ──────────────────────────────────────────────────────────────
type ImageTab = 'upload' | 'url';

interface ImagePopoverProps {
  open: boolean;
  onInsert: (src: string, alt?: string) => void;
  onClose: () => void;
}

function ImagePopover({ open, onInsert, onClose }: ImagePopoverProps) {
  const [tab, setTab] = useState<ImageTab>('upload');
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setTab('upload'); setUrl(''); setAlt(''); setPreview(null); setError(''); }
  }, [open]);

  if (!open) return null;

  const ACCEPTED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

  const readFile = (file: File) => {
    if (!ACCEPTED.includes(file.type)) { setError('Unsupported type. Use JPG, PNG, GIF, WebP, or SVG.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('File too large. Max 5 MB.'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) readFile(f); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) readFile(f); };

  const handleInsert = () => {
    if (tab === 'upload') {
      if (!preview) { setError('Select an image first.'); return; }
      onInsert(preview, alt || undefined);
    } else {
      const t = url.trim();
      if (!t) { setError('Enter an image URL.'); return; }
      onInsert(/^https?:\/\//i.test(t) ? t : `https://${t}`, alt || undefined);
    }
  };

  return (
    <div className="absolute top-full left-0 z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg"
      onMouseDown={(e) => e.preventDefault()}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-3 pt-3 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Insert Image</p>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); onClose(); }} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {(['upload', 'url'] as ImageTab[]).map((t) => (
          <button key={t} type="button" onMouseDown={(e) => { e.preventDefault(); setTab(t); setError(''); }}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors ${
              tab === t ? 'border-b-2 border-lng-blue text-lng-blue' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'upload' ? <Upload size={11} /> : <Globe size={11} />}
            {t === 'upload' ? 'Upload File' : 'From URL'}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-2.5">
        {tab === 'upload' ? (
          !preview ? (
            <div
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-6 cursor-pointer transition-colors ${dragOver ? 'border-lng-blue bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon size={22} className="text-gray-400 mb-2" />
              <p className="text-[11px] text-gray-500 text-center">Drop here or <span className="text-lng-blue font-medium">browse</span></p>
              <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, GIF, WebP, SVG · max 5 MB</p>
              <input ref={fileInputRef} type="file" accept={ACCEPTED.join(',')} className="hidden" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full rounded-lg border border-gray-200 object-contain max-h-36" />
              <button type="button" onMouseDown={(e) => { e.preventDefault(); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="absolute top-1.5 right-1.5 rounded-full bg-white/90 p-0.5 shadow border border-gray-200" title="Remove">
                <X size={11} className="text-gray-500" />
              </button>
            </div>
          )
        ) : (
          <input autoFocus type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInsert(); } }}
            placeholder="https://example.com/image.png"
            className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue" />
        )}

        <input type="text" value={alt} onChange={(e) => setAlt(e.target.value)}
          placeholder="Alt text (optional — describes the image)"
          className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue" />

        {error && <p className="text-[11px] text-red-500">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-0.5">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); onClose(); }} className="text-[11px] text-gray-400 hover:text-gray-600">Cancel</button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); handleInsert(); }}
            className="flex items-center gap-1 rounded bg-lng-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors">
            <Check size={12} /> Insert
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────────
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  minHeight?: number;
}

// ─── Editor ─────────────────────────────────────────────────────────────────────
export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your message here…',
  disabled = false,
  hasError = false,
  minHeight = 260,
}: RichTextEditorProps) {
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkInitialUrl, setLinkInitialUrl] = useState('');
  const [imagePopoverOpen, setImagePopoverOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, bold: false, italic: false, strike: false }),
      BoldExt.extend({ inclusive: false }),
      ItalicExt.extend({ inclusive: false }),
      StrikeExt.extend({ inclusive: false }),
      Underline.extend({ inclusive: false }),
      TextStyle,
      Color,
      Link.extend({ inclusive: false }).configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank', class: 'text-lng-blue underline font-semibold' },
      }),
      ResizableImage,
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? '' : editor.getHTML();
      onChange(html);
    },
  });

  const prevValueRef = useRef(value);
  if (editor && value !== prevValueRef.current && value !== editor.getHTML()) {
    prevValueRef.current = value;
    if (!value) editor.commands.clearContent();
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setLinkPopoverOpen(false);
        setImagePopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openLinkPopover = () => {
    if (!editor) return;
    setImagePopoverOpen(false);
    setLinkInitialUrl(editor.getAttributes('link').href || '');
    setLinkPopoverOpen(true);
  };

  const applyLink = (url: string) => {
    if (!editor) return;
    setLinkPopoverOpen(false);
    if (!url) { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  const removeLink = () => {
    if (!editor) return;
    setLinkPopoverOpen(false);
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  };

  const openImagePopover = () => {
    if (!editor) return;
    setLinkPopoverOpen(false);
    setImagePopoverOpen(true);
  };

  const insertImage = (src: string, alt?: string) => {
    if (!editor) return;
    setImagePopoverOpen(false);
    (editor.chain().focus() as any).setResizableImage({ src, alt: alt ?? '' }).run();
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!editor) return;
    const color = e.target.value;
    if (!color) editor.chain().focus().unsetColor().run();
    else editor.chain().focus().setColor(color).run();
  };

  return (
    <div className={`relative rounded border bg-white ${hasError ? 'border-lng-red' : 'border-gray-300'} ${disabled ? 'opacity-60' : ''}`}>
      {/* Toolbar */}
      <div ref={toolbarRef} className="relative flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold"><Bold size={13} /></ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic"><Italic size={13} /></ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Underline"><UnderlineIcon size={13} /></ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')} title="Strikethrough"><Strikethrough size={13} /></ToolbarButton>

        <ToolbarDivider />

        <div className="flex items-center gap-1" title="Text Color">
          <div className="w-3 h-3 rounded-full border border-gray-300 ml-1"
            style={{ backgroundColor: editor?.getAttributes('textStyle').color || '#111827' }} />
          <select className="text-xs text-gray-600 border-0 bg-transparent outline-none cursor-pointer py-0.5"
            onChange={handleColorChange} value={editor?.getAttributes('textStyle').color || ''}
            onMouseDown={(e) => e.stopPropagation()}>
            {TEXT_COLORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <ToolbarDivider />

        <div className="relative">
          <ToolbarButton onClick={openLinkPopover} active={editor?.isActive('link')} title="Insert / Edit Link"><LinkIcon size={13} /></ToolbarButton>
          <LinkPopover open={linkPopoverOpen} initialUrl={linkInitialUrl} onApply={applyLink} onRemove={removeLink} onClose={() => setLinkPopoverOpen(false)} />
        </div>

        <div className="relative">
          <ToolbarButton onClick={openImagePopover} active={imagePopoverOpen} title="Insert Image"><ImageIcon size={13} /></ToolbarButton>
          <ImagePopover open={imagePopoverOpen} onInsert={insertImage} onClose={() => setImagePopoverOpen(false)} />
        </div>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet List"><List size={13} /></ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered List"><ListOrdered size={13} /></ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title="Blockquote"><Quote size={13} /></ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Horizontal Rule"><Minus size={13} /></ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor?.chain().focus().unsetAllMarks().run()} title="Clear Formatting"><Eraser size={13} /></ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="prose max-w-none text-sm text-lng-grey outline-none"
        style={{ minHeight }}
        onClick={() => editor?.commands.focus()}
      />

      <style>{`
        .ProseMirror {
          padding: 12px 14px;
          min-height: ${minHeight}px;
          outline: none;
          font-size: 0.875rem;
          color: #374151;
          line-height: 1.625;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror p { margin-bottom: 0.5rem; }
        .ProseMirror p:last-child { margin-bottom: 0; }
        .ProseMirror strong { font-weight: 700; }
        .ProseMirror em { font-style: italic; }
        .ProseMirror u { text-decoration: underline; }
        .ProseMirror s { text-decoration: line-through; }
        .ProseMirror ul { list-style-type: disc; padding-left: 1.25rem; margin-bottom: 0.5rem; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.25rem; margin-bottom: 0.5rem; }
        .ProseMirror li { margin-bottom: 0.25rem; }
        .ProseMirror blockquote {
          border-left: 3px solid #d1d5db;
          padding-left: 0.75rem;
          color: #6b7280;
          font-style: italic;
          margin: 0.5rem 0;
        }
        .ProseMirror hr { border: none; border-top: 1px solid #e5e7eb; margin: 0.75rem 0; }
        .ProseMirror a { color: #1d4ed8; text-decoration: underline; font-weight: 600; }

        /* ── Resizable image node view ── */
        .rte-image-wrapper {
          display: block;
          margin: 0.5rem 0;
        }
        .rte-image-inner {
          position: relative;
          display: inline-block;
          line-height: 0;
          border-radius: 6px;
          transition: outline 0.1s;
        }
        .rte-image-selected {
          outline: 2px solid #164cc2;
          outline-offset: 2px;
        }
        .rte-img {
          display: block;
          width: 100%;
          height: auto;
          border-radius: 6px;
          user-select: none;
        }

        /* Resize handles */
        .rte-resize-handle {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 10px;
          height: 36px;
          background: #164cc2;
          border-radius: 4px;
          opacity: 0;
          transition: opacity 0.15s;
          cursor: ew-resize;
          z-index: 10;
        }
        .rte-image-selected .rte-resize-handle { opacity: 1; }
        .rte-resize-left  { left: -5px; }
        .rte-resize-right { right: -5px; }

        /* Floating toolbar */
        .rte-image-toolbar {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 2px;
          background: #1f2937;
          border-radius: 6px;
          padding: 4px 6px;
          white-space: nowrap;
          z-index: 20;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        }
        .rte-tb-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 11px;
          color: #e5e7eb;
          cursor: pointer;
          transition: background 0.1s;
          background: transparent;
          border: none;
        }
        .rte-tb-btn:hover { background: rgba(255,255,255,0.12); }
        .rte-tb-delete:hover { color: #f87171; }
        .rte-tb-label { font-size: 11px; }
        .rte-tb-divider { width: 1px; height: 14px; background: rgba(255,255,255,0.15); margin: 0 2px; }

        /* Alt text inline edit */
        .rte-alt-edit { display: flex; align-items: center; gap: 4px; }
        .rte-alt-input {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
          color: #fff;
          outline: none;
          width: 160px;
        }
        .rte-alt-input::placeholder { color: rgba(255,255,255,0.4); }
        .rte-alt-input:focus { border-color: rgba(255,255,255,0.5); }
      `}</style>
    </div>
  );
}