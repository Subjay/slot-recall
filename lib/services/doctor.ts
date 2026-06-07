import { getDoctor as queryDoctor, getDoctors } from "@/lib/dal/doctor/queries";
import type { DoctorRecord } from "@/lib/dal/doctor/types";

export async function getAllDoctors(): Promise<DoctorRecord[]> {
  return getDoctors();
}

export async function getDoctor(id: DoctorRecord["id"]): Promise<DoctorRecord | null> {
  return queryDoctor({ criteria: { id } });
}
