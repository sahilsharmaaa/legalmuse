import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Linkedin, Video, Youtube, Loader2, PlusCircle } from 'lucide-react';

const statusColors: Record<string, string> = {
  queued: 'bg-muted text-muted-foreground',
  running: 'bg-warning/15 text-warning',
  ready: 'bg-primary/15 text-primary',
  approved: 'bg-success/15 text-success',
  posted: 'bg-success/15 text-success',
  failed: 'bg-destructive/15 text-destructive',
};

const flowIcons: Record<string, typeof Linkedin> = {
  linkedin: Linkedin,
  short_video: Video,
  youtube_long: Youtube,
};

export default function JobsList() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) return;

    const fetchJobs = async () => {
      let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
      if (filter !== 'all') {
        query = query.eq('status', filter as 'queued' | 'running' | 'ready' | 'approved' | 'posted' | 'failed');
      }
      const { data } = await query;
      setJobs(data ?? []);
      setLoading(false);
    };

    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [user, filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Jobs</h1>
          <p className="text-muted-foreground">{jobs.length} job(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild>
            <Link to="/jobs/new"><PlusCircle className="mr-2 h-4 w-4" /> New Job</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-muted-foreground">No jobs found</p>
            <Button asChild><Link to="/jobs/new">Create your first job</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const FlowIcon = flowIcons[job.flow] || Linkedin;
            return (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <FlowIcon className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{job.input_text}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {job.flow.replace('_', ' ')} · {job.input_mode}
                    {job.dry_run && ' · Dry run'}
                    {' · '}
                    {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={statusColors[job.status]}>{job.status}</Badge>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
