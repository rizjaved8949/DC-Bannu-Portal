import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Building2,
  CalendarCheck,
  ClipboardPlus,
  Download,
  MapPin,
  PackageCheck,
  Smartphone,
  UsersRound,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  institutionProfiles,
  formatDate,
  OFFICERS,
  posts,
  staffByFacility,
  type Facility,
  type Severity,
} from "@/data/mock";
import { useApp } from "@/lib/app-state";
import { downloadCsv } from "@/lib/csv";
import { Panel, Code } from "./section";
import { Segmented } from "./segmented";
import { Pill } from "./status";
import { ComplaintForm } from "./complaint-form";

export function InstitutionRecord({ facility: f }: { facility: Facility }) {
  const profile = institutionProfiles[f.id]!;
  const { reviewItems, createFollowUp, schoolDayFor, shiftFor, complaints } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"profile" | "assets" | "followups">("profile");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [severity, setSeverity] = useState<Severity>("Medium");
  const [owner, setOwner] = useState(f.kind === "school" ? "DEO office" : "DHO office");
  const staff = staffByFacility[f.id] ?? [];
  const sanctioned = posts
    .filter((p) => p.facilityId === f.id)
    .reduce((sum, p) => sum + p.sanctioned, 0);
  const items = reviewItems.filter((r) => r.facilityId === f.id);
  const openItems = items.filter((r) => r.status !== "Closed");
  const enrolled = schoolDayFor(f.id)?.classes.reduce(
    (sum, c) => sum + c.enrolledBoys + c.enrolledGirls,
    0,
  );
  const beds = shiftFor(f.id, "M")?.bedsTotal;
  const fields = [
    ["Register reference", profile.reference],
    ["Institution type", f.typeLabel],
    ["Department", f.department],
    ["Administrative area", `${f.tehsil} tehsil · Bannu district`],
    ["Site address", profile.address],
    ["Head / in-charge", f.headName],
    ["Registered reporting number", f.phoneMasked],
    ["Established", String(profile.established)],
    ["Operating hours", profile.hours],
    ["Land / site area", profile.area],
    ["Building tenure", profile.ownership],
    ["Usable rooms", `${profile.usableRooms} of ${profile.rooms}`],
    [f.kind === "school" ? "Enrolled students" : "Bed capacity", String(enrolled ?? beds ?? 0)],
    ["Staff on roster", `${staff.length} of ${sanctioned} sanctioned posts`],
    ["Reporting roster", f.rosterVersion],
    [
      "Reporting channel",
      f.channel === "sms" ? "Registered SMS and offline reporting" : "App with SMS fallback",
    ],
    ["Last monitoring visit", formatDate(profile.inspectionDate)],
    ["Next monitoring visit", formatDate(profile.nextInspection)],
  ];
  const exportProfile = () =>
    downloadCsv(
      `${profile.reference}.csv`,
      fields.map(([Field, Value]) => ({ Field: Field!, Value: Value! })),
    );
  const submit = () => {
    try {
      const id = createFollowUp({
        facilityId: f.id,
        title: title.trim(),
        note: note.trim(),
        severity,
        owner,
      });
      setOpen(false);
      setTitle("");
      setNote("");
      setTab("followups");
      toast.success("Follow-up created", {
        description: `${id} assigned to ${owner}.`,
        action: {
          label: "Open item",
          onClick: () => navigate({ to: "/review", search: { item: id } }),
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check the follow-up details.");
    }
  };
  return (
    <>
      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            <Building2 className="size-4 text-kurram" />
            Institution record
          </span>
        }
        aside={
          <div className="flex flex-wrap gap-2">
            <ComplaintForm facility={f} />
            <Button size="sm" variant="outline" asChild>
              <Link to="/complaints" search={{ facility: f.id }}>
                View complaints · {complaints.filter((c) => c.facilityIds.includes(f.id)).length}
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={exportProfile}>
              <Download />
              Export profile
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <ClipboardPlus />
              Create follow-up
            </Button>
            <Button size="sm" asChild>
              <Link to="/field-app" search={{ facility: f.id }}>
                <Smartphone />
                Open field report
              </Link>
            </Button>
          </div>
        }
      >
        <div className="border-b border-line px-5 py-3">
          <Segmented
            label="Institution record view"
            value={tab}
            onChange={setTab}
            options={[
              { value: "profile", label: "Institution profile" },
              { value: "assets", label: "Asset register", count: profile.assets.length },
              { value: "followups", label: "Follow-ups", count: openItems.length },
            ]}
          />
        </div>
        {tab === "profile" && (
          <div className="institution-profile">
            <div className="institution-summary">
              <span className="profile-icon">
                <MapPin className="size-6" />
              </span>
              <div>
                <p className="font-semibold">{profile.address}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  <Code>{profile.reference}</Code> · {f.department} · Established{" "}
                  {profile.established}
                </p>
              </div>
            </div>
            <dl className="record-grid">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-3 border-t border-line bg-subtle p-5 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <UsersRound className="size-5 text-kurram" />
                <div>
                  <p className="text-sm font-semibold">{staff.length} staff on record</p>
                  <p className="text-xs text-ink-muted">
                    {Math.max(0, sanctioned - staff.length)} sanctioned vacancies
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <PackageCheck className="size-5 text-kurram" />
                <div>
                  <p className="text-sm font-semibold">{profile.assets.length} asset categories</p>
                  <p className="text-xs text-ink-muted">Custodian: facility in-charge</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarCheck className="size-5 text-kurram" />
                <div>
                  <p className="text-sm font-semibold">
                    Next visit {formatDate(profile.nextInspection)}
                  </p>
                  <p className="text-xs text-ink-muted">{profile.officer}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === "assets" && (
          <>
            <p className="px-5 py-3 text-sm text-ink-muted">
              Stock, working condition and the last physical check, maintained by the facility
              in-charge.
            </p>
            <div className="overflow-x-auto">
              <table className="ledger">
                <thead>
                  <tr>
                    <th scope="col">Asset</th>
                    <th scope="col" className="num">
                      On register
                    </th>
                    <th scope="col" className="num">
                      Working
                    </th>
                    <th scope="col">Condition</th>
                    <th scope="col">Last checked</th>
                    <th scope="col">Custodian</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.assets.map((asset) => (
                    <tr key={asset.id}>
                      <td data-label="Asset">
                        <span className="block font-semibold">{asset.name}</span>
                        <Code className="text-xs text-ink-muted">{asset.id}</Code>
                      </td>
                      <td data-label="On register" className="num">
                        {asset.quantity}
                      </td>
                      <td data-label="Working" className="num">
                        {asset.working}
                      </td>
                      <td data-label="Condition">
                        <Pill tone={asset.working < asset.quantity ? "pending" : "verified"}>
                          {asset.working < asset.quantity
                            ? `${asset.quantity - asset.working} need attention`
                            : "All working"}
                        </Pill>
                      </td>
                      <td data-label="Last checked">{formatDate(asset.checkedOn)}</td>
                      <td data-label="Custodian">{asset.custodian}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {tab === "followups" && (
          <div className="divide-y divide-line">
            {items.length ? (
              items.map((item) => (
                <Link
                  key={item.id}
                  to="/review"
                  search={{ item: item.id }}
                  className="flex flex-wrap items-start gap-3 px-5 py-4 hover:bg-subtle"
                >
                  <Pill
                    tone={
                      item.severity === "Critical"
                        ? "problem"
                        : item.status === "Closed"
                          ? "neutral"
                          : "pending"
                    }
                  >
                    {item.severity}
                  </Pill>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{item.detected}</span>
                    <span className="text-xs text-ink-muted">
                      {item.id} · {item.owner} · {item.status}
                    </span>
                  </span>
                  <span className="text-xs text-kurram">Open record</span>
                </Link>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="font-semibold">No follow-ups for this institution</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Create a follow-up when a site check or report needs attention.
                </p>
              </div>
            )}
          </div>
        )}
      </Panel>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle>Create a facility follow-up</DialogTitle>
            <DialogDescription>
              {f.name} · {f.code}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fu-title">What needs attention?</Label>
              <Input
                id="fu-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="For example, repair the classroom roof"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fu-note">Evidence and next step</Label>
              <Textarea
                id="fu-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Describe what was observed and what should happen next."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
                  <SelectTrigger aria-label="Follow-up priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Low", "Medium", "High", "Critical"].map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assigned to</Label>
                <Select value={owner} onValueChange={setOwner}>
                  <SelectTrigger aria-label="Follow-up owner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[f.kind === "school" ? "DEO office" : "DHO office", ...OFFICERS].map(
                      (value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={title.trim().length < 4 || note.trim().length < 4 || !owner}
                onClick={submit}
              >
                Create follow-up
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
