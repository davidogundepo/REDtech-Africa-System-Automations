import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const sb = supabase as any;

// ──────────────────────────── Types ────────────────────────────
export type CandidateStage = "applied" | "screening" | "interview" | "assessment" | "offer" | "hired" | "rejected";
export const CANDIDATE_STAGES: CandidateStage[] = ["applied","screening","interview","assessment","offer","hired","rejected"];
export const STAGE_LABEL: Record<CandidateStage,string> = {
  applied: "Applied", screening: "Screening", interview: "Interview",
  assessment: "Assessment", offer: "Offer", hired: "Hired", rejected: "Rejected",
};

export interface JobOpening {
  id: string; title: string; department: string | null; hiring_manager: string | null;
  employment_type: string; location: string | null; description: string | null;
  status: "draft"|"open"|"on_hold"|"closed"; opened_at: string; closed_at: string | null;
  created_by: string | null; created_at: string; updated_at: string;
}
export interface Candidate {
  id: string; job_opening_id: string | null; full_name: string; email: string | null;
  phone: string | null; source: string | null; cv_url: string | null;
  stage: CandidateStage; notes: string | null; rating: number | null;
  hired_profile_id: string | null; created_by: string | null;
  created_at: string; updated_at: string;
}
export interface Interview {
  id: string; candidate_id: string; interviewer_id: string | null;
  scheduled_at: string; mode: "video"|"phone"|"onsite";
  status: "scheduled"|"completed"|"cancelled"|"no_show";
  feedback: string | null; rating: number | null;
}
export interface ReviewCycle {
  id: string; name: string; period_label: string | null;
  starts_on: string; ends_on: string; status: "planned"|"active"|"closed";
}
export interface Goal {
  id: string; cycle_id: string | null; employee_id: string; title: string;
  description: string | null; metric: string | null; target_value: string | null;
  status: "active"|"achieved"|"missed"|"dropped"; weight: number;
}
export interface Review {
  id: string; cycle_id: string; employee_id: string; reviewer_id: string | null;
  type: "self"|"manager"|"peer"; status: "draft"|"submitted"|"acknowledged";
  rating: number | null; strengths: string | null; improvements: string | null;
  summary: string | null; submitted_at: string | null; acknowledged_at: string | null;
}
export interface LearningProgram {
  id: string; title: string; description: string | null; department: string | null;
  owner_id: string | null; delivery_mode: "self_paced"|"live"|"blended"|"external";
  due_date: string | null; status: "draft"|"active"|"archived"; material_url: string | null;
}
export interface Enrollment {
  id: string; program_id: string; employee_id: string;
  status: "not_started"|"in_progress"|"completed"|"overdue";
  enrolled_at: string; completed_at: string | null; certificate_url: string | null;
}

// ──────────────────────────── Hooks ────────────────────────────
export function useJobOpenings() {
  return useQuery({
    queryKey: ["hr_job_openings"],
    queryFn: async () => {
      const { data, error } = await sb.from("hr_job_openings").select("*").order("created_at",{ascending:false});
      if (error) throw error;
      return (data ?? []) as JobOpening[];
    },
  });
}

export function useCandidates(jobId?: string) {
  return useQuery({
    queryKey: ["hr_candidates", jobId ?? "all"],
    queryFn: async () => {
      let q = sb.from("hr_candidates").select("*").order("created_at",{ascending:false});
      if (jobId) q = q.eq("job_opening_id", jobId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Candidate[];
    },
  });
}

export function useInterviews(candidateId?: string) {
  return useQuery({
    queryKey: ["hr_interviews", candidateId ?? "all"],
    queryFn: async () => {
      let q = sb.from("hr_interviews").select("*").order("scheduled_at",{ascending:false});
      if (candidateId) q = q.eq("candidate_id", candidateId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Interview[];
    },
  });
}

export function useReviewCycles() {
  return useQuery({
    queryKey: ["hr_review_cycles"],
    queryFn: async () => {
      const { data, error } = await sb.from("hr_review_cycles").select("*").order("starts_on",{ascending:false});
      if (error) throw error;
      return (data ?? []) as ReviewCycle[];
    },
  });
}

export function useGoals(employeeId?: string, cycleId?: string) {
  return useQuery({
    queryKey: ["hr_goals", employeeId ?? "all", cycleId ?? "all"],
    queryFn: async () => {
      let q = sb.from("hr_goals").select("*").order("created_at",{ascending:false});
      if (employeeId) q = q.eq("employee_id", employeeId);
      if (cycleId) q = q.eq("cycle_id", cycleId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Goal[];
    },
  });
}

export function useReviews(cycleId?: string) {
  return useQuery({
    queryKey: ["hr_reviews", cycleId ?? "all"],
    queryFn: async () => {
      let q = sb.from("hr_reviews").select("*").order("updated_at",{ascending:false});
      if (cycleId) q = q.eq("cycle_id", cycleId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });
}

export function useLearningPrograms() {
  return useQuery({
    queryKey: ["hr_learning_programs"],
    queryFn: async () => {
      const { data, error } = await sb.from("hr_learning_programs").select("*").order("created_at",{ascending:false});
      if (error) throw error;
      return (data ?? []) as LearningProgram[];
    },
  });
}

export function useEnrollments(programId?: string, employeeId?: string) {
  return useQuery({
    queryKey: ["hr_enrollments", programId ?? "all", employeeId ?? "all"],
    queryFn: async () => {
      let q = sb.from("hr_learning_enrollments").select("*").order("enrolled_at",{ascending:false});
      if (programId) q = q.eq("program_id", programId);
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Enrollment[];
    },
  });
}

// Generic CRUD mutation
export function useHRMutation(table: string, invalidateKeys: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { op: "insert"|"update"|"delete"; row: any }) => {
      let res;
      if (payload.op === "insert")  res = await sb.from(table).insert(payload.row).select().single();
      if (payload.op === "update")  res = await sb.from(table).update(payload.row).eq("id", payload.row.id).select().single();
      if (payload.op === "delete")  res = await sb.from(table).delete().eq("id", payload.row.id);
      if (res?.error) throw res.error;
      return res?.data;
    },
    onSuccess: () => {
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// Profiles helper for assignment dropdowns
export function useProfilesLite() {
  return useQuery({
    queryKey: ["profiles_lite"],
    queryFn: async () => {
      const { data, error } = await sb.from("profiles").select("id, full_name, email, role, department").order("full_name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; full_name: string; email: string; role: string; department: string | null }>;
    },
    staleTime: 60_000,
  });
}
