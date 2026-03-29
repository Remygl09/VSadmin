import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface PaymentData {
  total_amount: number | null;
  has_payment_plan: boolean;
  payment_months: number | null;
  per_user_amount: number | null;
  mrr_percentage: number | null;
  notes: string;
  transcript: string;
}

interface VoicePaymentInputProps {
  onResult: (data: PaymentData) => void;
}

export default function VoicePaymentInput({ onResult }: VoicePaymentInputProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      toast({ title: 'Microphone access denied', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const { data, error } = await supabase.functions.invoke('voice-to-payment', {
        body: formData,
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error as string);

      onResult(data as PaymentData);
      toast({ title: 'Payment details extracted', description: data.transcript ? `"${(data.transcript as string).slice(0, 80)}..."` : undefined });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Voice processing failed', description: msg, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5 font-display">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
      </Button>
    );
  }

  if (recording) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={stopRecording}
        className="gap-1.5 font-display border-destructive/50 text-destructive hover:bg-destructive/10 animate-pulse"
      >
        <MicOff className="h-3.5 w-3.5" /> Stop Recording
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={startRecording} className="gap-1.5 text-muted-foreground hover:text-foreground font-display">
      <Mic className="h-3.5 w-3.5" /> Voice Input
    </Button>
  );
}
