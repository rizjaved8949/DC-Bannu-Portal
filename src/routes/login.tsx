import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  Building2,
  Check,
  GraduationCap,
  HeartPulse,
  LogIn,
  MapPinned,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dcms/page-header";
import { Button } from "@/components/ui/button";
import { facilities } from "@/data/mock";
import { ROLES, useApp, type RoleId } from "@/lib/app-state";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Welcome · DCMS Bannu" },
      {
        name: "description",
        content:
          "Explore the DCMS Bannu demo workspace for district education and public health monitoring.",
      },
    ],
  }),
  component: DemoLoginPage,
});

const ROLE_ICONS = { dc: Building2, deo: GraduationCap, dho: HeartPulse, "ac-domel": MapPinned };

function DemoLoginPage() {
  const { setRole } = useApp();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<RoleId>("dc");
  const [entering, setEntering] = useState(false);
  const schools = facilities.filter((facility) => facility.kind === "school").length;
  const health = facilities.filter((facility) => facility.kind === "health").length;
  const enter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEntering(true);
    try {
      setRole(selected);
      await navigate({ to: "/" });
      toast.success("Welcome to your district workspace", {
        description: "You’re exploring the demo. Switch roles from your profile at any time.",
      });
    } catch {
      toast.error("The workspace didn’t open. Please try again.");
    } finally {
      setEntering(false);
    }
  };
  return (
    <div className="login-page">
      <aside className="login-story" aria-label="About DCMS Bannu">
        <a href="/login" className="login-brand" aria-label="DCMS Bannu welcome">
          <span className="login-brand-mark" aria-hidden>
            <Building2 className="size-6" />
          </span>
          <span>
            <strong>
              DCMS <span>Bannu</span>
            </strong>
            <small>District Centralized Monitoring System</small>
          </span>
        </a>
        <div className="login-story-content">
          <span className="login-kicker">
            <span aria-hidden />
            Connected services. Clearer decisions.
          </span>
          <h2>
            A clearer picture.
            <br />
            <span>A stronger district.</span>
          </h2>
          <p>Bring schools, public health and daily reporting into one thoughtful workspace.</p>
          <div className="login-service-scene" aria-hidden>
            <svg viewBox="0 0 440 230" className="login-connections" fill="none">
              <path d="M100 60H166Q186 60 186 80V115H252Q272 115 272 135V175H342" />
              <path d="M100 175H154Q174 175 174 155V115H252Q272 115 272 95V60H342" />
              <circle cx="220" cy="115" r="45" />
              <circle cx="220" cy="115" r="58" />
            </svg>
            <div className="login-service login-service-school">
              <span>
                <GraduationCap />
              </span>
              <strong>{schools}</strong>
              <small>Government schools</small>
            </div>
            <div className="login-service-hub">
              <Building2 />
              <span>One district view</span>
            </div>
            <div className="login-service login-service-health">
              <span>
                <HeartPulse />
              </span>
              <strong>{health}</strong>
              <small>Health facilities</small>
            </div>
            <span className="login-scene-tag">
              <Check className="size-3.5" />
              People. Places. Progress.
            </span>
          </div>
          <div className="login-principles">
            <span>
              <ShieldCheck />
              Clear reporting
            </span>
            <span>
              <UsersRound />
              Role-based views
            </span>
            <span>
              <MapPinned />
              Local context
            </span>
          </div>
        </div>
        <footer className="login-story-footer">
          <span>District Administration Bannu</span>
          <span>Khyber Pakhtunkhwa</span>
        </footer>
      </aside>
      <main className="login-entry" id="main-content">
        <div className="login-entry-top">
          <span>
            <Sparkles className="size-3.5" />
            Interactive demo
          </span>
        </div>
        <div className="login-form-wrap">
          <PageHeader
            title="Welcome to DCMS"
            description="Choose a view and explore the district. No account or password needed."
          />
          <form onSubmit={enter}>
            <fieldset className="login-role-options" disabled={entering}>
              <legend>Explore as</legend>
              {ROLES.map((role) => {
                const Icon = ROLE_ICONS[role.id];
                return (
                  <label key={role.id} className="login-role" data-selected={selected === role.id}>
                    <input
                      type="radio"
                      name="demo-role"
                      value={role.id}
                      checked={selected === role.id}
                      onChange={() => setSelected(role.id)}
                    />
                    <span className="login-role-icon" aria-hidden>
                      <Icon />
                    </span>
                    <span className="login-role-copy">
                      <strong>{role.label}</strong>
                      <small>{role.scopeLabel}</small>
                    </span>
                    <span className="login-radio-mark" aria-hidden>
                      {selected === role.id && <Check className="size-3" />}
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <Button
              type="submit"
              size="lg"
              className="login-submit"
              disabled={entering}
              aria-busy={entering}
            >
              <LogIn />
              {entering ? "Opening your workspace…" : "Continue with demo"}
            </Button>
            <p className="login-demo-note">
              <ShieldCheck className="size-4" />
              Sample data · Demo access · No credentials collected
            </p>
          </form>
        </div>
        <footer className="login-entry-footer">
          <span>Designed for better public service.</span>
          <span>English</span>
        </footer>
      </main>
    </div>
  );
}
