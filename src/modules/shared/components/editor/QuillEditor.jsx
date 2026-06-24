'use client';

import { useEffect, useRef, useCallback, memo } from 'react';
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

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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

      if (content) {
        quill.clipboard.dangerouslyPasteHTML(sanitizeHtml(content));
      }

      quill.on('text-change', () => {
        const html = quill.root.innerHTML;
        onChangeRef.current?.(html === '<p><br></p>' ? '' : html);
      });

      quillRef.current = quill;
    });

    return () => {
      mounted = false;
    };
  }, [placeholder, readOnly]);

  useEffect(() => {
    if (!quillRef.current) return;
    const current = quillRef.current.root.innerHTML;
    const next = content || '';
    if (current !== next && sanitizeHtml(current) !== sanitizeHtml(next)) {
      const selection = quillRef.current.getSelection();
      quillRef.current.clipboard.dangerouslyPasteHTML(sanitizeHtml(next));
      if (selection) quillRef.current.setSelection(selection);
    }
  }, [content]);

  useEffect(() => {
    if (quillRef.current) quillRef.current.enable(!readOnly);
  }, [readOnly]);

  return <div ref={containerRef} className="quill-editor flex-1 min-h-[400px]" />;
}

export default memo(QuillEditor);
