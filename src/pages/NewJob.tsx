import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Linkedin, Video, Youtube, Sparkles, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type JobFlow = Database['public']['Enums']['job_flow'];
type InputMode = Database['public']['Enums']['input_mode'];

const inputModes: { id: InputMode; label: string; emoji: string }[] = [
  { id: 'url', label: 'News URL', emoji: '🔗' },
  { id: 'topic', label: 'Topic', emoji: '💬' },
  { id: 'draft', label: 'Draft', emoji: '📝' },
];

const flows: { id: JobFlow; label: string; icon: typeof Linkedin; desc: string }[] = [
  { id: 'linkedin', label: 'LinkedIn Post', icon: Linkedin, desc: 'Text post with hook and CTA' },
  { id: 'short_video', label: 'Short Video Script', icon: Video, desc: '45–60s avatar video script' },
  { id: 'youtube_long', label: 'YouTube Long Script', icon: Youtube, desc: '5–8 min with chapters' },
];

export default function NewJob() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [inputMode, setInputMode] = useState<InputMode>('topic');
  const [inputText, setInputText] = useState('');
  const [selectedFlow, setSelectedFlow] = useState<JobFlow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [usedTrial, setUsedTrial] = useState(false);
  const [checkingUsage, setCheckingUsage] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .in('status', ['ready', 'approved', 'posted', 'running', 'queued'])
      .then(({ count }) => {
        setUsedTrial((count ?? 0) >= 1);
        setCheckingUsage(false);
      });
  }, [user]);

  const handleSubmit = async () => {
    if (!inputText.trim()) { toast({ title: 'Enter content', variant: 'destructive' }); return; }
    if (!selectedFlow) { toast({ title: 'Select a flow', variant: 'destructive' }); return; }
    if (usedTrial) { toast({ title: 'Trial limit reached', description: 'You get 1 free generation in this POC.', variant: 'destructive' }); return; }

    setSubmitting(true);

    const { data, error } = await supabase.from('jobs').insert({
      user_id: user!.id,
      flow: selectedFlow,
      input_mode: inputMode,
      input_text: inputText.trim(),
      dry_run: true,
      status: 'queued' as const,
    }).select().single();

    if (error || !data) {
      setSubmitting(false);
      toast({ title: 'Error', description: error?.message || 'Failed to create job', variant: 'destructive' });
      return;
    }

    // Trigger processing
    const { error: fnError } = await supabase.functions.invoke('process-job', {
      body: { job_id: data.id },
    });

    setSubmitting(false);

    if (fnError) {
      toast({ title: 'Processing error', description: fnError.message, variant: 'destructive' });
    } else {
      toast({ title: 'Job created! Generating content...' });
    }

    navigate(`/jobs/${data.id}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">New Job</h1>

      {/* Trial banner */}
      {usedTrial && !checkingUsage && (
        <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 border border-destructive/20 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-semibold text-destructive">Trial limit reached</p>
            <p className="text-xs text-muted-foreground">You've used your 1 free generation in this POC.</p>
          </div>
        </div>
      )}

      {!usedTrial && !checkingUsage && (
        <div className="flex items-center gap-3 rounded-2xl bg-primary/10 border border-primary/20 p-4">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-primary">POC Trial</p>
            <p className="text-xs text-muted-foreground">You have 1 free AI generation. No API keys needed — powered by Lovable AI.</p>
          </div>
        </div>
      )}

      {/* Input mode picker */}
      <section>
        <p className="text-[13px] font-medium text-muted-foreground mb-2">Input source</p>
        <div className="flex rounded-xl bg-secondary p-1">
          {inputModes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setInputMode(m.id)}
              className={cn(
                'flex-1 rounded-lg py-2.5 text-sm font-medium transition-all',
                inputMode === m.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
              )}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </section>

      {/* Input text */}
      <section>
        {inputMode === 'draft' ? (
          <Textarea placeholder="Paste your draft content..." rows={5} className="rounded-xl bg-secondary border-0 text-sm resize-none" value={inputText} onChange={(e) => setInputText(e.target.value)} />
        ) : (
          <Input
            placeholder={inputMode === 'url' ? 'https://example.com/article' : 'e.g., New data protection amendments in Delhi'}
            className="h-12 rounded-xl bg-secondary border-0 text-[15px]"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        )}
      </section>

      {/* Flow selection — single select */}
      <section>
        <p className="text-[13px] font-medium text-muted-foreground mb-2">Choose a flow</p>
        <div className="space-y-2">
          {flows.map((flow) => {
            const selected = selectedFlow === flow.id;
            return (
              <button
                key={flow.id}
                type="button"
                onClick={() => setSelectedFlow(flow.id)}
                disabled={usedTrial}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.98]',
                  selected ? 'border-primary bg-primary/5' : 'bg-card',
                  usedTrial && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                )}>
                  <flow.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{flow.label}</p>
                  <p className="text-[11px] text-muted-foreground">{flow.desc}</p>
                </div>
                {selected && <Check className="h-5 w-5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>

      <Button
        size="lg"
        className="w-full h-12 rounded-xl text-[15px] font-semibold"
        onClick={handleSubmit}
        disabled={submitting || usedTrial || checkingUsage}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {submitting ? 'Generating...' : 'Generate Content'}
      </Button>

      <p className="text-center text-[10px] text-muted-foreground">
        All content is legal commentary only — not legal advice.
      </p>
    </div>
  );
}
