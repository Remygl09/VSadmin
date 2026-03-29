import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InlineFieldProps {
  /** Current display value */
  value: string;
  /** Called with the new value when the user confirms the edit */
  onSave: (value: string) => void | Promise<void>;
  /** Optional label shown above the field */
  label?: string;
  /** Use a textarea instead of a single-line input */
  multiline?: boolean;
  /** Placeholder text when value is empty */
  placeholder?: string;
  /** Additional class names on the wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InlineField({
  value,
  onSave,
  label,
  multiline = false,
  placeholder = 'Click to edit...',
  className = '',
}: InlineFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Sync external value changes
  useEffect(() => {
    if (!editing) {
      setDraft(value);
    }
  }, [value, editing]);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current !== null) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (trimmed === value) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      void handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className={className}>
      {label !== undefined && label !== '' && (
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      )}

      {editing ? (
        <div className="flex items-start gap-2">
          {multiline ? (
            <Textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="resize-none text-sm"
              disabled={saving}
            />
          ) : (
            <Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-sm"
              disabled={saving}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleCancel}
            disabled={saving}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className="group flex cursor-pointer items-start gap-2 rounded-md px-2 py-1 hover:bg-muted/50 transition-colors"
          onClick={() => setEditing(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setEditing(true);
            }
          }}
        >
          <span className={`text-sm ${value !== '' ? 'text-foreground' : 'text-muted-foreground italic'}`}>
            {value !== '' ? value : placeholder}
          </span>
          <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );
}
