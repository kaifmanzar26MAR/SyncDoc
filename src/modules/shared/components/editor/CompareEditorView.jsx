'use client';

import { memo } from 'react';

function CompareEditorView({ html }) {
  return (
    <div className="quill-editor compare-editor flex w-full flex-col">
      <div className="ql-editor" dangerouslySetInnerHTML={{ __html: html || '<p><br></p>' }} />
    </div>
  );
}

export default memo(CompareEditorView);
