import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Save, Eye, EyeOff, Shield, Loader2 } from 'lucide-react';

const credentialFields = [
  { type: 'github_token', label: 'GitHub / Copilot Token', placeholder: 'ghp_...', description: 'Used for LLM content generation via GitHub Copilot API' },
  { type: 'heygen_api_key', label: 'HeyGen API Key', placeholder: 'your-heygen-key', description: 'For avatar video generation' },
  { type: 'linkedin_access_token', label: 'LinkedIn Access Token', placeholder: 'your-linkedin-token', description: 'For posting LinkedIn content' },
  { type: 'meta_access_token', label: 'Meta Access Token', placeholder: 'your-meta-token', description: 'For Instagram Reels posting' },
  { type: 'instagram_account_id', label: 'Instagram Account ID', placeholder: '1234567890', description: 'Your Instagram business account ID' },
  { type: 'youtube_api_key', label: 'YouTube API Key', placeholder: 'your-youtube-key', description: 'For YouTube video uploads (future)' },
];

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [savedTypes, setSavedTypes] = useState<Set<string>>(new Set());
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [avatarId, setAvatarId] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [delhiContext, setDelhiContext] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [credsRes, profileRes] = await Promise.all([
        supabase.from('user_api_credentials').select('credential_type'),
        supabase.from('content_profiles').select('*').maybeSingle(),
      ]);

      if (credsRes.data) {
        setSavedTypes(new Set(credsRes.data.map((c) => c.credential_type)));
      }

      if (profileRes.data) {
        setAvatarId(profileRes.data.heygen_avatar_id ?? '');
        setVoiceId(profileRes.data.heygen_voice_id ?? '');
        setDelhiContext(profileRes.data.delhi_context_enabled);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const saveCredential = async (type: string) => {
    const value = credentials[type];
    if (!value?.trim()) {
      toast({ title: 'Error', description: 'Please enter a value.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const { error } = await supabase
      .from('user_api_credentials')
      .upsert(
        { user_id: user!.id, credential_type: type, encrypted_value: value, credential_label: type },
        { onConflict: 'user_id,credential_type' }
      );

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setSavedTypes((prev) => new Set(prev).add(type));
      setCredentials((prev) => ({ ...prev, [type]: '' }));
      toast({ title: 'Saved', description: `${type} has been saved securely.` });
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('content_profiles')
      .upsert(
        {
          user_id: user.id,
          heygen_avatar_id: avatarId || null,
          heygen_voice_id: voiceId || null,
          delhi_context_enabled: delhiContext,
        },
        { onConflict: 'user_id' }
      );

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile saved' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your API credentials and content profile</p>
      </div>

      {/* API Credentials */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">API Credentials</CardTitle>
          </div>
          <CardDescription>Your tokens are stored securely and only used server-side during job execution.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {credentialFields.map((field) => {
            const isVisible = visibleFields.has(field.type);
            const isSaved = savedTypes.has(field.type);
            return (
              <div key={field.type} className="space-y-2">
                <Label htmlFor={field.type} className="flex items-center gap-2">
                  {field.label}
                  {isSaved && (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Saved</span>
                  )}
                </Label>
                <p className="text-xs text-muted-foreground">{field.description}</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id={field.type}
                      type={isVisible ? 'text' : 'password'}
                      placeholder={isSaved ? '••••••••••• (update to change)' : field.placeholder}
                      value={credentials[field.type] ?? ''}
                      onChange={(e) => setCredentials((prev) => ({ ...prev, [field.type]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setVisibleFields((prev) => {
                          const next = new Set(prev);
                          next.has(field.type) ? next.delete(field.type) : next.add(field.type);
                          return next;
                        })
                      }
                    >
                      {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button size="sm" onClick={() => saveCredential(field.type)} disabled={saving}>
                    <Save className="mr-1 h-3 w-3" /> Save
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Content Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Content Profile</CardTitle>
          <CardDescription>Configure your avatar and content generation settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="avatar-id">HeyGen Avatar ID</Label>
              <Input id="avatar-id" placeholder="your-avatar-id" value={avatarId} onChange={(e) => setAvatarId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voice-id">HeyGen Voice ID</Label>
              <Input id="voice-id" placeholder="your-voice-id" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Delhi / India Context</p>
              <p className="text-sm text-muted-foreground">Include Delhi and Indian legal context in all generated content</p>
            </div>
            <Switch checked={delhiContext} onCheckedChange={setDelhiContext} />
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-medium">Mandatory Disclaimer</p>
            <p className="mt-1 text-xs text-muted-foreground italic">
              "This content is legal commentary for public awareness only and does not constitute legal advice. For advice specific to your situation, consult a qualified lawyer."
            </p>
            <p className="mt-2 text-xs text-muted-foreground">This disclaimer is automatically appended to all generated content and cannot be disabled.</p>
          </div>

          <Button onClick={saveProfile} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> Save Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
