import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bold, Italic, List, Heading2, Link, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RichTextEditorProps {
  /** Current markdown content */
  value: string;
  /** Called with updated content on change */
  onChange: (value: string) => void;
  /** Called when the user clicks save */
  onSave?: (value: string) => void | Promise<void>;
  /** Placeholder text */
  placeholder?: string;
  /** Number of visible rows */
  rows?: number;
  /** Whether save is in progress */
  saving?: boolean;
  /** Show save button */
  showSave?: boolean;
  /** Additional class name */
  className?: string;
}

// ---------------------------------------------------------------------------
// Toolbar helpers
// ---------------------------------------------------------------------------

type WrapAction = {
  prefix: string;
  suffix: string;
};

const ACTIONS: Record<string, WrapAction> = {
  bold: { prefix: '**', suffix: '**' },
  italic: { prefix: '_', suffix: '_' },
  heading: { prefix: '## ', suffix: '' },
  list: { prefix: '- ', suffix: '' },
  link: { prefix: '[', suffix: '](url)' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RichTextEditor({
  value,
  onChange,
  onSave,
  placeholder = 'Write something...',
  rows = 8,
  saving = false,
  showSave = false,
  className = '',
}: RichTextEditorProps) {
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

  const applyAction = useCallback(
    (actionKey: string) => {
      const action = ACTIONS[actionKey];
      if (action === undefined || textareaRef === null) return;

      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;
      const selected = value.slice(start, end);
      const before = value.slice(0, start);
      const after = value.slice(end);

      const newText = `${before}${action.prefix}${selected !== '' ? selected : 'text'}${action.suffix}${after}`;
      onChange(newText);

      // Restore focus
      requestAnimationFrame(() => {
        if (textareaRef !== null) {
          textareaRef.focus();
          const cursorPos = start + action.prefix.length + (selected !== '' ? selected.length : 4);
          textareaRef.setSelectionRange(cursorPos, cursorPos);
        }
      });
    },
    [value, onChange, textareaRef],
  );

  const handleSave = async () => {
    if (onSave !== undefined) {
      await onSave(value);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => applyAction('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => applyAction('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => applyAction('heading')}
          title="Heading"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => applyAction('list')}
          title="List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => applyAction('link')}
          title="Link"
        >
          <Link className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <Textarea
        ref={setTextareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="font-mono text-sm resize-none"
      />

      {/* Save button */}
      {showSave && onSave !== undefined && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving}
            className="gap-1.5"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
}
