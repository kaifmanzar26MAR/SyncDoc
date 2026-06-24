'use client';

import { useEffect, useRef, memo } from 'react';
import { sanitizeHtml } from '@shared/lib/validations/schemas';

let QuillConstructor = null;

async function loadQuill() {
  if (QuillConstructor) return QuillConstructor;
  const Quill = (await import('quill')).default;
  await import('quill/dist/quill.snow.css');
  QuillConstructor = Quill;
  return Quill;
}

function QuillEditor({ content, onChange, readOnly = false, placeholder = 'Start writing...' }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const contentRef = useRef(content);
  const isApplyingContentRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    let mounted = true;

    loadQuill().then((Quill) => {
      if (!mounted || !containerRef.current || quillRef.current) return;

      const quill = new Quill(containerRef.current, {
        theme: 'snow',
        placeholder,
        readOnly,
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['blockquote', 'code-block'],
            ['link'],
            ['clean'],
          ],
        },
      });

      const initialContent = contentRef.current;
      if (initialContent) {
        isApplyingContentRef.current = true;
        quill.clipboard.dangerouslyPasteHTML(sanitizeHtml(initialContent));
        isApplyingContentRef.current = false;
      }

      quill.on('text-change', () => {
        if (isApplyingContentRef.current) return;
        const html = quill.root.innerHTML;
        onChangeRef.current?.(html === '<p><br></p>' ? '' : html);
      });

      quillRef.current = quill;
    });

    return () => {
      mounted = false;
      quillRef.current = null;
    };
  }, [placeholder, readOnly]);

  useEffect(() => {
    if (!quillRef.current) return;

    const current = quillRef.current.root.innerHTML;
    const next = content || '';
    if (current === next || sanitizeHtml(current) === sanitizeHtml(next)) return;

    const selection = quillRef.current.getSelection();
    isApplyingContentRef.current = true;
    quillRef.current.clipboard.dangerouslyPasteHTML(sanitizeHtml(next));
    isApplyingContentRef.current = false;
    if (selection) quillRef.current.setSelection(selection);
  }, [content]);

  useEffect(() => {
    if (quillRef.current) quillRef.current.enable(!readOnly);
  }, [readOnly]);

  return <div ref={containerRef} className="quill-editor flex w-full flex-col" />;
}

export default memo(QuillEditor);
