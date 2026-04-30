export interface EmailPayload {
  to: string | string[];
  from?: string;
  subject?: string;
  templateType: string;
  data: Record<string, any>;
}
