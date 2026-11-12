import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { eq } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  workspaces,
  users,
  cloudIntelligenceConnections,
  contents,
  invites as invitesTable,
} from './src/db/schema.ts';
import {
  BRAND_PACKS,
  extractGuidelineProposal,
  runBrandGovernancePipeline,
  runEvaluationSuite,
} from './src/engine/governanceEngine.ts';
import {
  CLOUD_INTELLIGENCE_CONNECTED_EMAIL,
  resolveCloudIntelligenceConfig,
  verifyCloudIntelligenceConnection,
} from './src/engine/cloudIntelligence.ts';
import {
  AuditEntry,
  BrandPack,
  CommentEntry,
  ContentItem,
  ContentVersion,
  EvaluationReport,
  Finding,
  WorkspaceUser,
} from './src/engine/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'BrandLens#2026';

interface WorkspaceRuntimeState {
  id: string;
  name: string;
  packId: string;
  redact: boolean;
  ocr: boolean;
  retrieval: string;
  pack: BrandPack;
  users: WorkspaceUser[];
  contents: ContentItem[];
  versions: ContentVersion[];
  findings: Finding[];
  comments: CommentEntry[];
  audit: AuditEntry[];
  invites: Array<{ code: string; role: string; used: boolean; created_at: string }>;
  lastEval: EvaluationReport | null;
}

const clonePack = (packId: string): BrandPack => {
  const src = BRAND_PACKS[packId] || BRAND_PACKS['acme-pay'];
  return JSON.parse(JSON.stringify(src)) as BrandPack;
};

const nowIso = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

const INITIAL_USERS: WorkspaceUser[] = [
  {
    id: 1,
    name: 'Cloud Intelligence Admin',
    email: CLOUD_INTELLIGENCE_CONNECTED_EMAIL,
    role: 'admin',
    workspaceId: 'acme-pay',
  },
  {
    id: 2,
    name: 'Asha Rao',
    email: 'asha.rao@acmepay.in',
    role: 'creator',
    workspaceId: 'acme-pay',
  },
  {
    id: 3,
    name: 'Vikram Menon',
    email: 'vikram.menon@acmepay.in',
    role: 'manager',
    workspaceId: 'acme-pay',
  },
  {
    id: 4,
    name: 'Meera Krishnan',
    email: 'meera.krishnan@acmepay.in',
    role: 'reviewer',
    workspaceId: 'acme-pay',
  },
];

let nextContentId = 1;
let nextVersionId = 1;
let nextFindingId = 1;
let nextCommentId = 1;
let nextAuditId = 1;
let nextUserId = 10;

const sessionTokens = new Map<string, WorkspaceUser>();
const workspacesMap = new Map<string, WorkspaceRuntimeState>();

function executePipelineAndAttachIds(params: {
  pack: BrandPack;
  contentId: number;
  versionId: number;
  text: string;
  kind: 'text' | 'document' | 'image';
  altText?: string;
  visionPresetId?: string;
  redactBeforeAI: boolean;
}) {
  const preset = params.visionPresetId
    ? params.pack.visionPresets.find((p) => p.id === params.visionPresetId) ||
      params.pack.visionPresets[0]
    : undefined;

  const raw = runBrandGovernancePipeline({
    text: params.text,
    kind: params.kind,
    altText: params.altText,
    visionPreset: preset,
    pack: params.pack,
    useSemanticAI: true,
    redactBeforeAI: params.redactBeforeAI,
  });

  const findingsWithIds: Finding[] = raw.findings.map((f) => ({
    ...f,
    id: nextFindingId++,
    content_id: params.contentId,
    version_id: params.versionId,
  }));

  return {
    findings: findingsWithIds,
    route: raw.route,
    visionSummary: raw.visionSummary,
    redactionSummary: raw.redactionSummary,
  };
}

