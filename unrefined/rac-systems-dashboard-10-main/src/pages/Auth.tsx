import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import companyLogo from "@/assets/company-logo.png";
import loginHero from "@/assets/login-hero.jpg";
import { Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { sendNotificationEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";
import { supabase } from "@/integrations/supabase/client";

const WORK_EMAIL_DOMAIN = "redtechafrica.com";

const isWorkEmail = (email: string) => {
  const normalized = email.trim().toLowerCase();
  const [, domain = ""] = normalized.split("@");
  return domain === WORK_EMAIL_DOMAIN;
};

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
  const [view, setView] = useState<"login" | "signup" | "reset">("login");
  const [showPassword, setShowPassword] = useState(false);
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
    const randomIndex = Math.floor(Math.random() * STAFF_NAMES.length);
    setRandomPlaceholder(STAFF_NAMES[randomIndex]);
  }, []);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    
    if (hashParams.get("type") === "recovery" || searchParams.get("reset") === "true") {
      setIsRecoveryFlow(true);
      setView("reset");
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
      const msg = error.toLowerCase();
      if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
        toast.error("Wrong email or password. Try again or reset your password.");
      } else if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        toast.error("Please confirm your email — check your inbox for the verification link.");
      } else if (msg.includes("rate") || msg.includes("too many")) {
        toast.error("Too many attempts. Wait a minute and try again.");
      } else {
        toast.error(error);
      }
    } else {
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
    if (!isWorkEmail(signupEmail)) {
      toast.error("Use your verified work email to create an account.");
      return;
    }
    if (signupPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    if (error) {
      const lower = error.toLowerCase();
      const isExisting = lower.includes("already") || lower.includes("registered") || lower.includes("exists");
      const isWeak = lower.includes("pwned") || lower.includes("breach") || lower.includes("compromised");
      if (isWeak) {
        toast.error("This password has been seen in a data breach. Please choose a stronger one.");
        setLoading(false);
        return;
      }
      if (isExisting) {
        const { error: loginError } = await signIn(signupEmail, signupPassword);
        if (loginError) {
          toast.info(`Hey ${signupName.split(" ")[0]}! 👋 This email is already registered. Please use the correct password to sign in.`, { duration: 5000 });
          setView("login");
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

      const { error: loginError } = await signIn(signupEmail, signupPassword);
      if (loginError) {
        toast.success("Account created! Please check your email to confirm, then log in.");
        setView("login");
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
      setView("login");
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
    const { error } = await import("@/integrations/supabase/client").then(m => m.supabase.auth.updateUser({ password: newPassword }));
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully! Welcome back 🎉");
      setIsRecoveryFlow(false);
      navigate("/", { replace: true });
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">

      {/* ═══ LEFT: Clean White Form Panel ═══ */}
      <div className="w-full lg:w-[45%] xl:w-[42%] flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 py-12 bg-white lg:rounded-r-[0px]">

        {/* Logo — black by default, brand on hover */}
        <div className="mb-12">
          <img 
            src={companyLogo} 
            alt="REDtech Africa" 
            className="h-10 w-auto transition-all duration-500 grayscale hover:grayscale-0 cursor-pointer"
            onClick={() => window.location.reload()}
          />
        </div>

        {/* ── Login Form ── */}
        {view === "login" && !isRecoveryFlow && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <h1 className="text-[28px] font-bold text-foreground tracking-tight">Welcome Back</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Welcome back! Please enter your details below.</p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-sm font-semibold text-foreground">
                  Email <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder={`you@${WORK_EMAIL_DOMAIN}`}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="h-12 rounded-xl border-border bg-background text-sm placeholder:text-muted-foreground/70 transition-colors focus:border-primary focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password" className="text-sm font-semibold text-foreground">
                    Password <span className="text-red-400">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => setView("reset")}
                    className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="h-12 rounded-xl border-border bg-background pr-11 text-sm placeholder:text-muted-foreground/70 transition-colors focus:border-primary focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-foreground text-sm font-semibold text-background shadow-none transition-all duration-200 hover:bg-foreground/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <span className="flex items-center justify-center gap-2">
                  Sign In <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button type="button" onClick={() => setView("signup")} className="font-semibold text-foreground transition-colors hover:text-primary">
                Sign up today!
              </button>
            </p>
          </form>
        )}

        {/* ── Signup Form ── */}
        {view === "signup" && !isRecoveryFlow && (
          <form onSubmit={handleSignup} className="space-y-6">
            <div>
              <h1 className="text-[28px] font-bold text-foreground tracking-tight">Create Account</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Join your team on the RAC Dashboard.</p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-sm font-semibold text-foreground">
                  Full Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder={randomPlaceholder}
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="h-12 rounded-xl border-border bg-background text-sm placeholder:text-muted-foreground/70 transition-colors focus:border-primary focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-sm font-semibold text-foreground">
                  Email <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder={`you@${WORK_EMAIL_DOMAIN}`}
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="h-12 rounded-xl border-border bg-background text-sm placeholder:text-muted-foreground/70 transition-colors focus:border-primary focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-sm font-semibold text-foreground">
                  Password <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="h-12 rounded-xl border-border bg-background pr-11 text-sm placeholder:text-muted-foreground/70 transition-colors focus:border-primary focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-foreground text-sm font-semibold text-background shadow-none transition-all duration-200 hover:bg-foreground/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <span className="flex items-center justify-center gap-2">
                  Create Account <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button type="button" onClick={() => setView("login")} className="font-semibold text-foreground transition-colors hover:text-primary">
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* ── Reset Password Form ── */}
        {view === "reset" && !isRecoveryFlow && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <h1 className="text-[28px] font-bold text-foreground tracking-tight">Reset Password</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Enter your email and we'll send you reset instructions.</p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-sm font-semibold text-foreground">
                  Email <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder={`you@${WORK_EMAIL_DOMAIN}`}
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="h-12 rounded-xl border-border bg-background text-sm placeholder:text-muted-foreground/70 transition-colors focus:border-primary focus:ring-primary/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-foreground text-sm font-semibold text-background shadow-none transition-all duration-200 hover:bg-foreground/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <button type="button" onClick={() => setView("login")} className="font-semibold text-foreground transition-colors hover:text-primary">
                Back to sign in
              </button>
            </p>
          </form>
        )}

        {/* ── Recovery: Set New Password ── */}
        {isRecoveryFlow && (
          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div>
              <h1 className="text-[28px] font-bold text-foreground tracking-tight">Set New Password</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Choose a strong password for your account.</p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-semibold text-foreground">
                  New Password <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 rounded-xl border-border bg-background pr-11 text-sm placeholder:text-muted-foreground/70 transition-colors focus:border-primary focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-foreground text-sm font-semibold text-background shadow-none transition-all duration-200 hover:bg-foreground/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
            </Button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-auto pt-12">
          <p className="text-xs text-muted-foreground/80">
            © {new Date().getFullYear()}{" "}
            <a href="https://redtechafrica.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-primary">
              REDtech Africa Consulting
            </a>
            . Built by{" "}
            <a href="https://www.linkedin.com/in/davidogundepo/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-primary">
              David
            </a>{" "}
            &{" "}
            <a href="https://www.linkedin.com/in/olu-sowunmi/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-primary">
              Dolamu
            </a>
          </p>
        </div>
      </div>

      {/* ═══ RIGHT: Hero Image Panel ═══ */}
      <div className="hidden lg:block lg:w-[55%] xl:w-[58%] p-4 pl-0">
        <div className="relative h-full w-full rounded-3xl overflow-hidden">
          {/* Hero image */}
          <img
            src={loginHero}
            alt="REDtech Africa team member"
            className="h-full w-full object-cover object-top"
          />

          {/* Glassmorphism testimonial card at bottom */}
          <div className="absolute bottom-6 left-6 right-6">
            <div
              className="rounded-2xl p-6 border border-white/20"
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              <p className="text-white text-[15px] leading-relaxed font-medium">
                "RAC Automations transformed how we manage our operations — from attendance to invoicing, everything is now seamless and accountable."
              </p>
              <div className="flex items-center gap-3 mt-4">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                  AO
                </div>
                <div>
                  <p className="text-white text-sm font-bold">Ayomide Oloko-Nwazue</p>
                  <p className="text-white/70 text-xs">Executive Director, REDtech Africa</p>
                </div>
              </div>
              <div className="flex gap-1 mt-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-4 w-4 text-white fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Auth;
