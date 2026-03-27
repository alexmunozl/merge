export type HealthResponse = {
  status: "ok" | "degraded" | "error";
  uptimeSeconds?: number;
  version?: string;
  nodeEnv?: string;
  details?: Record<string, unknown>;
};

export type ProfileSearchRequest = {
  profileName?: string;
  givenName?: string;
  email?: string;
  phoneNumber?: string;
  profileType?: string;
  limit?: number;
};

export type MergeAnalyzeRequest = {
  masterProfileId: string;
  duplicateProfileId: string;
  autoApprove?: boolean;
};

export type MergeExecuteRequest = {
  masterProfileId: string;
  duplicateProfileId: string;
  approved?: boolean;
};

export type EnvVar = { key: string; value: string; editable: boolean; masked?: boolean };
export type EnvGetResponse = { allowlist: string[]; vars: EnvVar[]; restartRequired: boolean };
export type EnvPutRequest = { vars: { key: string; value: string }[] };
export type EnvPutResponse = { updated: string[]; restartRequired: boolean };

export type RuntimeSetting = { key: string; value: string; description?: string; type?: string; editable: boolean; masked?: boolean };

export type SettingsGetResponse = {
  settings: RuntimeSetting[];
  liveApply: boolean;
};

export type SettingsPutRequest = {
  settings: { key: string; value: string }[];
};

export type SettingsPutResponse = {
  updated: string[];
  liveApply: boolean;
};
