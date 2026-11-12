export type Role = 'creator' | 'manager' | 'reviewer' | 'admin';

export type Severity = 'high' | 'medium' | 'low';

export type FindingCategory =
  | 'terminology'
  | 'claims'
  | 'facts'
  | 'tone'
  | 'vision'
  | 'accessibility';

export type FindingSource = 'ai' | 'rule' | 'ledger' | 'vision' | 'semantic';

export interface WorkspaceUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  workspaceId: string;
  title?: string;
  passwordHash?: string;
  cloudConnected?: boolean;
}

export interface BrandRule {
  id: string;
  title: string;
  text: string;
  category: FindingCategory | string;
  severity: Severity;
  keywords?: string[];
}

export interface BrandTerm {
  id: number;
  banned: string;
  preferred: string;
  ruleId: string;
}

export interface ApprovedFact {
  id: string;
  text: string;
  contradictionTrigger?: string[];
  ruleId?: string;
}

export interface ClaimLedgerEntry {
  id: number;
  phrase: string;
  evidence: string;
  owner: string;
  expires: string;
}

export interface PaletteSwatch {
  id: number;
  name: string;
  hex: string;
}

export interface VisionOcrRegion {
  id: string;
  text: string;
  fgHex: string;
  bgHex: string;
  fontSizePx: number;
  bbox: { x: number; y: number; w: number; h: number };
}

export interface VisionBannerPreset {
  id: string;
  name: string;
  workspaceId: string;
  channel: string;
  altText: string;
  dominantHex: string;
  secondaryHex: string;
  logoPresent: boolean;
  logoClearSpaceRatio: number;
  logoBbox?: { x: number; y: number; w: number; h: number };
  ocrRegions: VisionOcrRegion[];
}

export interface EvalSample {
  id: number;
  title: string;
  kind: 'text' | 'image';
  text: string;
  visionPresetId?: string;
  expected: Array<[string, string]>;
}

export interface BrandPack {
  id: string;
  name: string;
  industry: string;
  description: string;
  sampleGuidelineDoc: string;
  rules: BrandRule[];
  terms: BrandTerm[];
  facts: ApprovedFact[];
  claims: ClaimLedgerEntry[];
  palette: PaletteSwatch[];
  visionPresets: VisionBannerPreset[];
  samples: EvalSample[];
}

export interface VisionAnalysisSummary {
  ocrText: string;
  minContrastRatio: number;
  clearSpaceRatio: number;
  logoDetected: boolean;
  paletteDistance: number;
  regions: Array<{
    id: string;
    text: string;
    contrastRatio: number;
    passesAA: boolean;
    fgHex: string;
    bgHex: string;
  }>;
}

export interface RedactionSummary {
  originalText: string;
  redactedText: string;
  items: Array<{
    placeholder: string;
    kind: 'email' | 'phone' | 'pan' | 'handle';
    original: string;
  }>;
}

export interface ContentItem {
  id: number;
  workspaceId?: string;
  title: string;
  channel: string;
  kind: 'text' | 'document' | 'image';
  status: 'in_review' | 'changes_requested' | 'approved';
  author: string;
  route: 'manager' | 'reviewer';
  alt_text: string;
  imageDataUrl?: string;
  visionPresetId?: string;
  visionSummary?: VisionAnalysisSummary;
  redactionSummary?: RedactionSummary;
  created_at: string;
  updated_at: string;
}

export interface ContentVersion {
  id: number;
  content_id: number;
  n: number;
  body: string;
  redacted_body: string;
  by_name: string;
  created_at: string;
}

export interface Finding {
  id: number;
  content_id: number;
  version_id: number;
  rule_id: string;
  category: string;
  severity: Severity;
  source: FindingSource | string;
  confidence: number;
  semanticScore?: number;
  span: string;
  message: string;
  suggestion: string;
  replacement?: string;
  status: 'open' | 'dismissed' | 'fixed';
  reason?: string;
}

export interface CommentEntry {
  id: number;
  content_id: number;
  who: string;
  role: string;
  text: string;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  content_id: number;
  who: string;
  action: string;
  detail: string;
  created_at: string;
}

export interface SemanticRetrievalMatch {
  id: string;
  kind: 'rule' | 'fact' | 'claim';
  title: string;
  text: string;
  cosineScore: number;
  keywordScore: number;
}

export interface CategoryEvalMetrics {
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface EvaluationSampleResult {
  id: number;
  title: string;
  kind: 'text' | 'image';
  text: string;
  ok: boolean;
  hit: Array<[string, string]>;
  missed: Array<[string, string]>;
}

export interface EvaluationReport {
  pack: string;
  provider: string;
  model: string;
  retrievalMode: 'semantic-pgvector' | 'keyword-only';
  ran_at: string;
  totalSamples: number;
  overall: CategoryEvalMetrics;
  keywordBaselineOverall: CategoryEvalMetrics;
  categories: Record<string, CategoryEvalMetrics>;
  samples: EvaluationSampleResult[];
}
