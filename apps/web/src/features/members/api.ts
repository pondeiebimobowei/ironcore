import { apiClient } from "../../lib/api/client";
import type { MemberFormInput } from "../../lib/validations/member";
import type { MemberDetail, MemberStatus, MemberSummary } from "./types";

type ListMembersParams = {
  search?: string;
  status?: MemberStatus | "";
};

export async function listMembers(params: ListMembersParams) {
  const response = await apiClient.get<MemberSummary[]>("/api/members", {
    params,
  });

  return response.data;
}

export async function getMember(memberId: string) {
  const response = await apiClient.get<MemberDetail>(
    `/api/members/${memberId}`,
  );

  return response.data;
}

export async function createMember(input: MemberFormInput) {
  const response = await apiClient.post<MemberDetail>("/api/members", input);

  return response.data;
}

export async function updateMember(
  memberId: string,
  input: Partial<MemberFormInput> & { status?: MemberStatus },
) {
  const response = await apiClient.patch<MemberDetail>(
    `/api/members/${memberId}`,
    input,
  );

  return response.data;
}

export async function importMembers(rows: MemberFormInput[]) {
  const response = await apiClient.post<{
    createdCount: number;
    errors: Array<{ row: number; message: string }>;
  }>("/api/members/import", { rows });

  return response.data;
}
