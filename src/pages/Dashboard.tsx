import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Linkedin, Video, Youtube, AlertTriangle, Loader2 } from 'lucide-react';

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

export default function Dashboard() {
  const { user } = useAuth();
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, running: 0, ready: 0, posted: 0 });
  const [hasCredentials, setHasCredentials] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [jobsRes, credsRes] = await Promise.all([
        supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('user_api_credentials').select('credential_type'),
      ]);
      if (jobsRes.data) {
        setRecentJobs(jobsRes.data);
        setStats({
          total: jobsRes.data.length,
          running: jobsRes.data.filter((j) => j.status === 'running').length,
          ready: jobsRes.data.filter((j) => j.status === 'ready').length,
          posted: jobsRes.data.filter((j) => j.status === 'posted').length,
        });
      }
      setHasCredentials((credsRes.data?.length ?? 0) > 0);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Button asChild className="rounded-xl">
          <Link to="/jobs/new"><PlusCircle className="mr-2 h-4 w-4" /> New Job</Link>
        </Button>
      </div>

      {!hasCredentials && (
        <div className="flex items-center gap-3 rounded-2xl bg-warning/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Setup required</p>
            <p className="text-xs text-muted-foreground">Add API keys in Settings to start.</p>
          </div>
          <Button variant="secondary" size="sm" className="shrink-0 rounded-lg" asChild>
            <Link to="/settings">Setup</Link>
          </Button>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Running', value: stats.running, color: 'text-warning' },
          { label: 'Ready', value: stats.ready, color: 'text-primary' },
          { label: 'Posted', value: stats.posted, color: 'text-success' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-card border p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold">Recent Jobs</h2>
          <Link to="/jobs" className="text-sm text-primary font-medium">View all</Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="rounded-2xl bg-card border p-8 text-center">
            <p className="text-muted-foreground text-sm">No jobs yet</p>
            <Button asChild className="mt-3 rounded-xl" size="sm">
              <Link to="/jobs/new">Create your first job</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentJobs.map((job) => {
              const FlowIcon = flowIcons[job.flow] || Linkedin;
              return (
                <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center gap-3 rounded-2xl bg-card border p-3.5 active:scale-[0.98] transition-transform">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                    <FlowIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{job.input_text}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{job.flow.replace('_', ' ')} · {job.input_mode}</p>
                  </div>
                  <Badge className={`${statusColors[job.status]} text-[11px] rounded-lg`}>{job.status}</Badge>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-center text-[10px] text-muted-foreground pt-2">
        All content is legal commentary for public awareness only — not legal advice.
      </p>
    </div>
  );
}
