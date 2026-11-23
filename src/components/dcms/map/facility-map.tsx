import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";

import { STATUS_LABEL, type Facility, type ReportStatus } from "@/data/mock";
import { STATUS_TONE, TONE_VAR } from "../status";

export interface MapProps {
  facilities: Facility[];
  statusFor: (id: string) => ReportStatus;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function FlyTo({ facilities, selectedId }: { facilities: Facility[]; selectedId: string | null }) {
  const map = useMap();
  useEffect(() => {
    const f = facilities.find((x) => x.id === selectedId);
    if (f) map.panTo([f.lat, f.lng], { animate: true, duration: 0.25 });
  }, [selectedId, facilities, map]);
  return null;
}

/** Leaflet map: small circles in report-status colour with a white ring; hollow when coordinates are unverified. */
export default function FacilityMap({ facilities, statusFor, selectedId, onSelect }: MapProps) {
  return (
    <MapContainer center={[32.99, 70.6]} zoom={10} scrollWheelZoom={false} className="h-[520px] w-full rounded-[5px]" aria-label="Map of facilities in District Bannu">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FlyTo facilities={facilities} selectedId={selectedId} />
      {facilities.map((f) => {
        const status = statusFor(f.id);
        const colour = TONE_VAR[STATUS_TONE[status]];
        const selected = f.id === selectedId;
        return (
          <CircleMarker
            key={f.id}
            center={[f.lat, f.lng]}
            radius={selected ? 9 : f.kind === "health" ? 7 : 5.5}
            pathOptions={{
              color: selected ? "var(--wheat)" : "white",
              weight: selected ? 3 : 2,
              fillColor: colour,
              fillOpacity: f.coordsVerified ? 1 : 0,
              opacity: 1,
              ...(f.coordsVerified ? {} : { color: colour, weight: selected ? 3 : 2, dashArray: "2 2" }),
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
                    {STATUS_LABEL[status]}
                  </dd>
                  <dt className="text-ink-muted">Coordinates</dt>
                  <dd>{f.coordsVerified ? "Verified" : "Illustrative, not verified"}</dd>
                </dl>
                <a href={f.kind === "school" ? `/schools/${f.id}` : `/health/${f.id}`} className="mt-1.5 inline-block text-xs font-semibold text-kurram hover:underline">
                  Open facility page
                </a>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
