/** Shape of one school row taken from the North Waziristan source files. */
export type SourceTehsil =
  | "Mirali"
  | "Miranshah"
  | "Datta Khel"
  | "Dossali"
  | "Spinwam"
  | "Shewa"
  | "Razmak"
  | "Ghulam Khan"
  | "Garyum";

export interface SchoolSourceRecord {
  /** "male": DEO(M) basic information sheet; "female": NF & closed female schools list. */
  source: "male" | "female";
  /** S# / S.No in the source sheet. */
  serial: number;
  emis: string | null;
  name: string;
  level: "Primary" | "Middle" | "High" | "Higher Secondary";
  gender: "Boys" | "Girls";
  tehsil: SourceTehsil | null;
  /** False when the female list's location column does not name exactly one tehsil. */
  tehsilStated: boolean;
  village: string | null;
  status: "Functional" | "Non-functional" | "Closed";
  /** Status cell exactly as written in the file. */
  statusText: string;
  reason: string | null;
  students: number | null;
  teachers: number | null;
  principal: string | null;
  lat: number | null;
  lng: number | null;
  /** Remark from the DEO's non-functional schools review (Non Func School.pptx). */
  deoRemark: string | null;
}

export const SOURCE_FILE_LABEL: Record<"male" | "female", string> = {
  male: "DEO(M) North Waziristan, schools basic information (26 Nov 2026)",
  female: "Non-functional & closed female schools, North Waziristan",
};
