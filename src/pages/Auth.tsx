import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowRight, Moon, Sun } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const { toast } = useToast();
  const navigate = useNavigate();

  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined' &&
    (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches))
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      setLoading(false);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Check your email', description: 'We sent you a confirmation link.' });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else navigate('/');
    }
  };

  const handleMagicLink = async () => {
    if (!email) { toast({ title: 'Enter your email', variant: 'destructive' }); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setLoading(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Magic link sent!', description: 'Check your email inbox.' });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <Button variant="ghost" size="icon" className="absolute top-4 right-4 rounded-full" onClick={() => setDark(!dark)}>
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
            <span className="text-xl font-bold text-primary-foreground">LC</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">LegalContent.ai</h1>
            <p className="mt-1 text-sm text-muted-foreground">AI-powered legal commentary</p>
          </div>
        </div>

        {/* Segmented control */}
        <div className="flex rounded-xl bg-secondary p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${mode === 'signin' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setMode('signin')}
          >Sign In</button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${mode === 'signup' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setMode('signup')}
          >Sign Up</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px] font-medium text-muted-foreground">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" className="h-12 rounded-xl bg-secondary border-0 text-[15px] placeholder:text-muted-foreground/50" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[13px] font-medium text-muted-foreground">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" className="h-12 rounded-xl bg-secondary border-0 text-[15px]" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl text-[15px] font-semibold" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">or</span></div>
        </div>

        <Button variant="outline" className="w-full h-12 rounded-xl text-[15px] border-border" onClick={handleMagicLink} disabled={loading}>
          <Mail className="mr-2 h-4 w-4" /> Send Magic Link
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          This platform generates legal commentary for public awareness only — not legal advice.
        </p>
      </div>
    </div>
  );
}
