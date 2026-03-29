import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  Send,
  AlertCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectInfo {
  id: string;
  company_name: string;
}

interface Question {
  id: number;
  text: string;
}

const DEFAULT_QUESTIONS: Question[] = [
  { id: 1, text: 'What does your company do in one sentence?' },
  { id: 2, text: 'Who is your ideal customer?' },
  { id: 3, text: 'What problem does your product solve?' },
  { id: 4, text: 'What makes your solution unique compared to alternatives?' },
  { id: 5, text: 'What are your top three goals for the next 6 months?' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PublicVoiceForm() {
  const { token } = useParams<{ token: string }>();

  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [textAnswer, setTextAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Audio recording state
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // -------------------------------------------------------------------------
  // Resolve token to project
  // -------------------------------------------------------------------------

  const resolveToken = useCallback(async () => {
    if (token === undefined || token === '') {
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, company_name')
        .eq('voice_form_token', token)
        .maybeSingle();

      if (error !== null) throw error;

      if (data === null) {
        setNotFound(true);
      } else {
        setProject(data as ProjectInfo);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void resolveToken();
  }, [resolveToken]);

  // -------------------------------------------------------------------------
  // Audio recording
  // -------------------------------------------------------------------------

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setAudioBlob(null);
      setAudioUrl(null);
    } catch {
      // Microphone permission denied or unavailable
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current !== null && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const discardRecording = () => {
    if (audioUrl !== null) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
  };

  // -------------------------------------------------------------------------
  // Submit answer
  // -------------------------------------------------------------------------

  const handleSubmitAnswer = async () => {
    if (project === null) return;

    const currentQuestion = DEFAULT_QUESTIONS[currentQuestionIndex];
    if (currentQuestion === undefined) return;

    const hasText = textAnswer.trim() !== '';
    const hasAudio = audioBlob !== null;

    if (!hasText && !hasAudio) return;

    setSubmitting(true);
    try {
      let uploadedAudioUrl: string | null = null;

      // Upload audio if present
      if (hasAudio && audioBlob !== null) {
        const filename = `voice/${project.id}/${Date.now()}_q${currentQuestion.id}.webm`;
        const { error: uploadError } = await supabase.storage
          .from('voice-recordings')
          .upload(filename, audioBlob, { contentType: 'audio/webm' });

        if (uploadError === null) {
          const { data: urlData } = supabase.storage
            .from('voice-recordings')
            .getPublicUrl(filename);
          uploadedAudioUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from('voice_responses').insert({
        project_id: project.id,
        question: currentQuestion.text,
        audio_url: uploadedAudioUrl,
        transcript: hasText ? textAnswer.trim() : null,
      });

      if (error) throw error;

      // Move to next question or complete
      if (currentQuestionIndex + 1 >= DEFAULT_QUESTIONS.length) {
        setCompleted(true);
      } else {
        setCurrentQuestionIndex((prev) => prev + 1);
        setTextAnswer('');
        discardRecording();
      }
    } catch {
      // Silently fail for public form - avoid exposing errors
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render: loading
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: not found
  // -------------------------------------------------------------------------

  if (notFound || project === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">Form Not Found</h1>
        <p className="max-w-md text-muted-foreground">
          This voice form link is invalid or has expired. Please contact your
          Vision Software representative for a new link.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: completed
  // -------------------------------------------------------------------------

  if (completed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        <h1 className="text-2xl font-bold text-foreground">Thank You!</h1>
        <p className="max-w-md text-muted-foreground">
          Your responses have been submitted. The Vision Software team will
          review them shortly.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: question form
  // -------------------------------------------------------------------------

  const currentQuestion = DEFAULT_QUESTIONS[currentQuestionIndex];
  if (currentQuestion === undefined) return null;

  const hasAnswer = textAnswer.trim() !== '' || audioBlob !== null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand header */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">Vision Software</h1>
          <p className="text-sm text-muted-foreground">
            Voice form for {project.company_name}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-1">
          {DEFAULT_QUESTIONS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                idx < currentQuestionIndex
                  ? 'bg-primary'
                  : idx === currentQuestionIndex
                    ? 'bg-primary/60'
                    : 'bg-border'
              }`}
            />
          ))}
        </div>

        {/* Question card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Question {currentQuestionIndex + 1} of {DEFAULT_QUESTIONS.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg font-medium text-foreground">
              {currentQuestion.text}
            </p>

            {/* Text answer */}
            <Textarea
              placeholder="Type your answer here..."
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              rows={4}
              className="resize-none"
            />

            {/* Audio recorder */}
            <div className="flex items-center gap-3">
              {recording ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={stopRecording}
                >
                  <MicOff className="h-4 w-4" />
                  Stop Recording
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void startRecording()}
                >
                  <Mic className="h-4 w-4" />
                  {audioBlob !== null ? 'Re-record' : 'Record Audio'}
                </Button>
              )}

              {audioBlob !== null && !recording && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={discardRecording}
                >
                  Discard
                </Button>
              )}
            </div>

            {/* Audio preview */}
            {audioUrl !== null && !recording && (
              <audio controls className="w-full" src={audioUrl} />
            )}

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => void handleSubmitAnswer()}
                disabled={submitting || !hasAnswer}
                className="gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submitting
                  ? 'Submitting...'
                  : currentQuestionIndex + 1 >= DEFAULT_QUESTIONS.length
                    ? 'Submit & Finish'
                    : 'Next Question'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
