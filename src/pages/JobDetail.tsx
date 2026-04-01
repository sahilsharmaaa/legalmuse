import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle2, Send, Download, Loader2, AlertCircle, Copy } from 'lucide-react';

const statusColors: Record<string, string> = {
  queued: 'bg-secondary text-muted-foreground',
  running: 'bg-warning/15 text-warning',
  ready: 'bg-primary/15 text-primary',
  approved: 'bg-success/15 text-success',
  posted: 'bg-success/15 text-success',
  failed: 'bg-destructive/15 text-destructive',
};

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [job, setJob] = useState<any>(null);
  const [outputs, setOutputs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJob = async () => {
    if (!id) return;
    const [jobRes, outputsRes] = await Promise.all([
      supabase.from('jobs').select('*').eq('id', id).single(),
      supabase.from('job_outputs').select('*').eq('job_id', id),
    ]);
    if (jobRes.data) setJob(jobRes.data);
    if (outputsRes.data) setOutputs(outputsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchJob();
    const interval = setInterval(fetchJob, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const updateStatus = async (status: 'approved' | 'posted') => {
    if (!id) return;
    const { error } = await supabase.from('jobs').update({ status }).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: `Job ${status}` }); fetchJob(); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!' });
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  if (!job) return (
    <div className="flex flex-col items-center gap-4 py-16">
      <AlertCircle className="h-8 w-8 text-muted-foreground" />
      <p className="text-muted-foreground">Job not found</p>
      <Button variant="outline" className="rounded-xl" asChild><Link to="/jobs">Back to Jobs</Link></Button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" asChild>
          <Link to="/jobs"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold tracking-tight capitalize">{job.flow.replace('_', ' ')}</h1>
          <p className="text-[11px] text-muted-foreground">
            {job.input_mode} · {new Date(job.created_at).toLocaleDateString()}
            {job.dry_run && ' · Dry run'}
          </p>
        </div>
        <Badge className={`${statusColors[job.status]} text-xs rounded-lg`}>{job.status}</Badge>
      </div>

      {/* Input */}
      <div className="rounded-2xl bg-card border p-4">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Input</p>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{job.input_text}</p>
      </div>

      {/* Status banners */}
      {job.status === 'failed' && job.error && (
        <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-semibold text-destructive">Failed</p>
            <p className="text-xs text-muted-foreground mt-1">{job.error}</p>
          </div>
        </div>
      )}

      {job.status === 'running' && (
        <div className="rounded-2xl bg-warning/10 border border-warning/20 p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-warning" />
          <p className="text-sm font-medium">Processing… auto-refreshes every 3s</p>
        </div>
      )}

      {job.status === 'queued' && (
        <div className="rounded-2xl bg-secondary p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Queued — waiting to process</p>
        </div>
      )}

      {/* Outputs */}
      {outputs.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold mb-3">Output</p>
          <div className="space-y-3">
            {outputs.map((output) => (
              <div key={output.id} className="rounded-2xl bg-card border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="capitalize rounded-lg text-[11px]">{output.output_type.replace('_', ' ')}</Badge>
                  {output.content && (
                    <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs" onClick={() => copyToClipboard(output.content)}>
                      <Copy className="mr-1 h-3 w-3" /> Copy
                    </Button>
                  )}
                </div>
                {output.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{output.content}</p>}
                {output.file_path && (
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {(job.status === 'ready' || job.status === 'approved') && (
        <div className="flex gap-3">
          {job.status === 'ready' && (
            <Button onClick={() => updateStatus('approved')} className="flex-1 h-11 rounded-xl text-[15px] font-semibold">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
            </Button>
          )}
          {job.status === 'approved' && (
            <Button onClick={() => updateStatus('posted')} className="flex-1 h-11 rounded-xl text-[15px] font-semibold">
              <Send className="mr-2 h-4 w-4" /> Post
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