function buildInitialWorkspace(
  id: string,
  name: string,
  packId: string
): WorkspaceRuntimeState {
  const pack = clonePack(packId);
  const state: WorkspaceRuntimeState = {
    id,
    name,
    packId,
    redact: true,
    ocr: true,
    retrieval: 'pgvector cosine + keyword hybrid',
    pack,
    users: INITIAL_USERS.map((u) => ({ ...u, workspaceId: id })),
    contents: [],
    versions: [],
    findings: [],
    comments: [],
    audit: [],
    invites: [
      { code: 'ACME2026', role: 'creator', used: false, created_at: '2026-11-10 09:00' },
      { code: 'REVW2026', role: 'reviewer', used: false, created_at: '2026-11-10 09:15' },
    ],
    lastEval: runEvaluationSuite(pack),
  };

  const seedSubmissions = [
    {
      title: 'Q4 UPI Launch Announcement',
      channel: 'LinkedIn',
      author: CLOUD_INTELLIGENCE_CONNECTED_EMAIL,
      kind: 'text' as const,
      text: 'AcmePay is the #1 fastest in India! Contact ssmb71110@gmail.com or +91 98765 43210 for REVOLUTIONARY instant onboarding.',
      alt_text: '',
      visionPresetId: undefined,
    },
    {
      title: 'Festival Cashback Campaign Poster',
      channel: 'Poster',
      author: 'asha.rao@acmepay.in',
      kind: 'image' as const,
      text: 'AcmePay is the #1 fastest in India and costs 40% less! Now accepting Bitcoin for all users with REVOLUTIONARY speed!',
      alt_text: '',
      visionPresetId: 'acme-banner-violation',
    },
    {
      title: 'Merchant Settlement Update',
      channel: 'Website',
      author: 'vikram.menon@acmepay.in',
      kind: 'text' as const,
      text: 'Acme Pay processes over 12 million UPI transactions monthly across 18,000 merchants with 99.95% uptime.',
      alt_text: '',
      visionPresetId: undefined,
    },
  ];

  for (const sub of seedSubmissions) {
    const cid = nextContentId++;
    const vid = nextVersionId++;
    const pipeline = executePipelineAndAttachIds({
      pack: state.pack,
      contentId: cid,
      versionId: vid,
      text: sub.text,
      kind: sub.kind,
      altText: sub.alt_text,
      visionPresetId: sub.visionPresetId,
      redactBeforeAI: state.redact,
    });

    const isApproved = pipeline.findings.length === 0;
    const contentItem: ContentItem = {
      id: cid,
      workspaceId: id,
      title: sub.title,
      channel: sub.channel,
      kind: sub.kind,
      status: isApproved ? 'approved' : 'in_review',
      route: pipeline.route,
      author: sub.author,
      alt_text: sub.alt_text,
      created_at: '2026-11-11 10:15',
      updated_at: '2026-11-11 14:30',
      visionPresetId: sub.visionPresetId,
      visionSummary: pipeline.visionSummary,
      redactionSummary: pipeline.redactionSummary,
    };

    const versionItem: ContentVersion = {
      id: vid,
      content_id: cid,
      n: 1,
      body: sub.text,
      redacted_body: pipeline.redactionSummary.redactedText,
      by_name: sub.author,
      created_at: '2026-11-11 10:15',
    };

    state.contents.unshift(contentItem);
    state.versions.push(versionItem);
    state.findings.push(...pipeline.findings);
    state.audit.unshift({
      id: nextAuditId++,
      content_id: cid,
      who: sub.author,
      action: isApproved ? 'approved' : 'submitted_review',
      detail: `v1 analyzed (${pipeline.findings.length} finding(s))`,
      created_at: '2026-11-11 10:15',
    });
  }

  return state;
}

workspacesMap.set('acme-pay', buildInitialWorkspace('acme-pay', 'Acme Pay', 'acme-pay'));
workspacesMap.set('nova-health', buildInitialWorkspace('nova-health', 'NovaHealth', 'nova-health'));
workspacesMap.set('terra-grid', buildInitialWorkspace('terra-grid', 'TerraGrid', 'terra-grid'));

async function syncSeedDataToPostgres() {
  try {
    const wsState = workspacesMap.get('acme-pay')!;
    const aiCfg = resolveCloudIntelligenceConfig(CLOUD_INTELLIGENCE_CONNECTED_EMAIL);

    await db
      .insert(workspaces)
      .values({
        id: 'acme-pay',
        name: 'Acme Pay',
        pack: 'acme-pay',
        redact: true,
        ocr: true,
        retrieval: wsState.retrieval,
        connectedEmail: CLOUD_INTELLIGENCE_CONNECTED_EMAIL,
      })
      .onConflictDoNothing();

    for (const u of wsState.users) {
      await db
        .insert(users)
        .values({
          workspaceId: 'acme-pay',
          name: u.name,
          email: u.email,
          role: u.role,
          passwordHash: DEMO_PASSWORD,
          cloudConnected: u.email === CLOUD_INTELLIGENCE_CONNECTED_EMAIL,
        })
        .onConflictDoNothing();
    }

    await db
      .insert(cloudIntelligenceConnections)
      .values({
        workspaceId: 'acme-pay',
        boundEmail: CLOUD_INTELLIGENCE_CONNECTED_EMAIL,
        provider: aiCfg.provider,
        model: aiCfg.model,
        apiKeyEnvVar: aiCfg.apiKeyEnvVar,
        placeholderConfigured: aiCfg.placeholderConfigured,
        status: 'connected_ready',
      })
      .onConflictDoNothing();

    const existingContents = await db.select().from(contents).limit(1);
    if (existingContents.length === 0) {
      for (const c of wsState.contents.slice().reverse()) {
        await db.insert(contents).values({
          workspaceId: c.workspaceId || 'acme-pay',
          title: c.title,
          channel: c.channel,
          kind: c.kind,
          status: c.status,
          route: c.route,
          author: c.author,
          altText: c.alt_text,
          imageDataUrl: c.imageDataUrl,
          visionPresetId: c.visionPresetId,
          visionSummary: c.visionSummary ?? null,
          redactionSummary: c.redactionSummary ?? null,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        });
      }
    }
  } catch (err) {
    console.warn('PostgreSQL background sync warning (continuing with hybrid state):', err);
  }
}

