import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle2, Send, Download, Loader2, AlertCircle, Copy } from 'lucide-react';

const statusColors: Record<string, string> = {
  queued: 'bg-muted text-muted-foreground',
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

  const updateStatus = async (status: string) => {
    if (!id) return;
    const { error } = await supabase.from('jobs').update({ status }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Job ${status}` });
      fetchJob();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Job not found</p>
        <Button variant="outline" asChild><Link to="/jobs">Back to Jobs</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/jobs"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight capitalize">{job.flow.replace('_', ' ')} Job</h1>
          <p className="text-sm text-muted-foreground">
            {job.input_mode} · Created {new Date(job.created_at).toLocaleString()}
            {job.dry_run && ' · Dry run'}
          </p>
        </div>
        <Badge className={`text-sm ${statusColors[job.status]}`}>{job.status}</Badge>
      </div>

      {/* Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Input</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{job.input_text}</p>
        </CardContent>
      </Card>

      {/* Status / Error */}
      {job.status === 'failed' && job.error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Job Failed</p>
              <p className="mt-1 text-sm text-muted-foreground">{job.error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {job.status === 'running' && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <Loader2 className="h-5 w-5 animate-spin text-warning" />
            <p className="font-medium">Processing... This page auto-refreshes every 3 seconds.</p>
          </CardContent>
        </Card>
      )}

      {job.status === 'queued' && (
        <Card className="border-muted">
          <CardContent className="flex items-center gap-3 pt-6">
            <Loader2 className="h-5 w-5 text-muted-foreground" />
            <p className="text-muted-foreground">Job is queued and waiting to be processed.</p>
          </CardContent>
        </Card>
      )}

      {/* Outputs */}
      {outputs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generated Output</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {outputs.map((output) => (
              <div key={output.id} className="space-y-2 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="capitalize">{output.output_type.replace('_', ' ')}</Badge>
                  {output.content && (
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(output.content)}>
                      <Copy className="mr-1 h-3 w-3" /> Copy
                    </Button>
                  )}
                </div>
                {output.content && (
                  <p className="whitespace-pre-wrap text-sm">{output.content}</p>
                )}
                {output.file_path && (
                  <Button variant="outline" size="sm">
                    <Download className="mr-1 h-3 w-3" /> Download Video
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {(job.status === 'ready' || job.status === 'approved') && (
        <div className="flex gap-3">
          {job.status === 'ready' && (
            <Button onClick={() => updateStatus('approved')} className="flex-1">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
            </Button>
          )}
          {job.status === 'approved' && (
            <Button onClick={() => updateStatus('posted')} className="flex-1">
              <Send className="mr-2 h-4 w-4" /> Post
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
