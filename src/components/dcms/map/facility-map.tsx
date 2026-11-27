import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";

import { STATUS_LABEL, type Facility, type ReportStatus } from "@/data/mock";
import { STATUS_TONE, TONE_VAR } from "../status";

export interface MapProps {
  facilities: Facility[];
  statusFor: (id: string) => ReportStatus;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type Placed = Facility & { lat: number; lng: number };
const isPlaced = (f: Facility): f is Placed => f.lat != null && f.lng != null;

function FlyTo({ facilities, selectedId }: { facilities: Placed[]; selectedId: string | null }) {
  const map = useMap();
  useEffect(() => {
    const f = facilities.find((x) => x.id === selectedId);
    if (f) map.panTo([f.lat, f.lng], { animate: true, duration: 0.25 });
  }, [selectedId, facilities, map]);
  return null;
}

/** Frame every plotted facility (Bannu health facilities and North Waziristan schools). */
function FitAll({ facilities }: { facilities: Placed[] }) {
  const map = useMap();
  const key = facilities.map((f) => f.id).join(",");
  useEffect(() => {
    if (facilities.length === 0) return;
    map.fitBounds(
      facilities.map((f) => [f.lat, f.lng] as [number, number]),
      { padding: [24, 24], maxZoom: 12 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

/** Leaflet map: small circles in report-status colour with a white ring; hollow when coordinates are unverified. */
export default function FacilityMap({
  facilities: all,
  statusFor,
  selectedId,
  onSelect,
}: MapProps) {
  // Schools missing from the IMU coordinates file cannot be plotted.
  const facilities = all.filter(isPlaced);
  return (
    <MapContainer
      center={[32.99, 70.6]}
      zoom={10}
      scrollWheelZoom={false}
      className="h-[520px] w-full rounded-[5px]"
      aria-label="Map of health facilities in District Bannu and schools in North Waziristan"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitAll facilities={facilities} />
      <FlyTo facilities={facilities} selectedId={selectedId} />
      {facilities.map((f) => {
        const status = statusFor(f.id);
        const colour = TONE_VAR[STATUS_TONE[status]];
        const selected = f.id === selectedId;
        // Fill shows the department, the ring shows today's report status.
        const deptFill = f.kind === "school" ? "var(--edu)" : "var(--health)";
        // Non-functional schools send no report: hollow, dashed problem ring.
        const hollow = !f.operational || !f.coordsVerified;
        const ring = !f.operational ? "var(--status-problem-fg)" : colour;
        return (
          <CircleMarker
            key={f.id}
            center={[f.lat, f.lng]}
            radius={selected ? 9 : f.kind === "health" ? 7 : 5.5}
            pathOptions={{
              color: selected ? "var(--wheat)" : ring,
              weight: selected ? 3.5 : 2.5,
              fillColor: deptFill,
              fillOpacity: hollow ? 0.12 : 1,
              opacity: 1,
              ...(hollow ? { dashArray: "2 2" } : {}),
            }}
            eventHandlers={{ click: () => onSelect(f.id) }}
          >
            <Popup>
              <div className="min-w-44 text-ink">
                <div className="text-sm font-semibold leading-snug">{f.name}</div>
                <div className="code mt-0.5 text-xs text-ink-muted">{f.code}</div>
                <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                  <dt className="text-ink-muted">Tehsil</dt>
                  <dd>{f.tehsil}</dd>
                  <dt className="text-ink-muted">Status</dt>
                  <dd style={{ color: colour }} className="font-semibold">
                    {f.operational ? STATUS_LABEL[status] : (f.source?.status ?? "Non-functional")}
                  </dd>
                  <dt className="text-ink-muted">Coordinates</dt>
                  <dd>
                    {f.kind === "school"
                      ? "IMU coordinates file"
                      : f.coordsVerified
                        ? "Verified"
                        : "Awaiting field verification"}
                  </dd>
                </dl>
                <Link
                  to={f.kind === "school" ? "/schools/$id" : "/health/$id"}
                  params={{ id: f.id }}
                  className="mt-1.5 inline-block text-xs font-semibold text-dept hover:underline"
                >
                  Open facility page
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
