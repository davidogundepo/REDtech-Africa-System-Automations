import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import companyLogo from "@/assets/company-logo.png";

const PASS_KEY = "rac_access";
const VALID_PASSWORD = "redtech2026";

export function isAuthenticated() {
  return sessionStorage.getItem(PASS_KEY) === "true";
}

export function clearAuth() {
  sessionStorage.removeItem(PASS_KEY);
}

const Auth = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) navigate("/", { replace: true });
  }, [navigate]);

  const handleSubmit = () => {
    setLoading(true);
    if (password === VALID_PASSWORD) {
      sessionStorage.setItem(PASS_KEY, "true");
      toast.success("Welcome to RAC System Automations");
      navigate("/", { replace: true });
    } else {
      toast.error("Incorrect password");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <img src={companyLogo} alt="REDtech Africa" className="h-12 w-auto mx-auto mb-3" />
          <CardTitle className="text-xl">System Automations</CardTitle>
          <p className="text-sm text-muted-foreground">Enter password to continue</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Password</Label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} 
            />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full" style={{ backgroundColor: '#C9A66B' }}>
            {loading ? "Please wait..." : "Enter"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