function getWorkspaceForReq(req: Request): WorkspaceRuntimeState {
  const wsHeader = String(req.headers['x-workspace-id'] || 'acme-pay');
  return workspacesMap.get(wsHeader) || workspacesMap.get('acme-pay')!;
}

function getUserForReq(req: Request, ws: WorkspaceRuntimeState): WorkspaceUser {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const tok = authHeader.slice(7).trim();
    const mapped = sessionTokens.get(tok);
    if (mapped) return mapped;
  }
  return ws.users[0];
}

function enrichContentItem(c: ContentItem, ws: WorkspaceRuntimeState) {
  const openList = ws.findings.filter(
    (f) => f.content_id === c.id && f.status === 'open'
  );
  const openHigh = openList.filter((f) => f.severity === 'high').length;
  const versionCount = ws.versions.filter((v) => v.content_id === c.id).length;
  return {
    ...c,
    open_findings: openList.length,
    open_high: openHigh,
    versionCount: Math.max(1, versionCount),
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  await syncSeedDataToPostgres();

  // 1. GET /api/config
  app.get('/api/config', async (_req: Request, res: Response) => {
    const ws = workspacesMap.get('acme-pay')!;
    const aiCfg = resolveCloudIntelligenceConfig(CLOUD_INTELLIGENCE_CONNECTED_EMAIL);
    const defaultUser = ws.users[0];

    res.json({
      ai: {
        enabled: aiCfg.enabled,
        provider: aiCfg.provider,
        model: aiCfg.model,
        connectedEmail: aiCfg.connectedEmail,
        apiKeyEnvVar: aiCfg.apiKeyEnvVar,
        placeholderConfigured: aiCfg.placeholderConfigured,
        usingPlaceholder: aiCfg.usingPlaceholder,
      },
      demo: true,
      demo_password: DEMO_PASSWORD,
      demo_users: ws.users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
      engine: 'Deterministic + Cite-or-Drop Cloud Intelligence',
      ocr: ws.ocr,
      retrieval: ws.retrieval,
      user: {
        ...defaultUser,
        ws: ws.id,
        ws_name: ws.name,
      },
      jwtToken: 'demo-session-token',
    });
  });

  // 2. POST /api/auth/login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const email = String(req.body?.email || CLOUD_INTELLIGENCE_CONNECTED_EMAIL)
        .trim()
        .toLowerCase();
      const ws = workspacesMap.get('acme-pay')!;
      let found = ws.users.find((u) => u.email.toLowerCase() === email);

      if (!found) {
        found = {
          id: nextUserId++,
          name:
            email === CLOUD_INTELLIGENCE_CONNECTED_EMAIL
              ? 'Cloud Intelligence Admin'
              : email.split('@')[0],
          email,
          role:
            email === CLOUD_INTELLIGENCE_CONNECTED_EMAIL ? 'admin' : 'creator',
          workspaceId: ws.id,
        };
        ws.users.push(found);
      }

      try {
        await db
          .insert(users)
          .values({
            workspaceId: ws.id,
            name: found.name,
            email: found.email,
            role: found.role,
            passwordHash: DEMO_PASSWORD,
            cloudConnected: found.email === CLOUD_INTELLIGENCE_CONNECTED_EMAIL,
          })
          .onConflictDoNothing();
      } catch (dbErr) {
        console.warn('PostgreSQL login upsert warning:', dbErr);
      }

      const tok = `bl-sess-${Date.now()}-${found.id}`;
      const pubUser = { ...found, ws: ws.id, ws_name: ws.name };
      sessionTokens.set(tok, pubUser);
      res.json({ token: tok, jwtToken: tok, user: pubUser });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ detail: 'Unable to sign in' });
    }
  });

  // 3. POST /api/auth/register
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const workspaceName = String(req.body?.workspace || 'Acme Pay').trim();
      const name = String(req.body?.name || 'Workspace Admin').trim();
      const email = String(req.body?.email || CLOUD_INTELLIGENCE_CONNECTED_EMAIL)
        .trim()
        .toLowerCase();
      const ws = workspacesMap.get('acme-pay')!;
      ws.name = workspaceName || ws.name;

      let userObj = ws.users.find((u) => u.email.toLowerCase() === email);
      if (!userObj) {
        userObj = {
          id: nextUserId++,
          name,
          email,
          role: 'admin',
          workspaceId: ws.id,
        };
        ws.users.push(userObj);
      }

      try {
        await db
          .insert(users)
          .values({
            workspaceId: ws.id,
            name: userObj.name,
            email: userObj.email,
            role: userObj.role,
            passwordHash: DEMO_PASSWORD,
            cloudConnected: userObj.email === CLOUD_INTELLIGENCE_CONNECTED_EMAIL,
          })
          .onConflictDoNothing();
      } catch (dbErr) {
        console.warn('PostgreSQL register warning:', dbErr);
      }

      const tok = `bl-sess-${Date.now()}-${userObj.id}`;
      const pubUser = { ...userObj, ws: ws.id, ws_name: ws.name };
      sessionTokens.set(tok, pubUser);
      res.json({ token: tok, jwtToken: tok, user: pubUser });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ detail: 'Unable to create workspace' });
    }
  });

  // 4. POST /api/auth/join
  app.post('/api/auth/join', async (req: Request, res: Response) => {
    try {
      const code = String(req.body?.code || '').trim().toUpperCase();
      const name = String(req.body?.name || 'Team Member').trim();
      const email = String(req.body?.email || CLOUD_INTELLIGENCE_CONNECTED_EMAIL)
        .trim()
        .toLowerCase();
      const ws = workspacesMap.get('acme-pay')!;
      const inv = ws.invites.find((i) => i.code === code && !i.used);
      const assignedRole = (inv?.role as WorkspaceUser['role']) || 'creator';
      if (inv) inv.used = true;

      const userObj: WorkspaceUser = {
        id: nextUserId++,
        name,
        email,
        role: assignedRole,
        workspaceId: ws.id,
      };
      ws.users.push(userObj);

      try {
        await db
          .insert(users)
          .values({
            workspaceId: ws.id,
            name: userObj.name,
            email: userObj.email,
            role: userObj.role,
            passwordHash: DEMO_PASSWORD,
            cloudConnected: userObj.email === CLOUD_INTELLIGENCE_CONNECTED_EMAIL,
          })
          .onConflictDoNothing();
      } catch (dbErr) {
        console.warn('PostgreSQL join warning:', dbErr);
      }

      const tok = `bl-sess-${Date.now()}-${userObj.id}`;
      const pubUser = { ...userObj, ws: ws.id, ws_name: ws.name };
      sessionTokens.set(tok, pubUser);
      res.json({ token: tok, jwtToken: tok, user: pubUser });
    } catch (err) {
      console.error('Join error:', err);
      res.status(500).json({ detail: 'Unable to join workspace' });
    }
  });

  // 5. GET /api/ai/status (Cloud Intelligence Connectivity & API Key Placeholder Diagnostics)
  app.get('/api/ai/status', async (_req: Request, res: Response) => {
    try {
      const status = await verifyCloudIntelligenceConnection(
        CLOUD_INTELLIGENCE_CONNECTED_EMAIL
      );
      try {
        await db
          .update(cloudIntelligenceConnections)
          .set({
            status: status.ok ? 'connected_ready' : 'degraded',
            updatedAt: new Date(),
          })
          .where(
            eq(
              cloudIntelligenceConnections.boundEmail,
              CLOUD_INTELLIGENCE_CONNECTED_EMAIL
            )
          );
      } catch (dbErr) {
        console.warn('PostgreSQL status update warning:', dbErr);
      }
      res.json(status);
    } catch (err) {
      console.error('Cloud Intelligence status error:', err);
      res.status(500).json({ detail: 'Failed to verify Cloud Intelligence status' });
    }
  });

  // 7. GET /api/dashboard
  app.get('/api/dashboard', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    const enriched = ws.contents.map((c) => enrichContentItem(c, ws));
    const approved = enriched.filter((c) => c.status === 'approved').length;
    const awaiting = enriched.filter((c) => c.status === 'in_review').length;
    const changes = enriched.filter(
      (c) => c.status === 'changes_requested'
    ).length;
    const openHigh = ws.findings.filter(
      (f) => f.status === 'open' && f.severity === 'high'
    ).length;

    const catCounts = new Map<string, number>();
    ws.findings.forEach((f) => {
      catCounts.set(f.category, (catCounts.get(f.category) || 0) + 1);
    });

    const ruleStats = new Map<
      string,
      { category: string; total: number; dismissed: number }
    >();
    ws.findings.forEach((f) => {
      const cur = ruleStats.get(f.rule_id) || {
        category: f.category,
        total: 0,
        dismissed: 0,
      };
      cur.total += 1;
      if (f.status === 'dismissed') cur.dismissed += 1;
      ruleStats.set(f.rule_id, cur);
    });

    const byRule = Array.from(ruleStats.entries()).map(([rule_id, st]) => ({
      rule_id,
      category: st.category,
      total: st.total,
      dismissed: st.dismissed,
      unclear: st.total >= 2 && st.dismissed / st.total >= 0.5,
    }));

    const claimsHealth = ws.pack.claims.map((c) => ({
      ...c,
      expired: c.expires < '2026-11-09',
    }));

    const attention = enriched
      .filter((c) => c.status !== 'approved')
      .slice(0, 5);

    const recent = ws.audit.slice(0, 8).map((a) => {
      const item = ws.contents.find((c) => c.id === a.content_id);
      return { ...a, title: item?.title };
    });

    res.json({
      total: enriched.length,
      approved,
      awaiting,
      changes,
      open_high: openHigh,
      by_category: Array.from(catCounts.entries()).map(([category, n]) => ({
        category,
        n,
      })),
      by_rule: byRule,
      claims_health: claimsHealth,
      attention,
      recent,
      last_eval: ws.lastEval,
      pack: ws.pack.name,
    });
  });

  // 8. GET /api/contents
  app.get('/api/contents', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    res.json(ws.contents.map((c) => enrichContentItem(c, ws)));
  });

  // 9. POST /api/contents (Submit new review & persist to PostgreSQL)
  app.post('/api/contents', async (req: Request, res: Response) => {
    try {
      const ws = getWorkspaceForReq(req);
      const user = getUserForReq(req, ws);
      const title = String(req.body?.title || 'Launch post').trim();
      const channel = String(req.body?.channel || 'LinkedIn').trim();
      const text = String(req.body?.text || '').trim();
      const alt_text = String(req.body?.alt_text || '').trim();
      const kind = req.body?.kind === 'image' ? 'image' : 'text';
      const imageDataUrl = req.body?.imageDataUrl
        ? String(req.body.imageDataUrl)
        : undefined;
      const visionPresetId = req.body?.visionPresetId
        ? String(req.body.visionPresetId)
        : undefined;

      const cid = nextContentId++;
      const vid = nextVersionId++;
      const pipeline = executePipelineAndAttachIds({
        pack: ws.pack,
        contentId: cid,
        versionId: vid,
        text,
        kind,
        altText: alt_text,
        visionPresetId,
        redactBeforeAI: ws.redact,
      });

      const timestamp = nowIso();
      const newContent: ContentItem = {
        id: cid,
        workspaceId: ws.id,
        title,
        channel,
        kind,
        status: pipeline.findings.length === 0 ? 'approved' : 'in_review',
        route: pipeline.route,
        author: user.email,
        alt_text,
        created_at: timestamp,
        updated_at: timestamp,
        imageDataUrl,
        visionPresetId,
        visionSummary: pipeline.visionSummary,
        redactionSummary: pipeline.redactionSummary,
      };

      const newVer: ContentVersion = {
        id: vid,
        content_id: cid,
        n: 1,
        body: text || pipeline.visionSummary?.ocrText || '',
        redacted_body: pipeline.redactionSummary.redactedText,
        by_name: user.email,
        created_at: timestamp,
      };

      ws.contents.unshift(newContent);
      ws.versions.push(newVer);
      ws.findings.push(...pipeline.findings);
      ws.audit.unshift({
        id: nextAuditId++,
        content_id: cid,
        who: user.email,
        action: 'submitted_review',
        detail: `v1 analyzed (${pipeline.findings.length} finding(s))`,
        created_at: timestamp,
      });

      try {
        await db.insert(contents).values({
          workspaceId: ws.id,
          title: newContent.title,
          channel: newContent.channel,
          kind: newContent.kind,
          status: newContent.status,
          route: newContent.route,
          author: newContent.author,
          altText: newContent.alt_text,
          imageDataUrl: newContent.imageDataUrl,
          visionPresetId: newContent.visionPresetId,
          visionSummary: newContent.visionSummary ?? null,
          redactionSummary: newContent.redactionSummary ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      } catch (dbErr) {
        console.warn('PostgreSQL insert content warning:', dbErr);
      }

      res.json({ id: cid });
    } catch (err) {
      console.error('Submit review error:', err);
      res.status(500).json({ detail: 'Failed to run brand review' });
    }
  });

  // 10. GET /api/contents/:id
  app.get('/api/contents/:id', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    const id = Number(req.params.id);
    const content = ws.contents.find((c) => c.id === id) || ws.contents[0];
    if (!content) {
      res.status(404).json({ detail: 'Review not found' });
      return;
    }
    const versions = ws.versions
      .filter((v) => v.content_id === content.id)
      .sort((a, b) => a.n - b.n);
    const latest = versions[versions.length - 1];
    const itemFindings = ws.findings.filter(
      (f) => f.content_id === content.id && f.version_id === latest.id
    );
    const itemComments = ws.comments.filter((m) => m.content_id === content.id);
    const itemAudit = ws.audit.filter((a) => a.content_id === content.id);
    const aiCfg = resolveCloudIntelligenceConfig(CLOUD_INTELLIGENCE_CONNECTED_EMAIL);

    res.json({
      content,
      versions,
      latest,
      ai_enabled: aiCfg.enabled,
      provider: aiCfg.provider,
      model: aiCfg.model,
      redact: ws.redact,
      findings: itemFindings,
      comments: itemComments,
      audit: itemAudit,
    });
  });

  // 11. POST /api/contents/:id/revise
  app.post('/api/contents/:id/revise', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    const user = getUserForReq(req, ws);
    const id = Number(req.params.id);
    const content = ws.contents.find((c) => c.id === id);
    if (!content) {
      res.status(404).json({ detail: 'Review not found' });
      return;
    }
    const bodyText = String(req.body?.text || '').trim();
    const prevVersions = ws.versions.filter((v) => v.content_id === id);
    const nextN = prevVersions.length + 1;
    const vid = nextVersionId++;

    const pipeline = executePipelineAndAttachIds({
      pack: ws.pack,
      contentId: id,
      versionId: vid,
      text: bodyText,
      kind: content.kind,
      altText: content.alt_text,
      visionPresetId: content.visionPresetId,
      redactBeforeAI: ws.redact,
    });

    const timestamp = nowIso();
    ws.versions.push({
      id: vid,
      content_id: id,
      n: nextN,
      body: bodyText,
      redacted_body: pipeline.redactionSummary.redactedText,
      by_name: user.email,
      created_at: timestamp,
    });
    ws.findings.push(...pipeline.findings);
    content.route = pipeline.route;
    content.updated_at = timestamp;
    content.redactionSummary = pipeline.redactionSummary;
    if (pipeline.findings.length === 0) {
      content.status = 'approved';
    } else {
      content.status = 'in_review';
    }

    ws.audit.unshift({
      id: nextAuditId++,
      content_id: id,
      who: user.email,
      action: 'revised_version',
      detail: `Saved v${nextN} (${pipeline.findings.length} open finding(s))`,
      created_at: timestamp,
    });

    res.json({ ok: true, version: nextN });
  });

  // 12. POST /api/contents/:id/comments
  app.post('/api/contents/:id/comments', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    const user = getUserForReq(req, ws);
    const id = Number(req.params.id);
    const text = String(req.body?.text || '').trim();
    if (!text) {
      res.status(400).json({ detail: 'Comment cannot be empty' });
      return;
    }
    const timestamp = nowIso();
    ws.comments.push({
      id: nextCommentId++,
      content_id: id,
      who: user.name,
      role: user.role,
      text,
      created_at: timestamp,
    });
    ws.audit.unshift({
      id: nextAuditId++,
      content_id: id,
      who: user.email,
      action: 'commented',
      detail: text.slice(0, 60),
      created_at: timestamp,
    });
    res.json({ ok: true });
  });

  // 13. POST /api/contents/:id/decision
  app.post('/api/contents/:id/decision', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    const user = getUserForReq(req, ws);
    const id = Number(req.params.id);
    const content = ws.contents.find((c) => c.id === id);
    if (!content) {
      res.status(404).json({ detail: 'Review not found' });
      return;
    }
    const decision = req.body?.decision === 'approve' ? 'approve' : 'changes';
    const note = String(req.body?.note || '').trim();
    const versions = ws.versions.filter((v) => v.content_id === id);
    const latest = versions[versions.length - 1];
    const openHigh = ws.findings.filter(
      (f) =>
        f.content_id === id &&
        f.version_id === latest.id &&
        f.status === 'open' &&
        f.severity === 'high'
    );

    if (decision === 'approve' && openHigh.length > 0) {
      res.status(400).json({
        detail:
          'Cannot approve while high-severity findings remain open. Fix or dismiss them first.',
      });
      return;
    }

    const timestamp = nowIso();
    content.status =
      decision === 'approve' ? 'approved' : 'changes_requested';
    content.updated_at = timestamp;

    ws.audit.unshift({
      id: nextAuditId++,
      content_id: id,
      who: user.email,
      action: decision === 'approve' ? 'approved' : 'changes_requested',
      detail: note || `Status updated to ${content.status}`,
      created_at: timestamp,
    });

    res.json({ ok: true, status: content.status });
  });

  // 14. POST /api/contents/:id/agentic-autofix
  app.post(
    '/api/contents/:id/agentic-autofix',
    (req: Request, res: Response) => {
      const ws = getWorkspaceForReq(req);
      const user = getUserForReq(req, ws);
      const id = Number(req.params.id);
      const content = ws.contents.find((c) => c.id === id);
      if (!content) {
        res.status(404).json({ detail: 'Review not found' });
        return;
      }
      const versions = ws.versions.filter((v) => v.content_id === id);
      const latest = versions[versions.length - 1];
      const openList = ws.findings.filter(
        (f) =>
          f.content_id === id &&
          f.version_id === latest.id &&
          f.status === 'open' &&
          f.replacement
      );

      let updatedBody = latest.body;
      let remediatedCount = 0;
      for (const f of openList) {
        if (f.replacement && updatedBody.includes(f.span)) {
          updatedBody = updatedBody.replace(f.span, f.replacement);
          f.status = 'fixed';
          remediatedCount += 1;
        }
      }

      const nextN = versions.length + 1;
      const vid = nextVersionId++;
      const pipeline = executePipelineAndAttachIds({
        pack: ws.pack,
        contentId: id,
        versionId: vid,
        text: updatedBody,
        kind: content.kind,
        altText: content.alt_text,
        visionPresetId: content.visionPresetId,
        redactBeforeAI: ws.redact,
      });

      const timestamp = nowIso();
      ws.versions.push({
        id: vid,
        content_id: id,
        n: nextN,
        body: updatedBody,
        redacted_body: pipeline.redactionSummary.redactedText,
        by_name: user.email,
        created_at: timestamp,
      });
      ws.findings.push(...pipeline.findings);
      content.route = pipeline.route;
      content.updated_at = timestamp;
      if (pipeline.findings.length === 0) content.status = 'approved';

      ws.audit.unshift({
        id: nextAuditId++,
        content_id: id,
        who: user.email,
        action: 'auto_remediated',
        detail: `Auto-fixed ${remediatedCount} issue(s) into v${nextN}`,
        created_at: timestamp,
      });

      res.json({ ok: true, remediatedCount });
    }
  );

  // 15. POST /api/findings/:id/apply
  app.post('/api/findings/:id/apply', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    const user = getUserForReq(req, ws);
    const fid = Number(req.params.id);
    const finding = ws.findings.find((f) => f.id === fid);
    if (!finding) {
      res.status(404).json({ detail: 'Finding not found' });
      return;
    }
    const content = ws.contents.find((c) => c.id === finding.content_id);
    if (!content) {
      res.status(404).json({ detail: 'Content not found' });
      return;
    }
    const versions = ws.versions.filter((v) => v.content_id === content.id);
    const latest = versions[versions.length - 1];
    const updatedBody = finding.replacement
      ? latest.body.replace(finding.span, finding.replacement)
      : latest.body;

    finding.status = 'fixed';
    const nextN = versions.length + 1;
    const vid = nextVersionId++;
    const pipeline = executePipelineAndAttachIds({
      pack: ws.pack,
      contentId: content.id,
      versionId: vid,
      text: updatedBody,
      kind: content.kind,
      altText: content.alt_text,
      visionPresetId: content.visionPresetId,
      redactBeforeAI: ws.redact,
    });

    const timestamp = nowIso();
    ws.versions.push({
      id: vid,
      content_id: content.id,
      n: nextN,
      body: updatedBody,
      redacted_body: pipeline.redactionSummary.redactedText,
      by_name: user.email,
      created_at: timestamp,
    });
    ws.findings.push(...pipeline.findings);
    content.route = pipeline.route;
    content.updated_at = timestamp;
    if (pipeline.findings.length === 0) content.status = 'approved';

    ws.audit.unshift({
      id: nextAuditId++,
      content_id: content.id,
      who: user.email,
      action: 'applied_fix',
      detail: `Applied ${finding.rule_id} replacement in v${nextN}`,
      created_at: timestamp,
    });

    res.json({ ok: true });
  });

  // 16. POST /api/findings/:id/dismiss
  app.post('/api/findings/:id/dismiss', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    const user = getUserForReq(req, ws);
    const fid = Number(req.params.id);
    const reason = String(req.body?.reason || '').trim();
    if (!reason) {
      res.status(400).json({ detail: 'A dismissal reason is required' });
      return;
    }
    const finding = ws.findings.find((f) => f.id === fid);
    if (!finding) {
      res.status(404).json({ detail: 'Finding not found' });
      return;
    }
    finding.status = 'dismissed';
    finding.reason = reason;

    ws.audit.unshift({
      id: nextAuditId++,
      content_id: finding.content_id,
      who: user.email,
      action: 'dismissed_finding',
      detail: `${finding.rule_id} dismissed: ${reason}`,
      created_at: nowIso(),
    });

    res.json({ ok: true });
  });

  // 17. GET /api/samples
  app.get('/api/samples', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    res.json(ws.pack.samples);
  });

  // 18. GET /api/kb
  app.get('/api/kb', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    res.json({
      pack: ws.pack,
      rules: ws.pack.rules,
      terms: ws.pack.terms.map((t, i) => ({
        id: t.id || i + 1,
        banned: t.banned,
        preferred: t.preferred,
        ruleId: t.ruleId,
      })),
      facts: ws.pack.facts,
      claims: ws.pack.claims,
      palette: ws.pack.palette.map((p, i) => ({
        id: p.id || i + 1,
        name: p.name,
        hex: p.hex,
      })),
      assets: [],
    });
  });

  // 19. POST /api/kb-guideline/analyze
  app.post('/api/kb-guideline/analyze', (req: Request, res: Response) => {
    const text = String(req.body?.text || '').trim();
    const proposal = extractGuidelineProposal(text);
    res.json({
      source: 'Cloud Intelligence Guideline Parser',
      chars: text.length,
      rules: proposal.rules,
      terms: proposal.terms,
      facts: proposal.facts,
    });
  });

  // 20. POST /api/kb-guideline/apply
  app.post('/api/kb-guideline/apply', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    const rules = Array.isArray(req.body?.rules) ? req.body.rules : [];
    const terms = Array.isArray(req.body?.terms) ? req.body.terms : [];
    const facts = Array.isArray(req.body?.facts) ? req.body.facts : [];

    rules.forEach((r: BrandPack['rules'][number]) => {
      if (!ws.pack.rules.some((x) => x.id === r.id)) {
        ws.pack.rules.push(r);
      }
    });
    terms.forEach((t: { banned: string; preferred: string }, idx: number) => {
      ws.pack.terms.push({
        id: ws.pack.terms.length + idx + 1,
        banned: t.banned,
        preferred: t.preferred,
        ruleId: 'G-1.1',
      });
    });
    facts.forEach((f: { id: string; text: string }) => {
      if (!ws.pack.facts.some((x) => x.id === f.id)) {
        ws.pack.facts.push(f);
      }
    });

    res.json({
      rules: rules.length,
      terms: terms.length,
      facts: facts.length,
    });
  });

  // 21. GET /api/insights
  app.get('/api/insights', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    const ruleStats = new Map<
      string,
      { category: string; total: number; dismissed: number }
    >();
    const sourceStats = new Map<string, number>();

    ws.findings.forEach((f) => {
      const cur = ruleStats.get(f.rule_id) || {
        category: f.category,
        total: 0,
        dismissed: 0,
      };
      cur.total += 1;
      if (f.status === 'dismissed') cur.dismissed += 1;
      ruleStats.set(f.rule_id, cur);

      sourceStats.set(f.source, (sourceStats.get(f.source) || 0) + 1);
    });

    res.json({
      by_rule: Array.from(ruleStats.entries()).map(([rule_id, st]) => ({
        rule_id,
        category: st.category,
        total: st.total,
        dismissed: st.dismissed,
        unclear: st.total >= 2 && st.dismissed / st.total >= 0.5,
      })),
      by_source: Array.from(sourceStats.entries()).map(([source, n]) => ({
        source,
        n,
      })),
      claims: ws.pack.claims.map((c) => ({
        ...c,
        expired: c.expires < '2026-11-09',
      })),
    });
  });

  // 22. GET /api/eval/last & POST /api/eval/run
  app.get('/api/eval/last', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    if (!ws.lastEval) {
      ws.lastEval = runEvaluationSuite(ws.pack);
    }
    res.json(ws.lastEval);
  });

  app.post('/api/eval/run', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    ws.lastEval = runEvaluationSuite(ws.pack);
    res.json(ws.lastEval);
  });

  // 23. GET /api/workspace & POST /api/workspace/*
  app.get('/api/workspace', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    const aiCfg = resolveCloudIntelligenceConfig(CLOUD_INTELLIGENCE_CONNECTED_EMAIL);
    res.json({
      name: ws.name,
      pack: ws.pack.name,
      redact: ws.redact,
      engine: 'Deterministic + Cite-or-Drop Cloud Intelligence',
      retrieval: ws.retrieval,
      ocr: ws.ocr,
      ai: {
        enabled: aiCfg.enabled,
        provider: aiCfg.provider,
        model: aiCfg.model,
        connectedEmail: aiCfg.connectedEmail,
        apiKeyEnvVar: aiCfg.apiKeyEnvVar,
        placeholderConfigured: aiCfg.placeholderConfigured,
        usingPlaceholder: aiCfg.usingPlaceholder,
      },
      members: ws.users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        created_at: '2026-11-10',
      })),
      invites: ws.invites,
    });
  });

  app.post('/api/workspace/settings', async (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    if (typeof req.body?.redact === 'boolean') {
      ws.redact = req.body.redact;
      try {
        await db
          .update(workspaces)
          .set({ redact: ws.redact })
          .where(eq(workspaces.id, ws.id));
      } catch (dbErr) {
        console.warn('PostgreSQL workspace settings update warning:', dbErr);
      }
    }
    res.json({ ok: true, redact: ws.redact });
  });

  app.post('/api/workspace/reindex', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    res.json({ ok: true, mode: ws.retrieval });
  });

  app.post('/api/workspace/invite', async (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    const role = String(req.body?.role || 'creator');
    const code = `BL${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const inv = {
      code,
      role,
      used: false,
      created_at: nowIso(),
    };
    ws.invites.unshift(inv);
    try {
      await db.insert(invitesTable).values({
        workspaceId: ws.id,
        code,
        role,
        used: false,
        createdAt: inv.created_at,
      });
    } catch (dbErr) {
      console.warn('PostgreSQL invite insert warning:', dbErr);
    }
    res.json({ code });
  });

  // 24. GET /api/packs & POST /api/packs/load
  app.get('/api/packs', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    const list = Object.values(BRAND_PACKS).map((p) => ({
      id: p.id,
      name: p.name,
      industry: p.industry,
      description: p.description,
      active: ws.pack.id === p.id,
      rules: p.rules.length,
      terms: p.terms.length,
      facts: p.facts.length,
      claims: p.claims.length,
      samples: p.samples.length,
      images: p.samples.filter((s) => s.kind === 'image').length,
    }));
    res.json(list);
  });

  app.post('/api/packs/load', (req: Request, res: Response) => {
    const ws = getWorkspaceForReq(req);
    const packId = String(req.body?.id || 'acme-pay');
    if (BRAND_PACKS[packId]) {
      ws.packId = packId;
      ws.pack = clonePack(packId);
      ws.lastEval = runEvaluationSuite(ws.pack);
    }
    res.json({ ok: true, id: ws.pack.id });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BrandLens server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
