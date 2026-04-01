import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Linkedin, Video, Youtube, Loader2, PlusCircle } from 'lucide-react';

const statusColors: Record<string, string> = {
  queued: 'bg-secondary text-muted-foreground',
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

const statuses = ['all', 'queued', 'running', 'ready', 'approved', 'posted', 'failed'];

export default function JobsList() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    const fetchJobs = async () => {
      let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
      if (filter !== 'all') query = query.eq('status', filter as any);
      const { data } = await query;
      setJobs(data ?? []);
      setLoading(false);
    };
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [user, filter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
        <Button asChild className="rounded-xl" size="sm">
          <Link to="/jobs/new"><PlusCircle className="mr-1.5 h-4 w-4" /> New</Link>
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl bg-card border p-8 text-center">
          <p className="text-sm text-muted-foreground">No jobs found</p>
          <Button asChild className="mt-3 rounded-xl" size="sm"><Link to="/jobs/new">Create a job</Link></Button>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => {
            const FlowIcon = flowIcons[job.flow] || Linkedin;
            return (
              <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center gap-3 rounded-2xl bg-card border p-3.5 active:scale-[0.98] transition-transform">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                  <FlowIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{job.input_text}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {job.flow.replace('_', ' ')} · {job.input_mode}
                    {job.dry_run && ' · Dry run'}
                  </p>
                </div>
                <Badge className={`${statusColors[job.status]} text-[11px] rounded-lg`}>{job.status}</Badge>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
