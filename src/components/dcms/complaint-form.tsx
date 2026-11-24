import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MessageSquarePlus, X } from "lucide-react";
import { toast } from "sonner";
import { COMPLAINT_CATEGORIES, type Complaint, type Facility } from "@/data/mock";
import { useApp, useScopedFacilities } from "@/lib/app-state";
import { matchingComplaintFacilities } from "@/lib/complaints";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const COMPLAINT_SELECT =
  "h-10 w-full min-w-0 rounded-md border border-line bg-surface px-3 text-sm text-ink focus:outline-2 focus:outline-kurram";
export function ComplaintForm({ facility }: { facility?: Facility }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size={facility ? "sm" : "default"}
        variant={facility ? "outline" : "default"}
        onClick={() => setOpen(true)}
      >
        <MessageSquarePlus />
        {facility ? "Raise complaint" : "New complaint"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Register a complaint</DialogTitle>
            <DialogDescription>
              Choose one or several institutions, describe the issue and assign responsibility.
            </DialogDescription>
          </DialogHeader>
          {open && <ComplaintComposer initialFacility={facility} onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
function ComplaintComposer({
  initialFacility,
  onClose,
}: {
  initialFacility: Facility | undefined;
  onClose: () => void;
}) {
  const scope = useScopedFacilities({ applyFilters: false });
  const { createComplaint, role } = useApp();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(initialFacility ? [initialFacility.id] : []);
  const [area, setArea] = useState(initialFacility?.tehsil ?? "All");
  const [locality, setLocality] = useState("All");
  const [kind, setKind] = useState("All");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Complaint["category"]>("Infrastructure");
  const [priority, setPriority] = useState<Complaint["priority"]>("Medium");
  const [owner, setOwner] = useState(
    role.department === "Education" || initialFacility?.kind === "school"
      ? "DEO office"
      : role.department === "Health" || initialFacility?.kind === "health"
        ? "DHO office"
        : "District coordination cell",
  );
  const areas = [...new Set(scope.map((f) => f.tehsil))];
  const localities = [
    ...new Set(scope.filter((f) => area === "All" || f.tehsil === area).map((f) => f.village)),
  ].sort();
  const visible = matchingComplaintFacilities(scope, {
    area,
    locality,
    kind,
    facilityId: "All",
  }).filter((f) => `${f.name} ${f.code}`.toLowerCase().includes(query.trim().toLowerCase()));
  const chosen = scope.filter((f) => selected.includes(f.id));
  const submit = () => {
    try {
      const id = createComplaint({
        facilityIds: chosen.map((f) => f.id),
        title,
        description,
        category,
        priority,
        owner,
      });
      onClose();
      navigate({ to: "/complaints", search: { complaint: id } });
      toast.success("Complaint registered", {
        description: `${id} · ${chosen.length} institution(s) · ${owner}`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check the complaint details.");
    }
  };
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <fieldset className="space-y-3 rounded-lg border border-line p-4">
        <legend className="px-1 text-sm font-semibold">Affected institutions</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            Tehsil / area
            <select
              aria-label="Complaint area"
              className={COMPLAINT_SELECT}
              value={area}
              onChange={(e) => {
                setArea(e.target.value);
                setLocality("All");
              }}
            >
              <option value="All">All areas</option>
              {areas.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Locality
            <select
              aria-label="Complaint locality"
              className={COMPLAINT_SELECT}
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
            >
              <option value="All">All localities</option>
              {localities.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Institution type
            <select
              aria-label="Complaint institution type"
              className={COMPLAINT_SELECT}
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="All">Schools & hospitals</option>
              <option value="school">Schools</option>
              <option value="health">Hospitals & health facilities</option>
            </select>
          </label>
        </div>
        <Input
          aria-label="Find institutions"
          placeholder="Search institution name or code…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            <strong className="num">{chosen.length}</strong> selected · {visible.length} matching
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              className="font-semibold text-kurram underline"
              disabled={!visible.length}
              onClick={() => setSelected([...new Set([...selected, ...visible.map((f) => f.id)])])}
            >
              Select all matching
            </button>
            <button
              type="button"
              className="text-ink-muted underline"
              disabled={!selected.length}
              onClick={() => setSelected([])}
            >
              Clear selection
            </button>
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto rounded-md border border-line divide-y divide-line">
          {visible.map((f) => (
            <label key={f.id} className="flex cursor-pointer items-start gap-3 p-3 hover:bg-subtle">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-kurram"
                checked={selected.includes(f.id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked ? [...selected, f.id] : selected.filter((id) => id !== f.id),
                  )
                }
              />
              <span className="min-w-0 text-sm">
                <span className="block font-semibold">{f.name}</span>
                <span className="text-xs text-ink-muted">
                  {f.code} · {f.village} · {f.tehsil} ·{" "}
                  {f.kind === "school" ? "School" : "Health facility"}
                </span>
              </span>
            </label>
          ))}
          {!visible.length && (
            <p className="p-4 text-sm text-ink-muted">No institutions match these filters.</p>
          )}
        </div>
        {chosen.length > 0 && (
          <div
            className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto"
            aria-label="Selected institutions"
          >
            {chosen.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => setSelected(selected.filter((id) => id !== f.id))}
                className="inline-flex items-center gap-1 rounded border border-line bg-subtle px-2 py-1 text-xs"
              >
                {f.code}
                <X className="size-3" />
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-ink-muted">
          Selections stay selected when you change area or type. A single complaint can cover
          schools and hospitals together.
        </p>
      </fieldset>
      <div className="space-y-1.5">
        <Label htmlFor="complaint-title">Complaint title</Label>
        <Input
          id="complaint-title"
          required
          minLength={5}
          maxLength={160}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Describe the issue in one line"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          Category
          <select
            aria-label="Category"
            className={COMPLAINT_SELECT}
            value={category}
            onChange={(e) => setCategory(e.target.value as Complaint["category"])}
          >
            {COMPLAINT_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Priority
          <select
            aria-label="Priority"
            className={COMPLAINT_SELECT}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Complaint["priority"])}
          >
            {["Critical", "High", "Medium", "Low"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="complaint-description">Complaint details and required action</Label>
        <Textarea
          id="complaint-description"
          required
          minLength={15}
          maxLength={5000}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened, which services are affected, and what action is needed?"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="complaint-owner">Assigned owner / office</Label>
        <Input
          id="complaint-owner"
          required
          maxLength={120}
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            !chosen.length ||
            title.trim().length < 5 ||
            description.trim().length < 15 ||
            !owner.trim()
          }
        >
          Register complaint
          {chosen.length ? ` · ${chosen.length} institution${chosen.length === 1 ? "" : "s"}` : ""}
        </Button>
      </div>
    </form>
  );
}
