import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import companyLogo from "@/assets/company-logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async () => {
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success("Welcome back!");
      navigate("/");
    } else {
      if (!fullName) { toast.error("Please enter your full name"); setLoading(false); return; }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
      });
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success("Account created! Check your email to verify.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <img src={companyLogo} alt="REDtech Africa" className="h-12 w-auto mx-auto mb-3" />
          <CardTitle className="text-xl">
            {isLogin ? "Sign In" : "Create Account"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">REDtech Africa System Automations</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isLogin && (
            <div><Label>Full Name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" /></div>
          )}
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@redtechafrica.com" /></div>
          <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && handleAuth()} /></div>
          <Button onClick={handleAuth} disabled={loading} className="w-full" style={{ backgroundColor: '#C9A66B' }}>
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="font-medium hover:underline" style={{ color: '#C9A66B' }}>
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
