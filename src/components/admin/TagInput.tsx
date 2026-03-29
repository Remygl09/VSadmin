import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TagInputProps {
  /** Current list of tags */
  tags: string[];
  /** Called when tags are added or removed */
  onChange: (tags: string[]) => void;
  /** Placeholder for the input */
  placeholder?: string;
  /** Maximum number of tags allowed (0 = unlimited) */
  maxTags?: number;
  /** Additional class name */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TagInput({
  tags,
  onChange,
  placeholder = 'Add a tag...',
  maxTags = 0,
  className = '',
}: TagInputProps) {
  const [input, setInput] = useState('');

  const addTag = (raw: string) => {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed === '') return;
    if (tags.includes(trimmed)) return;
    if (maxTags > 0 && tags.length >= maxTags) return;

    onChange([...tags, trimmed]);
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      const lastTag = tags[tags.length - 1];
      if (lastTag !== undefined) {
        removeTag(lastTag);
      }
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 text-xs">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (input.trim() !== '') {
            addTag(input);
          }
        }}
        placeholder={maxTags > 0 && tags.length >= maxTags ? 'Max tags reached' : placeholder}
        disabled={maxTags > 0 && tags.length >= maxTags}
        className="text-sm"
      />
    </div>
  );
}
