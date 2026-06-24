'use client';

import { useEffect, useRef, memo } from 'react';
import {
  applyEditorHtml,
  isSameEditorContent,
  normalizeEditorHtml,
} from '@shared/components/editor/quill-content';

let QuillConstructor = null;

async function loadQuill() {
  if (QuillConstructor) return QuillConstructor;
  const Quill = (await import('quill')).default;
  await import('quill/dist/quill.snow.css');
  QuillConstructor = Quill;
  return Quill;
}

function destroyQuillInstance(quill, container) {
  if (quill) {
    quill.off('text-change');
    quill.disable();
  }
  if (container) {
    container.innerHTML = '';
  }
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
    const container = containerRef.current;

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
        applyEditorHtml(quill, initialContent, 'silent');
        isApplyingContentRef.current = false;
      }

      const handleTextChange = () => {
        if (isApplyingContentRef.current) return;
        const html = normalizeEditorHtml(quill.root.innerHTML);
        onChangeRef.current?.(html);
      };

      quill.on('text-change', handleTextChange);
      quillRef.current = quill;
    });

    return () => {
      mounted = false;
      destroyQuillInstance(quillRef.current, container);
      quillRef.current = null;
    };
    // Intentionally mount Quill only once; readOnly/content are updated via separate effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!quillRef.current) return;
    if (isSameEditorContent(quillRef.current, content)) return;

    isApplyingContentRef.current = true;
    applyEditorHtml(quillRef.current, content, 'silent');
    isApplyingContentRef.current = false;
  }, [content]);

  useEffect(() => {
    if (quillRef.current) quillRef.current.enable(!readOnly);
  }, [readOnly]);

  return (
    <div className="quill-editor flex w-full flex-col">
      <div ref={containerRef} />
    </div>
  );
}

export default memo(QuillEditor);
