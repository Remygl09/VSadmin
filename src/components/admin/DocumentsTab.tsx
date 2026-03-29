import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Upload,
  Loader2,
  Trash2,
  Download,
  File,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Document {
  name: string;
  id: string | null;
  created_at: string | null;
  metadata: Record<string, unknown> | null;
}

interface DocumentsTabProps {
  projectId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i] ?? 'B'}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DocumentsTab({ projectId }: DocumentsTabProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const storagePath = `projects/${projectId}`;

  // -----------------------------------------------------------------------
  // Fetch documents
  // -----------------------------------------------------------------------

  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .list(storagePath, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) throw error;
      setDocuments((data as Document[] | null) ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load documents';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [storagePath, toast]);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  // -----------------------------------------------------------------------
  // Upload
  // -----------------------------------------------------------------------

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files === null || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file === undefined) continue;

        const filePath = `${storagePath}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (error) throw error;
      }

      toast({ title: 'Upload complete', description: `${files.length} file(s) uploaded.` });
      void fetchDocuments();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload file';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current !== null) {
        fileInputRef.current.value = '';
      }
    }
  };

  // -----------------------------------------------------------------------
  // Download
  // -----------------------------------------------------------------------

  const handleDownload = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(`${storagePath}/${fileName}`);

      if (error) throw error;
      if (data === null) return;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to download file';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------

  const handleDelete = async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from('documents')
        .remove([`${storagePath}/${fileName}`]);

      if (error) throw error;

      setDocuments((prev) => prev.filter((d) => d.name !== fileName));
      toast({ title: 'Document deleted' });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete document';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Documents</h3>
          <span className="text-sm text-muted-foreground">({documents.length})</span>
        </div>
        <div>
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => void handleUpload(e)}
          />
          <Button
            size="sm"
            className="gap-1.5"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>

      {/* Document list */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <File className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>No documents yet. Upload files to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const sizeBytes =
              doc.metadata !== null && doc.metadata !== undefined && typeof doc.metadata === 'object' && 'size' in doc.metadata
                ? Number(doc.metadata.size)
                : 0;
            return (
              <div
                key={doc.name}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {sizeBytes > 0 ? formatFileSize(sizeBytes) : ''}
                      {doc.created_at !== null
                        ? ` \u00B7 ${format(new Date(doc.created_at), 'MMM d, yyyy')}`
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => void handleDownload(doc.name)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete document?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete &ldquo;{doc.name}&rdquo;. This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void handleDelete(doc.name)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
