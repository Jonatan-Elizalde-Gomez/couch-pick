import { fetchJson } from "./client";

export type FilterPreferences = {
  autoApply: boolean;
  soloNoVistos: boolean;
};

export type FilterPreferencesResponse = {
  preferences: FilterPreferences;
};

export function getFilterPreferences(): Promise<FilterPreferencesResponse> {
  return fetchJson<FilterPreferencesResponse>("/preferences/filters");
}

export function saveFilterPreferences(preferences: FilterPreferences): Promise<FilterPreferencesResponse> {
  return fetchJson<FilterPreferencesResponse>("/preferences/filters", {
    method: "PUT",
    body: JSON.stringify(preferences),
  });
}
