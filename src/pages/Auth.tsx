import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import companyLogo from "@/assets/company-logo.png";
import { Loader2, LogIn, UserPlus, Mail, Lock, User, KeyRound } from "lucide-react";
import { sendNotificationEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("login");
  const [randomPlaceholder, setRandomPlaceholder] = useState("Ayomide Oloko-Nwazue");
  const navigate = useNavigate();
  const { user, signIn, signUp, resetPassword, loading: authLoading } = useAuth();

  const STAFF_NAMES = [
    "Ayomide Oloko-Nwazue",
    "Dolapo Lawal",
    "Dapo Olawunmi",
    "Olu Sowunmi",
    "Martha Awoniyi",
    "Wilson Adedeji",
    "Theo"
  ];

  useEffect(() => {
    // Pick a random name on component mount
    const randomIndex = Math.floor(Math.random() * STAFF_NAMES.length);
    setRandomPlaceholder(STAFF_NAMES[randomIndex]);
  }, []);

  useEffect(() => {
    // Check if we are in a password recovery flow from email link
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    
    if (hashParams.get("type") === "recovery" || searchParams.get("reset") === "true") {
      setIsRecoveryFlow(true);
      setTab("reset");
    }

    if (user && !isRecoveryFlow) navigate("/", { replace: true });
  }, [user, navigate, isRecoveryFlow]);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      toast.error(error);
    } else {
      // Fetch user's first name for a personalized greeting
      const { data: prof } = await (supabase as any).from("profiles").select("full_name").eq("email", loginEmail).maybeSingle();
      const firstName = (prof?.full_name || "").split(" ")[0] || "";
      toast.success(`Welcome back${firstName ? `, ${firstName}` : ""}! 👋`);
      navigate("/", { replace: true });
    }
    setLoading(false);
  };

  const handleSignup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!signupEmail || !signupPassword || !signupName) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!signupEmail.endsWith("@redtechafrica.com") && signupEmail !== "david.oludepo@gmail.com") {
      toast.error("Only @redtechafrica.com emails are allowed");
      return;
    }
    if (signupPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    if (error) {
      // Smart detection: if user already exists, try to auto-login them
      const isExisting = error.toLowerCase().includes("already") || error.toLowerCase().includes("registered") || error.toLowerCase().includes("exists");
      if (isExisting) {
        // They already typed their password — just log them in
        const { error: loginError } = await signIn(signupEmail, signupPassword);
        if (loginError) {
          toast.info(`Hey ${signupName.split(" ")[0]}! 👋 This email is already registered. Please use the correct password to sign in.`, { duration: 5000 });
          setTab("login");
          setLoginEmail(signupEmail);
        } else {
          toast.success(`Welcome back, ${signupName.split(" ")[0]}! 👋`);
          navigate("/", { replace: true });
        }
      } else {
        toast.error(error);
      }
      setLoading(false);
    } else {
      // Send Welcome Email
      sendNotificationEmail({
        to: signupEmail,
        subject: "Welcome to RAC Automations Dashboard",
        html: brandedEmailTemplate({
          recipientName: signupName,
          heading: "Welcome to the Team! 🎉",
          body: `
            <p>Your account on the <strong>RAC Automations Dashboard</strong> platform has been successfully created.</p>
            <p>Here's what you can do now:</p>
            <ul style="padding-left:20px; color:#555;">
              <li>📋 Track and manage your <strong>assigned tasks</strong></li>
              <li>📅 Submit and monitor <strong>leave requests</strong></li>
              <li>💰 Access the <strong>Finance Dashboard</strong></li>
              <li>🤝 Manage the <strong>Client Deal Book</strong></li>
              <li>📊 View your <strong>performance score</strong></li>
            </ul>
            <p>Your team is waiting for you inside. Let's build something great together!</p>
          `,
          ctaText: "Open Dashboard",
          ctaUrl: "https://ractools.vercel.app",
          footerNote: "If you didn't create this account, please ignore this email."
        })
      });

      // Auto-login immediately after signup
      const { error: loginError } = await signIn(signupEmail, signupPassword);
      if (loginError) {
        // Fallback: if auto-login fails (e.g. email confirmation required), guide user
        toast.success("Account created! Please check your email to confirm, then log in.");
        setTab("login");
        setLoginEmail(signupEmail);
        setLoading(false);
      } else {
        toast.success(`Welcome to RAC Automations Dashboard, ${signupName}! 🚀`);
        navigate("/");
      }
    }
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!resetEmail) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(resetEmail);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Password reset instructions sent to your email.");
      setTab("login");
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    // Use supabase client directly here for the update since it requires an active recovery session
    const { error } = await import("@/integrations/supabase/client").then(m => m.supabase.auth.updateUser({ password: newPassword }));
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully! Welcome back 🎉");
      setIsRecoveryFlow(false);
      // Auto-navigate to dashboard — user is already authenticated via recovery session
      navigate("/", { replace: true });
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#bc7e57]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <img src={companyLogo} alt="REDtech Africa" className="h-14 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold" style={{ color: '#bc7e57' }}>
            System Automations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            REDtech Africa Internal Platform
          </p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="login" className="gap-2 text-xs sm:text-sm">
                  <LogIn className="h-4 w-4" /> Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="gap-2 text-xs sm:text-sm">
                  <UserPlus className="h-4 w-4" /> Sign Up
                </TabsTrigger>
                <TabsTrigger value="reset" className="gap-2 text-xs sm:text-sm">
                  <KeyRound className="h-4 w-4" /> Reset
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0">
                <CardTitle className="text-lg mt-4">Welcome Back</CardTitle>
                <CardDescription>Sign in with your RAC staff email</CardDescription>
              </TabsContent>
              <TabsContent value="signup" className="mt-0">
                <CardTitle className="text-lg mt-4">Create Account</CardTitle>
                <CardDescription>Register with your @redtechafrica.com email</CardDescription>
              </TabsContent>
              <TabsContent value="reset" className="mt-0">
                <CardTitle className="text-lg mt-4">Reset Password</CardTitle>
                <CardDescription>We'll send you a link to reset your password</CardDescription>
              </TabsContent>
            </Tabs>
          </CardHeader>

          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              {/* Login Form */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@redtechafrica.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5" /> Password
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full"
                    style={{ backgroundColor: '#bc7e57' }}
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</>
                    ) : (
                      <><LogIn className="h-4 w-4 mr-2" /> Sign In</>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup Form */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5" /> Full Name
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder={randomPlaceholder}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="you@redtechafrica.com"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Only @redtechafrica.com emails are accepted
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5" /> Password
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full"
                    style={{ backgroundColor: '#bc7e57' }}
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating Account...</>
                    ) : (
                      <><UserPlus className="h-4 w-4 mr-2" /> Create Account</>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Reset Password Form */}
              <TabsContent value="reset">
                {isRecoveryFlow ? (
                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                     <div className="space-y-2">
                      <Label htmlFor="new-password" className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5" /> New Password
                      </Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full"
                      style={{ backgroundColor: '#bc7e57' }}
                    >
                      {loading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating...</>
                      ) : (
                        <><Lock className="h-4 w-4 mr-2" /> Update Password</>
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" /> Email
                      </Label>
                      <Input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@redtechafrica.com"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full"
                      style={{ backgroundColor: '#bc7e57' }}
                    >
                      {loading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                      ) : (
                        <><Mail className="h-4 w-4 mr-2" /> Send Reset Link</>
                      )}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          © {new Date().getFullYear()} REDtech Africa Consulting LTD
        </p>
      </div>
    </div>
  );
};

export default Auth;
