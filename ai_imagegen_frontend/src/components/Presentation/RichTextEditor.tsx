import React, { useRef, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  height?: number;
  readOnly?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = "Start writing your content...",
  height = 400,
  readOnly = false
}) => {
  const editorRef = useRef<any>(null);

  const handleEditorChange = (content: string) => {
    onChange(content);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <Editor
        apiKey="6trplp0o4wjom0w7fhwxgkfkiqswczow8n0zxjtwnjbd68mq"
        onInit={(evt, editor) => editorRef.current = editor}
        value={content}
        onEditorChange={handleEditorChange}
        init={{
          height: height,
          menubar: true,
          readonly: readOnly,
          placeholder: placeholder,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
            'emoticons', 'template', 'codesample'
          ],
          toolbar: 
            'undo redo | blocks | ' +
            'bold italic forecolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | table | link image media | code preview | help',
          content_style: `
            body { 
              font-family: 'Inter', Arial, sans-serif; 
              font-size: 14px; 
              line-height: 1.6;
              margin: 20px;
            }
            h1, h2, h3, h4, h5, h6 {
              font-weight: 600;
              margin: 20px 0 10px 0;
              color: #1f2937;
            }
            p {
              margin: 0 0 15px 0;
            }
            ul, ol {
              margin: 15px 0;
              padding-left: 30px;
            }
            li {
              margin-bottom: 5px;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 20px 0;
            }
            table, th, td {
              border: 1px solid #e5e7eb;
            }
            th, td {
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #f9fafb;
              font-weight: 600;
            }
            blockquote {
              border-left: 4px solid #3b82f6;
              margin: 20px 0;
              padding: 10px 20px;
              background-color: #f8faff;
              font-style: italic;
            }
            code {
              background-color: #f1f5f9;
              padding: 2px 6px;
              border-radius: 4px;
              font-family: 'Monaco', 'Consolas', monospace;
              font-size: 12px;
            }
            pre {
              background-color: #1e293b;
              color: #e2e8f0;
              padding: 20px;
              border-radius: 8px;
              overflow-x: auto;
              margin: 20px 0;
            }
            pre code {
              background-color: transparent;
              padding: 0;
              color: inherit;
            }
          `,
          branding: false,
          elementpath: false,
          resize: true,
          contextmenu: 'link image table',
          table_appearance_options: true,
          table_grid: true,
          table_resize_bars: true,
          image_advtab: true,
          image_caption: true,
          image_description: false,
          image_dimensions: false,
          image_title: true,
          link_assume_external_targets: true,
          link_context_toolbar: true,
          templates: [
            {
              title: 'Meeting Notes',
              description: 'Template for meeting notes',
              content: `
                <h2>Meeting Notes - [Date]</h2>
                <h3>Attendees</h3>
                <ul>
                  <li>Name 1</li>
                  <li>Name 2</li>
                </ul>
                <h3>Agenda</h3>
                <ol>
                  <li>Topic 1</li>
                  <li>Topic 2</li>
                </ol>
                <h3>Action Items</h3>
                <ul>
                  <li>[ ] Action item 1</li>
                  <li>[ ] Action item 2</li>
                </ul>
              `
            },
            {
              title: 'Research Paper',
              description: 'Academic research paper structure',
              content: `
                <h1>Research Paper Title</h1>
                <h2>Abstract</h2>
                <p>Brief summary of the research...</p>
                <h2>Introduction</h2>
                <p>Background and context...</p>
                <h2>Literature Review</h2>
                <p>Review of existing work...</p>
                <h2>Methodology</h2>
                <p>Research methods and approach...</p>
                <h2>Results</h2>
                <p>Findings and analysis...</p>
                <h2>Discussion</h2>
                <p>Interpretation of results...</p>
                <h2>Conclusion</h2>
                <p>Summary and implications...</p>
                <h2>References</h2>
                <p>Citations and bibliography...</p>
              `
            }
          ]
        }}
      />
    </div>
  );
};

export default RichTextEditor;