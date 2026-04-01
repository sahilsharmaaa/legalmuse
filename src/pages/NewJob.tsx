import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Linkedin, Video, Youtube, Sparkles, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type JobFlow = Database['public']['Enums']['job_flow'];
type InputMode = Database['public']['Enums']['input_mode'];

const inputModes: { id: InputMode; label: string; emoji: string }[] = [
  { id: 'url', label: 'News URL', emoji: '🔗' },
  { id: 'topic', label: 'Topic', emoji: '💬' },
  { id: 'draft', label: 'Draft', emoji: '📝' },
];

const flows: { id: JobFlow; label: string; icon: typeof Linkedin; desc: string; requiredCreds: string[] }[] = [
  { id: 'linkedin', label: 'LinkedIn Post', icon: Linkedin, desc: 'Text post with hook and CTA', requiredCreds: ['github_token'] },
  { id: 'short_video', label: 'Short Video', icon: Video, desc: '45–60s avatar video', requiredCreds: ['github_token', 'heygen_api_key'] },
  { id: 'youtube_long', label: 'YouTube Long', icon: Youtube, desc: '5–8 min with chapters', requiredCreds: ['github_token', 'heygen_api_key'] },
];

export default function NewJob() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [inputText, setInputText] = useState('');
  const [selectedFlows, setSelectedFlows] = useState<Set<JobFlow>>(new Set());
  const [dryRun, setDryRun] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedCreds, setSavedCreds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase.from('user_api_credentials').select('credential_type').then(({ data }) => {
      if (data) setSavedCreds(new Set(data.map((c) => c.credential_type)));
    });
  }, [user]);

  const toggleFlow = (flow: JobFlow) => {
    setSelectedFlows((prev) => { const n = new Set(prev); n.has(flow) ? n.delete(flow) : n.add(flow); return n; });
  };

  const missingCreds = (required: string[]) => required.filter((c) => !savedCreds.has(c));

  const handleSubmit = async () => {
    if (!inputText.trim()) { toast({ title: 'Enter content', variant: 'destructive' }); return; }
    if (selectedFlows.size === 0) { toast({ title: 'Select a flow', variant: 'destructive' }); return; }
    setSubmitting(true);
    const rows = Array.from(selectedFlows).map((flow) => ({
      user_id: user!.id, flow, input_mode: inputMode, input_text: inputText.trim(), dry_run: dryRun, status: 'queued' as const,
    }));
    const { data, error } = await supabase.from('jobs').insert(rows).select();
    setSubmitting(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: `${data.length} job(s) created` }); navigate('/jobs'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">New Job</h1>

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

      {/* Flow selection */}
      <section>
        <p className="text-[13px] font-medium text-muted-foreground mb-2">Content flows</p>
        <div className="space-y-2">
          {flows.map((flow) => {
            const missing = missingCreds(flow.requiredCreds);
            const disabled = missing.length > 0 && !dryRun;
            const selected = selectedFlows.has(flow.id);
            return (
              <button
                key={flow.id}
                type="button"
                onClick={() => !disabled && toggleFlow(flow.id)}
                disabled={disabled}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.98]',
                  selected ? 'border-primary bg-primary/5' : 'bg-card',
                  disabled && 'opacity-50 cursor-not-allowed'
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
                  {missing.length > 0 && (
                    <p className="text-[11px] text-warning mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Missing: {missing.join(', ')}
                    </p>
                  )}
                </div>
                {selected && <Check className="h-5 w-5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Dry run */}
      <div className="flex items-center justify-between rounded-2xl bg-card border p-4">
        <div>
          <p className="text-sm font-medium">Dry Run</p>
          <p className="text-[11px] text-muted-foreground">Text only — no API costs</p>
        </div>
        <Switch checked={dryRun} onCheckedChange={setDryRun} />
      </div>

      <Button size="lg" className="w-full h-12 rounded-xl text-[15px] font-semibold" onClick={handleSubmit} disabled={submitting}>
        <Sparkles className="mr-2 h-4 w-4" />
        {submitting ? 'Creating...' : 'Generate Content'}
      </Button>

      <p className="text-center text-[10px] text-muted-foreground">
        All content is legal commentary only — not legal advice.
      </p>
    </div>
  );
}
