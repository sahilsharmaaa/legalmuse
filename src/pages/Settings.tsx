import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Save, Eye, EyeOff, Check, Loader2 } from 'lucide-react';

const credentialFields = [
  { type: 'github_token', label: 'GitHub / Copilot Token', placeholder: 'ghp_...', description: 'LLM content generation' },
  { type: 'heygen_api_key', label: 'HeyGen API Key', placeholder: 'your-heygen-key', description: 'Avatar video generation' },
  { type: 'linkedin_access_token', label: 'LinkedIn Access Token', placeholder: 'your-linkedin-token', description: 'LinkedIn posting' },
  { type: 'meta_access_token', label: 'Meta Access Token', placeholder: 'your-meta-token', description: 'Instagram Reels' },
  { type: 'instagram_account_id', label: 'Instagram Account ID', placeholder: '1234567890', description: 'Business account ID' },
  { type: 'youtube_api_key', label: 'YouTube API Key', placeholder: 'your-youtube-key', description: 'YouTube uploads (future)' },
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
      if (credsRes.data) setSavedTypes(new Set(credsRes.data.map((c) => c.credential_type)));
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
    if (!value?.trim()) { toast({ title: 'Enter a value', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await supabase.from('user_api_credentials').upsert(
      { user_id: user!.id, credential_type: type, encrypted_value: value, credential_label: type },
      { onConflict: 'user_id,credential_type' }
    );
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      setSavedTypes((prev) => new Set(prev).add(type));
      setCredentials((prev) => ({ ...prev, [type]: '' }));
      toast({ title: 'Saved' });
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('content_profiles').upsert(
      { user_id: user.id, heygen_avatar_id: avatarId || null, heygen_voice_id: voiceId || null, delhi_context_enabled: delhiContext },
      { onConflict: 'user_id' }
    );
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Profile saved' });
  };

  const toggleVisibility = (type: string) => {
    setVisibleFields((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {/* API Credentials */}
      <section>
        <h2 className="text-[15px] font-semibold mb-1">API Credentials</h2>
        <p className="text-xs text-muted-foreground mb-4">Tokens are stored securely and only used server-side.</p>

        <div className="space-y-3">
          {credentialFields.map((field) => {
            const isSaved = savedTypes.has(field.type);
            const isVisible = visibleFields.has(field.type);
            return (
              <div key={field.type} className="rounded-2xl bg-card border p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{field.label}</p>
                    <p className="text-[11px] text-muted-foreground">{field.description}</p>
                  </div>
                  {isSaved && (
                    <div className="flex items-center gap-1 text-success">
                      <Check className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium">Saved</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={isVisible ? 'text' : 'password'}
                      placeholder={isSaved ? '••••••• (update to change)' : field.placeholder}
                      className="h-10 rounded-xl bg-secondary border-0 pr-10 text-sm"
                      value={credentials[field.type] ?? ''}
                      onChange={(e) => setCredentials((prev) => ({ ...prev, [field.type]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2.5 text-muted-foreground"
                      onClick={() => toggleVisibility(field.type)}
                    >
                      {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button size="sm" className="h-10 rounded-xl px-4" onClick={() => saveCredential(field.type)} disabled={saving}>
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Content Profile */}
      <section>
        <h2 className="text-[15px] font-semibold mb-1">Content Profile</h2>
        <p className="text-xs text-muted-foreground mb-4">Avatar and content settings.</p>

        <div className="space-y-3">
          <div className="rounded-2xl bg-card border p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">HeyGen Avatar ID</Label>
              <Input className="h-10 rounded-xl bg-secondary border-0 text-sm" placeholder="your-avatar-id" value={avatarId} onChange={(e) => setAvatarId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">HeyGen Voice ID</Label>
              <Input className="h-10 rounded-xl bg-secondary border-0 text-sm" placeholder="your-voice-id" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} />
            </div>
          </div>

          <div className="rounded-2xl bg-card border p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delhi / India Context</p>
              <p className="text-[11px] text-muted-foreground">Include Delhi legal context in outputs</p>
            </div>
            <Switch checked={delhiContext} onCheckedChange={setDelhiContext} />
          </div>

          <div className="rounded-2xl bg-primary/5 border border-primary/15 p-4">
            <p className="text-xs font-semibold text-primary">Mandatory Disclaimer</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground italic">
              "This content is legal commentary for public awareness only and does not constitute legal advice. For advice specific to your situation, consult a qualified lawyer."
            </p>
            <p className="mt-1.5 text-[10px] text-muted-foreground">Auto-appended to all outputs. Cannot be disabled.</p>
          </div>

          <Button onClick={saveProfile} disabled={saving} className="w-full h-11 rounded-xl text-[15px] font-semibold">
            <Save className="mr-2 h-4 w-4" /> Save Profile
          </Button>
        </div>
      </section>
    </div>
  );
}
