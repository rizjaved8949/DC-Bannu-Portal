import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ClipboardCheck,
  Download,
  GraduationCap,
  HeartPulse,
  Info,
  RotateCcw,
  Settings2,
  Signal,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { facilityById, formatDate, hhmm, TODAY } from "@/data/mock";
import { useApp, useScopedFacilities } from "@/lib/app-state";
import { downloadCsv } from "@/lib/csv";
import { StatusBadge } from "./status";

export function WorkspaceControls() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    reports,
    reviewItems,
    pendingOutbox,
    deliverReport,
    feedPaused,
    setFeedPaused,
    resetWorkspace,
    storageAvailable,
    statusFor,
  } = useApp();
  const scope = useScopedFacilities({ applyFilters: false });
  const ids = new Set(scope.map((f) => f.id));
  const school =
    scope.find((f) => f.kind === "school" && statusFor(f.id) === "none") ??
    scope.find((f) => f.kind === "school");
  const hospital = scope.find((f) => f.id === "HF204") ?? scope.find((f) => f.kind === "health");
  const exportLog = () =>
    downloadCsv(
      "nwd-connect-reporting-activity.csv",
      reports
        .filter((r) => ids.has(r.facilityId))
        .flatMap((r) =>
          r.lifecycle
            .filter((event) => event.at != null)
            .map((event) => ({
              Report: r.id,
              Facility: facilityById[r.facilityId]!.name,
              Event: event.label,
              Time: hhmm(event.at),
              Channel: r.channel,
            })),
        ),
    );
  return (
    <>
      <button
        type="button"
        aria-label="Workspace controls"
        title="Workspace controls"
        onClick={() => setOpen(true)}
        className="flex size-9 shrink-0 items-center justify-center rounded-sm text-topbar-muted hover:bg-topbar-raised hover:text-topbar-foreground"
      >
        <Settings2 className="size-[18px]" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Workspace & reporting controls</DialogTitle>
            <DialogDescription>
              Choose a reporting journey, manage queued submissions and prepare the workspace for a
              presentation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {school && (
              <Link
                to="/field-app"
                search={{ facility: school.id }}
                data-dept="edu"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-line p-4 hover:bg-subtle"
              >
                <GraduationCap className="mb-3 size-5 text-edu" />
                <span className="block font-semibold">School reporting journey</span>
                <span className="mt-1 block text-sm text-ink-muted">
                  Mark the full roster, record class attendance and send a report from {school.name}
                  .
                </span>
                <span className="mt-3 block text-xs font-semibold text-dept">
                  Open school workspace
                </span>
              </Link>
            )}
            {hospital && (
              <Link
                to="/field-app"
                search={{ facility: hospital.id }}
                data-dept="health"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-line p-4 hover:bg-subtle"
              >
                <HeartPulse className="mb-3 size-5 text-health" />
                <span className="block font-semibold">Hospital shift journey</span>
                <span className="mt-1 block text-sm text-ink-muted">
                  Review staffing, record service availability and hand over the shift at{" "}
                  {hospital.name}.
                </span>
                <span className="mt-3 block text-xs font-semibold text-dept">
                  Open hospital workspace
                </span>
              </Link>
            )}
          </div>
          <section className="rounded-lg border border-line">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 className="inline-flex items-center gap-2 font-semibold">
                <Signal className="size-4 text-dept" />
                Queued reports
              </h3>
              <span className="text-xs text-ink-muted">{pendingOutbox.length} waiting</span>
            </div>
            {pendingOutbox.length ? (
              <ul className="max-h-56 divide-y divide-line overflow-y-auto">
                {pendingOutbox.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{facilityById[r.facilityId]!.name}</p>
                      <p className="code mt-1 break-all text-xs text-ink-muted">{r.id}</p>
                      <StatusBadge status={r.status} className="mt-2" />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        deliverReport(r.id);
                        toast.success("Report received", {
                          description:
                            "The district register, attendance and review queue have been updated.",
                        });
                      }}
                    >
                      Process acknowledgement
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex gap-3 p-4 text-sm text-ink-muted">
                <ClipboardCheck className="size-5 shrink-0 text-dept" />
                <p>
                  No submissions are waiting. Reports saved without a signal and SMS submissions
                  will appear here.
                </p>
              </div>
            )}
          </section>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4">
            <div>
              <p className="text-sm font-semibold">Background reporting activity</p>
              <p className="text-xs text-ink-muted">
                {feedPaused
                  ? "Controlled by your reporting actions"
                  : "Automatic incoming reports are running"}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setFeedPaused(!feedPaused)}>
              {feedPaused ? "Start incoming activity" : "Pause incoming activity"}
            </Button>
          </div>
          <div className="rounded-lg border border-line bg-subtle p-4">
            <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
              <Info className="size-4" />
              About this workspace
            </h3>
            <p className="text-sm text-ink-muted">
              Presentation environment with generated institutional records, not an official
              district census. The reporting day is {formatDate(TODAY)}. Reporting, review and
              follow-up actions run locally; no government database or SMS provider is contacted.
            </p>
            <p className="mt-2 inline-flex items-center gap-2 text-xs text-ink-muted">
              <WifiOff className="size-3.5" />
              {storageAvailable
                ? "Changes are saved in this browser and survive a page refresh."
                : "Browser storage is unavailable. Keep this tab open to retain changes."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button size="sm" variant="outline" onClick={exportLog}>
              <Download />
              Export activity log
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <RotateCcw />
                  Reset presentation
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restore the starting workspace?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This clears reports, complaints, notes, follow-ups and role settings saved by
                    this presentation on this browser. The original institution register will be
                    restored.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my changes</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      resetWorkspace();
                      setOpen(false);
                      navigate({ to: "/" });
                      toast.success("Workspace reset", {
                        description: `${scope.length} institutions are ready for a fresh presentation.`,
                      });
                    }}
                  >
                    Reset workspace
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <p className="text-xs text-ink-muted">
            {scope.length} institutions in role scope ·{" "}
            {reviewItems.filter((r) => ids.has(r.facilityId) && r.status !== "Closed").length} open
            follow-ups
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
