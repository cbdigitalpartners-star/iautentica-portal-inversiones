export type DocumentCategory =
  | "Update Mensual"
  | "Term Sheet"
  | "Legal"
  | "Informe Trimestral"
  | "Documentos proyectos";

export type Role = "investor" | "admin" | "advisor";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  locale: "es" | "en";
  created_at: string;
};

export type Developer = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
};

export type Fund = {
  id: string;
  developer_id: string | null;
  name: string;
  type: string;
  units: number;
  total_equity: number;
  delivery_date: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
};

export type FundAccess = {
  id: string;
  user_id: string;
  fund_id: string;
  granted_at: string;
};

export type AdvisorInvestor = {
  id: string;
  advisor_id: string;
  investor_id: string;
  granted_at: string;
};

export type ContributionMilestone = {
  id: string;
  fund_id: string;
  name: string;
  description: string | null;
  expected_date: string | null;
  expected_amount: number | null;
  sort_order: number;
  reached_at: string | null;
  created_at: string;
};

export type Contribution = {
  id: string;
  user_id: string;
  fund_id: string;
  milestone_id: string | null;
  amount: number;
  committed_amount: number | null;
  dividends: number;
  date: string;
  notes: string | null;
  created_at: string;
};

export type Document = {
  id: string;
  fund_id: string;
  name: string;
  category: DocumentCategory;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FundPhoto = {
  id: string;
  fund_id: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

export type NotificationType =
  | "document_new"
  | "document_updated"
  | "contribution_new"
  | "milestone_reached";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

export type AuditLog = {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: AuditAction;
  entity_table: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  diff: Record<string, { from: unknown; to: unknown }> | null;
};

type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      developers: TableDef<Developer>;
      funds: TableDef<Fund>;
      fund_access: TableDef<FundAccess>;
      advisor_investors: TableDef<AdvisorInvestor>;
      contribution_milestones: TableDef<ContributionMilestone>;
      contributions: TableDef<Contribution>;
      documents: TableDef<Document>;
      fund_photos: TableDef<FundPhoto>;
      notifications: TableDef<Notification>;
      audit_logs: TableDef<AuditLog>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
