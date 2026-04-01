import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Linkedin, Video, Youtube, AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react';

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
        supabase
          .from('jobs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('user_api_credentials')
          .select('credential_type'),
      ]);

      if (jobsRes.data) {
        setRecentJobs(jobsRes.data);
        const all = jobsRes.data;
        setStats({
          total: all.length,
          running: all.filter((j) => j.status === 'running').length,
          ready: all.filter((j) => j.status === 'ready').length,
          posted: all.filter((j) => j.status === 'posted').length,
        });
      }

      setHasCredentials((credsRes.data?.length ?? 0) > 0);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your legal content generation hub</p>
        </div>
        <Button asChild>
          <Link to="/jobs/new">
            <PlusCircle className="mr-2 h-4 w-4" /> New Job
          </Link>
        </Button>
      </div>

      {!hasCredentials && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <p className="font-medium">Setup required</p>
              <p className="text-sm text-muted-foreground">Add your API keys in Settings to start generating content.</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Jobs', value: stats.total, icon: Clock },
          { label: 'Running', value: stats.running, icon: Loader2 },
          { label: 'Ready to Review', value: stats.ready, icon: CheckCircle2 },
          { label: 'Posted', value: stats.posted, icon: CheckCircle2 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <stat.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Jobs</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/jobs">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No jobs yet. Create your first one!</p>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => {
                const FlowIcon = flowIcons[job.flow] || Linkedin;
                return (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <FlowIcon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{job.input_text}</p>
                      <p className="text-xs text-muted-foreground capitalize">{job.flow.replace('_', ' ')} · {job.input_mode}</p>
                    </div>
                    <Badge className={statusColors[job.status]}>{job.status}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        All content generated is legal commentary for public awareness only — not legal advice.
      </p>
    </div>
  );
}
