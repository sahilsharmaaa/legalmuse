import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Linkedin, Video, Youtube, Sparkles, AlertTriangle, Link as LinkIcon, MessageSquare, FileText } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type JobFlow = Database['public']['Enums']['job_flow'];
type InputMode = Database['public']['Enums']['input_mode'];

const flows: { id: JobFlow; label: string; icon: typeof Linkedin; description: string; requiredCreds: string[] }[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn Post',
    icon: Linkedin,
    description: '1200–1500 char text post with hook, legal angle, and CTA',
    requiredCreds: ['github_token'],
  },
  {
    id: 'short_video',
    label: 'Instagram Reel / YouTube Short',
    icon: Video,
    description: '45–60 sec avatar video with caption and hashtags',
    requiredCreds: ['github_token', 'heygen_api_key'],
  },
  {
    id: 'youtube_long',
    label: 'YouTube Long-form',
    icon: Youtube,
    description: '5–8 min avatar video with 3 chapters and timestamps',
    requiredCreds: ['github_token', 'heygen_api_key'],
  },
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
    supabase
      .from('user_api_credentials')
      .select('credential_type')
      .then(({ data }) => {
        if (data) setSavedCreds(new Set(data.map((c) => c.credential_type)));
      });
  }, [user]);

  const toggleFlow = (flow: JobFlow) => {
    setSelectedFlows((prev) => {
      const next = new Set(prev);
      next.has(flow) ? next.delete(flow) : next.add(flow);
      return next;
    });
  };

  const missingCreds = (requiredCreds: string[]) =>
    requiredCreds.filter((c) => !savedCreds.has(c));

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      toast({ title: 'Enter content', description: 'Please provide a URL, topic, or draft.', variant: 'destructive' });
      return;
    }
    if (selectedFlows.size === 0) {
      toast({ title: 'Select flows', description: 'Pick at least one content flow.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    const jobRows = Array.from(selectedFlows).map((flow) => ({
      user_id: user!.id,
      flow,
      input_mode: inputMode,
      input_text: inputText.trim(),
      dry_run: dryRun,
      status: 'queued' as const,
    }));

    const { data, error } = await supabase.from('jobs').insert(jobRows).select();

    setSubmitting(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Jobs created!', description: `${data.length} job(s) queued for processing.` });
      navigate('/jobs');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create New Job</h1>
        <p className="text-muted-foreground">Generate legal commentary content from a single trigger</p>
      </div>

      {/* Input Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Input Source</CardTitle>
          <CardDescription>What's the trigger for this content?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="url" className="gap-2"><LinkIcon className="h-3 w-3" /> News URL</TabsTrigger>
              <TabsTrigger value="topic" className="gap-2"><MessageSquare className="h-3 w-3" /> Legal Topic</TabsTrigger>
              <TabsTrigger value="draft" className="gap-2"><FileText className="h-3 w-3" /> Own Draft</TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="mt-4">
              <Input placeholder="https://example.com/legal-news-article" value={inputText} onChange={(e) => setInputText(e.target.value)} />
            </TabsContent>
            <TabsContent value="topic" className="mt-4">
              <Input placeholder="e.g., New data protection amendments in Delhi" value={inputText} onChange={(e) => setInputText(e.target.value)} />
            </TabsContent>
            <TabsContent value="draft" className="mt-4">
              <Textarea placeholder="Paste your draft content here..." rows={6} value={inputText} onChange={(e) => setInputText(e.target.value)} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Flow Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Content Flows</CardTitle>
          <CardDescription>Choose which outputs to generate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {flows.map((flow) => {
            const missing = missingCreds(flow.requiredCreds);
            const disabled = missing.length > 0 && !dryRun;
            return (
              <div
                key={flow.id}
                className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                  selectedFlows.has(flow.id) ? 'border-primary bg-primary/5' : disabled ? 'opacity-50' : 'hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  checked={selectedFlows.has(flow.id)}
                  onCheckedChange={() => !disabled && toggleFlow(flow.id)}
                  disabled={disabled}
                />
                <flow.icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{flow.label}</p>
                  <p className="text-sm text-muted-foreground">{flow.description}</p>
                  {missing.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-warning">
                      <AlertTriangle className="h-3 w-3" />
                      Missing: {missing.join(', ')} — configure in Settings
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <p className="font-medium">Dry Run Mode</p>
            <p className="text-sm text-muted-foreground">Generate text only — skip video rendering and posting (no API costs)</p>
          </div>
          <Switch checked={dryRun} onCheckedChange={setDryRun} />
        </CardContent>
      </Card>

      <Button size="lg" className="w-full" onClick={handleSubmit} disabled={submitting}>
        <Sparkles className="mr-2 h-4 w-4" />
        {submitting ? 'Creating Jobs...' : 'Generate Content'}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        All generated content is legal commentary for public awareness only — not legal advice.
      </p>
    </div>
  );
}
