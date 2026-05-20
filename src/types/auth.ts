export type RegistrationStatus = "pending" | "approved" | "rejected";
export type FormFieldType = "text" | "url" | "select" | "multiselect" | "checkbox" | "textarea";

export interface FormField {
  id: string;
  key: string;
  label: string;
  fieldType: FormFieldType;
  required: boolean;
  fieldOrder: number;
  options?: string[];
  locked: boolean;
  hidden: boolean;
  placeholder?: string;
  validationHint?: string;
}

export interface Registration {
  id: string;
  discordId: string;
  discordUsername: string;
  discordDisplayName?: string;
  seasonId?: string;
  playerId?: string;
  formData: Record<string, string>;
  status: RegistrationStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
}
