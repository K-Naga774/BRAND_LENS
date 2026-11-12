import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  doublePrecision,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  pack: text('pack').notNull().default('acme-pay'),
  redact: boolean('redact').notNull().default(true),
  engine: text('engine').notNull().default('cite-or-drop-v3'),
  retrieval: text('retrieval').notNull().default('pgvector cosine + keyword hybrid'),
  ocr: boolean('ocr').notNull().default(true),
  connectedEmail: text('connected_email').notNull().default('ssmb71110@gmail.com'),
  cloudIntelligenceProvider: text('cloud_intelligence_provider')
    .notNull()
    .default('Cloud Intelligence (Gemini & Hybrid Governance)'),
  cloudIntelligenceModel: text('cloud_intelligence_model')
    .notNull()
    .default('gemini-3.8-flash'),
  apiKeyPlaceholderStatus: text('api_key_placeholder_status')
    .notNull()
    .default('CLOUD_INTELLIGENCE_API_KEY_PLACEHOLDER_READY'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('admin'),
  workspaceId: text('workspace_id').notNull().default('acme-pay'),
  title: text('title').notNull().default('Cloud Intelligence & Governance Admin'),
  passwordHash: text('password_hash').notNull(),
  cloudConnected: boolean('cloud_connected').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cloudIntelligenceConnections = pgTable('cloud_intelligence_connections', {
  id: serial('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().default('acme-pay'),
  boundEmail: text('bound_email').notNull().default('ssmb71110@gmail.com'),
  provider: text('provider').notNull().default('Cloud Intelligence'),
  model: text('model').notNull().default('gemini-3.8-flash'),
  apiKeyEnvVar: text('api_key_env_var').notNull().default('CLOUD_INTELLIGENCE_API_KEY'),
  placeholderConfigured: boolean('placeholder_configured').notNull().default(true),
  status: text('status').notNull().default('connected'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contents = pgTable('contents', {
  id: serial('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().default('acme-pay'),
  title: text('title').notNull(),
  channel: text('channel').notNull(),
  kind: text('kind').notNull().default('text'),
  status: text('status').notNull().default('in_review'),
  author: text('author').notNull(),
  route: text('route').notNull().default('manager'),
  altText: text('alt_text').notNull().default(''),
  imageDataUrl: text('image_data_url'),
  visionPresetId: text('vision_preset_id'),
  visionSummary: jsonb('vision_summary'),
  redactionSummary: jsonb('redaction_summary'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const contentVersions = pgTable('content_versions', {
  id: serial('id').primaryKey(),
  contentId: integer('content_id').notNull(),
  n: integer('n').notNull().default(1),
  body: text('body').notNull(),
  redactedBody: text('redacted_body').notNull(),
  byName: text('by_name').notNull(),
  createdAt: text('created_at').notNull(),
});

export const findings = pgTable('findings', {
  id: serial('id').primaryKey(),
  contentId: integer('content_id').notNull(),
  versionId: integer('version_id').notNull(),
  ruleId: text('rule_id').notNull(),
  category: text('category').notNull(),
  severity: text('severity').notNull(),
  source: text('source').notNull(),
  confidence: doublePrecision('confidence').notNull().default(0.95),
  semanticScore: doublePrecision('semantic_score'),
  span: text('span').notNull(),
  message: text('message').notNull(),
  suggestion: text('suggestion').notNull(),
  replacement: text('replacement'),
  status: text('status').notNull().default('open'),
  reason: text('reason'),
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  contentId: integer('content_id').notNull(),
  who: text('who').notNull(),
  role: text('role').notNull(),
  text: text('text').notNull(),
  createdAt: text('created_at').notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().default('acme-pay'),
  contentId: integer('content_id').notNull(),
  who: text('who').notNull(),
  action: text('action').notNull(),
  detail: text('detail').notNull(),
  createdAt: text('created_at').notNull(),
});

export const invites = pgTable('invites', {
  code: text('code').primaryKey(),
  workspaceId: text('workspace_id').notNull().default('acme-pay'),
  role: text('role').notNull().default('creator'),
  used: boolean('used').notNull().default(false),
  createdAt: text('created_at').notNull(),
});
