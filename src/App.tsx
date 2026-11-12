import React, { useEffect, useRef, useState } from 'react';
import { BrandIntroScreen } from './components/BrandIntroScreen';
import {
  EnrichedRecentReport,
  RecentAnalysisDrawer,
} from './components/RecentAnalysisDrawer';
import {
  AuditEntry,
  BrandPack,
  BrandRule,
  CommentEntry,
  ContentItem,
  ContentVersion,
  EvalSample,
  EvaluationReport,
  Finding,
  WorkspaceUser,
} from './engine/types';
import {
  buildAnalysisReportPayload,
  generateBrandLensPdfString,
  triggerBrowserDownload,
} from './utils/reportExport';

const IC: Record<string, string> = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  reviews: 'M9 6h12M9 12h12M9 18h12M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  new: 'M12 5v14M5 12h14',
  kb: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5',
  insights: 'M5 20V11M12 20V4M19 20v-6',
  eval: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  workspace:
    'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8',
  packs: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.5 9a2.5 2.5 0 0 1 5 .5c0 1.7-2.5 2-2.5 3.5M12 17h.01',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  image:
    'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
  spark:
    'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  check: 'M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4L12 14l-3-3',
  chev: 'M9 6l6 6-6 6',
  chevl: 'M15 6l-6 6 6 6',
  menu: 'M4 8h16M4 16h16',
  ledger: 'M4 4h16v16H4zM4 9h16M9 9v11',
  fact: 'M9 12l2 2 4-4M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
};

const SvgIcon: React.FC<{ name: string; className?: string }> = ({
  name,
  className = '',
}) => (
  <svg className={`i ${className}`} viewBox="0 0 24 24">
    <path d={IC[name] || IC.grid} />
  </svg>
);

const BrandLensWordmark: React.FC = () => (
  <span className="brandlens-wordmark">
    <span className="bl-brand">Brand</span>
    <span className="bl-lens">Lens</span>
  </span>
);

const ROLE_LABEL: Record<string, string> = {
  creator: 'Creator',
  manager: 'Manager',
  reviewer: 'Reviewer',
  admin: 'Admin',
};

const CAN: Record<string, string[]> = {
  insights: ['admin', 'manager', 'reviewer'],
  eval: ['admin', 'manager', 'reviewer'],
  workspace: ['admin', 'manager'],
  packs: ['admin'],
  guideline: ['admin'],
};

const NAV_ITEMS: Array<[string, string]> = [
  ['dashboard', 'Dashboard'],
  ['reviews', 'Reviews'],
  ['new', 'New review'],
  ['kb', 'Knowledge'],
  ['insights', 'Insights'],
  ['eval', 'Evaluation'],
  ['workspace', 'Workspace'],
  ['packs', 'Brand packs'],
  ['support', 'Support'],
];

const FAQ_ITEMS = [
  {
    q: 'What does BrandLens analyze when I submit content or an image?',
    a: 'BrandLens inspects six governance layers simultaneously: (1) Brand terminology and naming conventions, (2) Promotional claims matched against your dated Claim Ledger evidence, (3) Approved organizational facts, (4) Brand tone and voice, (5) Image OCR text extraction and WCAG contrast ratios, and (6) Logo presence, clear space, and palette adherence.',
  },
  {
    q: 'How does BrandLens identify violations and guarantee zero hallucinated rules?',
    a: 'Every finding is governed by a strict Cite-or-Drop validator. Whether a violation is caught by deterministic regex, Claim Ledger expiry checks, or semantic vector retrieval + Cloud Intelligence, it must cite an active Rule ID (e.g. G-1.1), Fact ID (e.g. F-2), or Evidence ID (e.g. E-1) and match an exact span in your content.',
  },
  {
    q: 'What happens to personal identifiers (PII) before analysis runs?',
    a: 'When PII redaction is enabled in Workspace Settings, emails, phone numbers, and personal identifiers are automatically replaced with safe placeholders (such as [REDACTED_EMAIL_1]) before text reaches Cloud Intelligence, and restored in your review view.',
  },
  {
    q: 'How does risk-based approval routing work?',
    a: 'Standard tone or terminology findings are routed to a Brand Manager. Any content containing high-severity unverified or expired promotional claims is automatically escalated to an Authorised Compliance Reviewer and cannot be approved until high-severity findings are fixed or dismissed with an audited reason.',
  },
  {
    q: 'What is included when I export a PDF or JSON report?',
    a: 'The exported PDF focuses on the real analysis report—the exact content evaluated and each itemized finding with its recommended fix—while placing supplementary metrics such as Accuracy / Rule Match %, Overall Score, and routing metadata cleanly at the bottom of the page.',
  },
];

const ago = (t?: string) => (t ? t.replace('T', ' ').slice(0, 16) : '');

interface PublicUser extends WorkspaceUser {
  ws?: string;
  ws_name?: string;
}

interface CloudIntelligenceStatus {
  enabled: boolean;
  provider: string;
  model: string;
  connectedEmail?: string;
  apiKeyEnvVar?: string;
  placeholderConfigured?: boolean;
  usingPlaceholder?: boolean;
}

interface ConfigData {
  ai: CloudIntelligenceStatus;
  demo: boolean;
  demo_password?: string;
  demo_users: Array<{ id?: number; name: string; email: string; role: string }>;
  engine: string;
  ocr: boolean;
  retrieval: string;
  user: PublicUser;
  jwtToken: string;
}

interface DashboardData {
  total: number;
  approved: number;
  awaiting: number;
  changes: number;
  open_high: number;
  by_category: Array<{ category: string; n: number }>;
  by_rule: Array<{
    rule_id: string;
    category: string;
    total: number;
    dismissed: number;
    unclear: boolean;
  }>;
  claims_health: Array<{
    id: number;
    phrase: string;
    evidence: string;
    owner: string;
    expires: string;
    expired: boolean;
  }>;
  attention: EnrichedRecentReport[];
  recent: Array<AuditEntry & { title?: string }>;
  last_eval: EvaluationReport | null;
  pack: string;
}

interface ReviewDetailData {
  content: ContentItem;
  versions: ContentVersion[];
  latest: ContentVersion;
  ai_enabled: boolean;
  provider: string;
  model: string;
  redact?: boolean;
  findings: Finding[];
  comments: CommentEntry[];
  audit: AuditEntry[];
}

interface KBData {
  pack: BrandPack;
  rules: BrandRule[];
  terms: Array<{ id: number; banned: string; preferred: string; ruleId: string }>;
  facts: Array<{ id: string; text: string }>;
  claims: Array<{
    id: number;
    phrase: string;
    evidence: string;
    owner: string;
    expires: string;
  }>;
  palette: Array<{ id: number; name: string; hex: string }>;
  assets: Array<{ id: number; kind: string; name: string; data: string }>;
}

interface InsightsData {
  by_rule: Array<{
    rule_id: string;
    category: string;
    total: number;
    dismissed: number;
    unclear: boolean;
  }>;
  by_source: Array<{ source: string; n: number }>;
  claims: Array<{
    id: number;
    phrase: string;
    evidence: string;
    owner: string;
    expires: string;
    expired: boolean;
  }>;
}

interface WorkspaceData {
  name: string;
  pack: string;
  redact: boolean;
  engine: string;
  retrieval: string;
  ocr: boolean;
  ai: CloudIntelligenceStatus;
  members: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string;
  }>;
  invites: Array<{
    code: string;
    role: string;
    used: boolean;
    created_at: string;
  }>;
}

interface PackSummary {
  id: string;
  name: string;
  industry: string;
  description: string;
  active: boolean;
  rules: number;
  terms: number;
  facts: number;
  claims: number;
  samples: number;
  images: number;
}

interface GuidelineProposal {
  source: string;
  chars: number;
  error?: string;
  rules: Array<BrandRule & { on?: boolean }>;
  terms: Array<{ banned: string; preferred: string; on?: boolean }>;
  facts: Array<{ id: string; text: string; on?: boolean }>;
}

const ScrollerRow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateButtons = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    updateButtons();
    window.addEventListener('resize', updateButtons);
    return () => window.removeEventListener('resize', updateButtons);
  }, [children]);

  const scrollByAmount = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div className="sc-wrap rv on">
      <div className="scroller" ref={scrollerRef} onScroll={updateButtons}>
        {children}
      </div>
      <div className="arrows">
        <button
          type="button"
          aria-label="Previous"
          disabled={!canPrev}
          onClick={() => scrollByAmount(-1)}
        >
          <SvgIcon name="chevl" />
        </button>
        <button
          type="button"
          aria-label="Next"
          disabled={!canNext}
          onClick={() => scrollByAmount(1)}
        >
          <SvgIcon name="chev" />
        </button>
      </div>
    </div>
  );
};

export function App() {
  // 1. Opening Brand Intro Screen
  const [showIntro, setShowIntro] = useState<boolean>(true);

  // 2. Theme Mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('brandlens_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('brandlens_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('brandlens_theme', 'light');
    }
  }, [darkMode]);

  // 3. Admin / Developer Client Contact Slots (Defaulting to ssmb71110@gmail.com)
  const [adminEmailSlot, setAdminEmailSlot] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('bl_admin_email_slot');
      if (saved && saved !== '[admin-email@your-domain.com]') {
        return saved;
      }
      return 'ssmb71110@gmail.com';
    } catch {
      return 'ssmb71110@gmail.com';
    }
  });
  const [adminPhoneSlot, setAdminPhoneSlot] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('bl_admin_phone_slot') || '+91 [00000 00000]'
      );
    } catch {
      return '+91 [00000 00000]';
    }
  });

  const handleSaveAdminSlots = (email: string, phone: string) => {
    setAdminEmailSlot(email);
    setAdminPhoneSlot(phone);
    try {
      localStorage.setItem('bl_admin_email_slot', email);
      localStorage.setItem('bl_admin_phone_slot', phone);
    } catch {
      // ignore storage error
    }
  };

  // 4. Auth & Config State (Token stored strictly in memory per Cloud SQL + Firebase Auth guidelines)
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [cfg, setCfg] = useState<ConfigData | null>(null);
  const [authMode, setAuthMode] = useState<'in' | 'up' | 'join'>('in');
  const [authEmail, setAuthEmail] = useState('ssmb71110@gmail.com');
  const [authPassword, setAuthPassword] = useState('');
  const [authWorkspace, setAuthWorkspace] = useState('');
  const [authName, setAuthName] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // 5. Navigation & View State (ChatBot removed per user request)
  const [view, setView] = useState<
    | 'dashboard'
    | 'reviews'
    | 'new'
    | 'review'
    | 'kb'
    | 'insights'
    | 'eval'
    | 'workspace'
    | 'packs'
  >('dashboard');
  const [reviewId, setReviewId] = useState<number>(1);
  const [kbTab, setKbTab] = useState<string>('rules');
  const [reviewsFilter, setReviewsFilter] = useState<string>('');
  const [reviewTab, setReviewTab] = useState<
    'content' | 'edit' | 'versions' | 'audit'
  >('content');
  const [findingCatFilter, setFindingCatFilter] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentDrawerOpen, setRecentDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // 6. Data Caches
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [contentsList, setContentsList] = useState<EnrichedRecentReport[]>([]);
  const [samplesList, setSamplesList] = useState<EvalSample[]>([]);
  const [reviewDetail, setReviewDetail] = useState<ReviewDetailData | null>(
    null
  );
  const [kbData, setKbData] = useState<KBData | null>(null);
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [evalData, setEvalData] = useState<EvaluationReport | null>(null);
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | null>(
    null
  );
  const [packsData, setPacksData] = useState<PackSummary[]>([]);

  // 7. Form States
  const [newTitle, setNewTitle] = useState('Launch post');
  const [newChannel, setNewChannel] = useState('LinkedIn');
  const [newText, setNewText] = useState('');
  const [newAlt, setNewAlt] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [newVisionPresetId, setNewVisionPresetId] = useState<
    string | undefined
  >(undefined);
  const [submittingNew, setSubmittingNew] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [editDraft, setEditDraft] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [runningEval, setRunningEval] = useState(false);
  const [runningAutoFix, setRunningAutoFix] = useState(false);
  const [inviteRole, setInviteRole] = useState('creator');

  // Guideline Import State
  const [guidelineText, setGuidelineText] = useState('');
  const [guidelineAnalyzing, setGuidelineAnalyzing] = useState(false);
  const [guidelineProposal, setGuidelineProposal] =
    useState<GuidelineProposal | null>(null);

  // Modals & Toasts
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [modalType, setModalType] = useState<
    null | 'support' | 'ai_status' | 'dismiss' | 'decision' | 'invite_code'
  >(null);
  const [aiStatusModalData, setAiStatusModalData] = useState<{
    ok: boolean;
    message: string;
    provider: string;
    model: string;
    connectedEmail?: string;
    apiKeyEnvVar?: string;
    placeholderConfigured?: boolean;
    usingPlaceholder?: boolean;
  } | null>(null);
  const [dismissTargetId, setDismissTargetId] = useState<number | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  const [decisionTarget, setDecisionTarget] = useState<'approve' | 'changes'>(
    'approve'
  );
  const [decisionNote, setDecisionNote] = useState('');
  const [generatedInviteCode, setGeneratedInviteCode] = useState('');

  // Full-Screen Image Zoom & Visual Inspection State
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [imageZoomScale, setImageZoomScale] = useState(1);
  const [imageZoomPan, setImageZoomPan] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [imageZoomDragging, setImageZoomDragging] = useState(false);
  const [imageZoomDragStart, setImageZoomDragStart] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [imageZoomSafeZone, setImageZoomSafeZone] = useState(false);
  const [imageZoomLightBg, setImageZoomLightBg] = useState(false);

  const openImageZoom = () => {
    setImageZoomScale(1);
    setImageZoomPan({ x: 0, y: 0 });
    setImageZoomDragging(false);
    setImageZoomOpen(true);
  };

  const adjustImageZoom = (delta: number) => {
    setImageZoomScale((prev) => {
      const next = Math.min(3.5, Math.max(0.5, Number((prev + delta).toFixed(2))));
      if (next <= 1) {
        setImageZoomPan({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const resetImageZoom = () => {
    setImageZoomScale(1);
    setImageZoomPan({ x: 0, y: 0 });
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3600);
  };

  const canAccess = (k: string, currentUser = user) => {
    if (!CAN[k]) return true;
    return Boolean(currentUser && CAN[k].includes(currentUser.role));
  };

  const apiFetch = async <T,>(
    path: string,
    opts: {
      method?: string;
      json?: unknown;
      quiet?: boolean;
      overrideToken?: string | null;
      workspaceId?: string;
    } = {}
  ): Promise<T> => {
    const activeToken =
      opts.overrideToken !== undefined ? opts.overrideToken : token;
    const headers: Record<string, string> = {};
    if (activeToken) {
      headers.Authorization = `Bearer ${activeToken}`;
    }
    if (opts.workspaceId || user?.workspaceId) {
      headers['X-Workspace-Id'] =
        opts.workspaceId || user?.workspaceId || 'acme-pay';
    }
    let body: BodyInit | undefined;
    if (opts.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.json);
    }
    const res = await fetch(`/api${path}`, {
      method: opts.method || (opts.json !== undefined ? 'POST' : 'GET'),
      headers,
      body,
    });
    let data: Record<string, unknown> = {};
    try {
      data = await res.json();
    } catch {
      // ignore non-json
    }
    if (res.status === 401 && activeToken) {
      handleSignOut(true);
      throw new Error('Signed out');
    }
    if (!res.ok) {
      const msg =
        typeof data.detail === 'string' ? data.detail : 'Something went wrong';
      if (!opts.quiet) showToast(msg);
      throw new Error(msg);
    }
    return data as T;
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setModalType(null);
        setAccountOpen(false);
        setImageZoomOpen(false);
      }
      if (imageZoomOpen) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          adjustImageZoom(0.25);
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          adjustImageZoom(-0.25);
        } else if (e.key === '0') {
          e.preventDefault();
          resetImageZoom();
        }
        return;
      }
      const tag =
        (document.activeElement as HTMLElement | null)?.tagName || '';
      if (
        e.key === '/' &&
        user &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [user, imageZoomOpen]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/config');
        const c = (await res.json()) as ConfigData;
        setCfg(c);
      } catch {
        // ignore boot error
      }
    })();
  }, []);

  const refreshActiveView = async (
    targetView = view,
    targetReviewId = reviewId,
    activeUser = user
  ) => {
    if (!activeUser) return;
    try {
      const list = await apiFetch<EnrichedRecentReport[]>('/contents', {
        quiet: true,
        workspaceId: activeUser.workspaceId,
      });
      setContentsList(list);

      if (targetView === 'dashboard') {
        const d = await apiFetch<DashboardData>('/dashboard', {
          workspaceId: activeUser.workspaceId,
        });
        setDashData(d);
      } else if (targetView === 'reviews') {
        const d = await apiFetch<DashboardData>('/dashboard', {
          quiet: true,
          workspaceId: activeUser.workspaceId,
        });
        setDashData(d);
      } else if (targetView === 'new') {
        const sm = await apiFetch<EvalSample[]>('/samples', {
          workspaceId: activeUser.workspaceId,
        });
        setSamplesList(sm);
      } else if (targetView === 'review') {
        const rd = await apiFetch<ReviewDetailData>(
          `/contents/${targetReviewId}`,
          { workspaceId: activeUser.workspaceId }
        );
        setReviewDetail(rd);
        setEditDraft(rd.latest?.body || '');
      } else if (targetView === 'kb') {
        const k = await apiFetch<KBData>('/kb', {
          workspaceId: activeUser.workspaceId,
        });
        setKbData(k);
        setGuidelineText(k.pack.sampleGuidelineDoc || '');
      } else if (targetView === 'insights') {
        const ins = await apiFetch<InsightsData>('/insights', {
          workspaceId: activeUser.workspaceId,
        });
        setInsightsData(ins);
      } else if (targetView === 'eval') {
        const ev = await apiFetch<EvaluationReport>('/eval/last', {
          workspaceId: activeUser.workspaceId,
        });
        setEvalData(ev);
      } else if (targetView === 'workspace') {
        const ws = await apiFetch<WorkspaceData>('/workspace', {
          workspaceId: activeUser.workspaceId,
        });
        setWorkspaceData(ws);
      } else if (targetView === 'packs') {
        const ps = await apiFetch<PackSummary[]>('/packs', {
          workspaceId: activeUser.workspaceId,
        });
        setPacksData(ps);
      }
    } catch {
      // handled by toast
    }
  };

  useEffect(() => {
    if (user) {
      refreshActiveView(view, reviewId, user);
    }
  }, [user, view, reviewId]);

  const navigateTo = (
    nextView: typeof view,
    opts?: { reviewId?: number; kbTab?: string }
  ) => {
    if (opts?.reviewId !== undefined) {
      setReviewId(opts.reviewId);
    }
    if (opts?.kbTab !== undefined) {
      setKbTab(opts.kbTab);
    }
    setView(nextView);
    setMobileMenuOpen(false);
    setAccountOpen(false);
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToFaq = () => {
    setMobileMenuOpen(false);
    setAccountOpen(false);
    document
      .getElementById('faq-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Auth Handlers
  const handleEnterSession = async (res: {
    token?: string;
    jwtToken?: string;
    user: PublicUser;
  }) => {
    const tok = res.token || res.jwtToken || '';
    setToken(tok);
    setUser(res.user);
    setView('dashboard');
  };

  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    try {
      const path = {
        in: '/auth/login',
        up: '/auth/register',
        join: '/auth/join',
      }[authMode];
      const payload =
        authMode === 'in'
          ? { email: authEmail, password: authPassword }
          : authMode === 'up'
          ? {
              workspace: authWorkspace,
              name: authName,
              email: authEmail,
              password: authPassword,
            }
          : {
              code: authCode,
              name: authName,
              email: authEmail,
              password: authPassword,
            };
      const res = await apiFetch<{
        token?: string;
        jwtToken?: string;
        user: PublicUser;
      }>(path, { json: payload });
      await handleEnterSession(res);
    } catch {
      // toast already shown
    } finally {
      setAuthBusy(false);
    }
  };

  const handleDemoLogin = async (email: string) => {
    setAuthBusy(true);
    try {
      const res = await apiFetch<{
        token?: string;
        jwtToken?: string;
        user: PublicUser;
      }>('/auth/login', {
        json: { email, password: cfg?.demo_password || 'BrandLens#2026' },
      });
      await handleEnterSession(res);
    } catch {
      // toast already shown
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = (expired = false) => {
    setToken(null);
    setUser(null);
    setAccountOpen(false);
    if (expired) showToast('Please sign in again.');
  };

  // Test Cloud Intelligence Connection (Placed inside Settings / Workspace)
  const handleTestAI = async () => {
    try {
      const r = await apiFetch<{
        ok: boolean;
        message: string;
        provider: string;
        model: string;
        connectedEmail?: string;
        apiKeyEnvVar?: string;
        placeholderConfigured?: boolean;
        usingPlaceholder?: boolean;
      }>('/ai/status');
      setAiStatusModalData(r);
      setModalType('ai_status');
    } catch {
      // ignore
    }
  };

  // Submit New Review
  const handleFileChange = (file?: File) => {
    if (!file) return;
    setNewFileName(file.name);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setNewImagePreview(String(reader.result || ''));
      };
      reader.readAsDataURL(file);
      setNewVisionPresetId('acme-banner-violation');
      if (!newText.trim()) {
        setNewText(
          'AcmePay is the #1 fastest in India and costs 40% less! Now accepting Bitcoin for all users with REVOLUTIONARY speed!'
        );
      }
    } else {
      setNewImagePreview(null);
      setNewVisionPresetId(undefined);
      const reader = new FileReader();
      reader.onload = () => {
        const txt = String(reader.result || '');
        if (txt.trim()) setNewText(txt);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmitNewReview = async () => {
    if (!newText.trim() && !newVisionPresetId && !newImagePreview) {
      showToast('Provide text or choose a sample / file.');
      return;
    }
    setSubmittingNew(true);
    try {
      const res = await apiFetch<{ id: number }>('/contents', {
        json: {
          title: newTitle || 'Launch post',
          channel: newChannel,
          text: newText,
          alt_text: newAlt,
          kind: newVisionPresetId || newImagePreview ? 'image' : 'text',
          imageDataUrl: newImagePreview || undefined,
          visionPresetId: newVisionPresetId,
        },
      });
      setNewText('');
      setNewAlt('');
      setNewFileName('');
      setNewImagePreview(null);
      setNewVisionPresetId(undefined);
      navigateTo('review', { reviewId: res.id });
    } catch {
      // handled by toast
    } finally {
      setSubmittingNew(false);
    }
  };

  // Review Detail Actions
  const handleApplyFix = async (fid: number) => {
    await apiFetch(`/findings/${fid}/apply`, { json: {} });
    showToast('Applied as a new version');
    await refreshActiveView('review', reviewId);
  };

  const handleConfirmDismiss = async () => {
    if (!dismissTargetId) return;
    await apiFetch(`/findings/${dismissTargetId}/dismiss`, {
      json: { reason: dismissReason },
    });
    setModalType(null);
    setDismissReason('');
    await refreshActiveView('review', reviewId);
  };

  const handleReviseNow = async () => {
    await apiFetch(`/contents/${reviewId}/revise`, {
      json: { text: editDraft },
    });
    setReviewTab('content');
    showToast('New version checked');
    await refreshActiveView('review', reviewId);
  };

  const handlePostComment = async () => {
    if (!commentDraft.trim()) return;
    await apiFetch(`/contents/${reviewId}/comments`, {
      json: { text: commentDraft },
    });
    setCommentDraft('');
    await refreshActiveView('review', reviewId);
  };

  const handleConfirmDecision = async () => {
    try {
      await apiFetch(`/contents/${reviewId}/decision`, {
        json: { decision: decisionTarget, note: decisionNote },
      });
      setModalType(null);
      setDecisionNote('');
      showToast(
        decisionTarget === 'approve' ? 'Approved' : 'Changes requested'
      );
      await refreshActiveView('review', reviewId);
    } catch {
      setModalType(null);
    }
  };

  const handleAgenticAutoFix = async () => {
    setRunningAutoFix(true);
    try {
      const res = await apiFetch<{ remediatedCount: number }>(
        `/contents/${reviewId}/agentic-autofix`,
        { json: {} }
      );
      showToast(
        `Cloud Intelligence remediated ${res.remediatedCount} issue(s) as a new version`
      );
      await refreshActiveView('review', reviewId);
    } finally {
      setRunningAutoFix(false);
    }
  };

  const handleExportReport = (format: 'pdf' | 'json') => {
    if (!reviewDetail || !user) return;
    const openList = reviewDetail.findings.filter((f) => f.status === 'open');
    const highCount = openList.filter((f) => f.severity === 'high').length;
    const medCount = openList.filter((f) => f.severity === 'medium').length;
    const lowCount = openList.filter((f) => f.severity === 'low').length;
    const overallScore = Math.max(
      12,
      Math.min(100, 100 - highCount * 18 - medCount * 9 - lowCount * 4)
    );
    const matchingPercentage = Math.max(
      45,
      Math.min(99.8, 100 - openList.length * 6.4)
    ).toFixed(1);

    const payload = buildAnalysisReportPayload({
      workspaceName: user.ws_name || 'Acme Pay',
      currentUser: user,
      overallScore,
      matchingPercentage,
      content: reviewDetail.content,
      latest: reviewDetail.latest,
      provider: reviewDetail.provider,
      model: reviewDetail.model,
      findings: reviewDetail.findings,
    });

    const slug = reviewDetail.content.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      triggerBrowserDownload(
        blob,
        `brandlens-report-${slug}-v${reviewDetail.latest.n}.json`
      );
      showToast('Exported JSON analysis report');
    } else {
      const pdfStr = generateBrandLensPdfString(payload);
      const blob = new Blob([pdfStr], { type: 'application/pdf' });
      triggerBrowserDownload(
        blob,
        `brandlens-report-${slug}-v${reviewDetail.latest.n}.pdf`
      );
      showToast('Exported PDF analysis report');
    }
  };

  // Guideline Import Handlers
  const handleAnalyzeGuideline = async () => {
    setGuidelineAnalyzing(true);
    try {
      const res = await apiFetch<GuidelineProposal>('/kb-guideline/analyze', {
        json: { text: guidelineText },
      });
      setGuidelineProposal({
        ...res,
        rules: res.rules.map((r) => ({ ...r, on: true })),
        terms: res.terms.map((t) => ({ ...t, on: true })),
        facts: res.facts.map((f) => ({ ...f, on: true })),
      });
    } finally {
      setGuidelineAnalyzing(false);
    }
  };

  const handleApplyGuideline = async () => {
    if (!guidelineProposal) return;
    const res = await apiFetch<{
      rules: number;
      terms: number;
      facts: number;
    }>('/kb-guideline/apply', {
      json: {
        rules: guidelineProposal.rules.filter((r) => r.on !== false),
        terms: guidelineProposal.terms.filter((t) => t.on !== false),
        facts: guidelineProposal.facts.filter((f) => f.on !== false),
      },
    });
    showToast(
      `Added ${res.rules} rules, ${res.terms} terms, ${res.facts} facts`
    );
    setGuidelineProposal(null);
    setKbTab('rules');
    await refreshActiveView('kb');
  };

  // Evaluation Handler
  const handleRunEval = async () => {
    setRunningEval(true);
    try {
      const ev = await apiFetch<EvaluationReport>('/eval/run', { json: {} });
      setEvalData(ev);
      showToast('Evaluation completed');
    } finally {
      setRunningEval(false);
    }
  };

  // Workspace Handlers
  const handleToggleRedact = async (nextRedact: boolean) => {
    await apiFetch('/workspace/settings', { json: { redact: nextRedact } });
    showToast(nextRedact ? 'Redaction on' : 'Redaction off');
    await refreshActiveView('workspace');
  };

  const handleReindex = async () => {
    const r = await apiFetch<{ mode: string }>('/workspace/reindex', {
      json: {},
    });
    showToast(`Index rebuilt: ${r.mode}`);
    await refreshActiveView('workspace');
  };

  const handleMakeInvite = async () => {
    const r = await apiFetch<{ code: string }>('/workspace/invite', {
      json: { role: inviteRole },
    });
    setGeneratedInviteCode(r.code);
    setModalType('invite_code');
    await refreshActiveView('workspace');
  };

  const handleLoadPack = async (packId: string) => {
    await apiFetch('/packs/load', { json: { id: packId } });
    if (user) {
      const updatedUser = { ...user, workspaceId: packId, ws: packId };
      setUser(updatedUser);
    }
    showToast('Brand pack loaded');
    await refreshActiveView('packs');
  };

  // Highlighted Content Body Builder
  const renderHighlightedBody = (body: string, findingsList: Finding[]) => {
    const intervals: Array<{ s: number; e: number; f: Finding }> = [];
    findingsList
      .filter((f) => f.status === 'open')
      .forEach((f) => {
        const idx = body.indexOf(f.span);
        if (
          idx >= 0 &&
          f.span !== '[image]' &&
          !intervals.some((x) => idx < x.e && idx + f.span.length > x.s)
        ) {
          intervals.push({ s: idx, e: idx + f.span.length, f });
        }
      });
    intervals.sort((a, b) => a.s - b.s);

    const nodes: React.ReactNode[] = [];
    let p = 0;
    intervals.forEach((x, idx) => {
      if (x.s > p) {
        nodes.push(body.slice(p, x.s));
      }
      nodes.push(
        <mark
          key={`hl-${x.f.id}-${idx}`}
          className={x.f.severity}
          onClick={() => {
            document
              .getElementById(`f${x.f.id}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        >
          {body.slice(x.s, x.e)}
        </mark>
      );
      p = x.e;
    });
    if (p < body.length) {
      nodes.push(body.slice(p));
    }
    return nodes.length > 0 ? nodes : body;
  };

  if (showIntro) {
    return <BrandIntroScreen onComplete={() => setShowIntro(false)} />;
  }

  const openHighBadgeCount = dashData?.open_high || 0;
  const visibleNavItems = user ? NAV_ITEMS.filter(([k]) => canAccess(k)) : [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Global Sticky Header (#gnav) */}
      <header
        id="gnav"
        className={`${scrolled ? 'sc' : ''} ${mobileMenuOpen ? 'mo' : ''}`}
      >
        <div className="gn">
          <a
            className="logo"
            href="#/dashboard"
            aria-label="BrandLens"
            onClick={(e) => {
              e.preventDefault();
              if (user) navigateTo('dashboard');
            }}
          >
            <BrandLensWordmark />
          </a>

          <nav id="nv" className={mobileMenuOpen ? 'open' : ''}>
            {visibleNavItems.map(([k, label], idx) =>
              k === 'support' ? (
                <a
                  key={k}
                  style={{ '--i': idx } as React.CSSProperties}
                  onClick={() => setModalType('support')}
                >
                  {label}
                </a>
              ) : (
                <a
                  key={k}
                  href={`#/${k}`}
                  style={{ '--i': idx } as React.CSSProperties}
                  className={view === k ? 'on' : ''}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo(k as typeof view);
                  }}
                >
                  {label}
                </a>
              )
            )}
          </nav>

          {user ? (
            <>
              <button
                type="button"
                className="ic"
                aria-label="Search"
                title="Search (/)"
                onClick={() => setSearchOpen(true)}
              >
                <SvgIcon name="search" />
              </button>

              <button
                type="button"
                className="ic"
                aria-label="Recent Analysis Reports"
                title="Recent Analysis (Last 5 Reports)"
                onClick={() => setRecentDrawerOpen(true)}
              >
                <SvgIcon name="clock" />
                {contentsList.length > 0 && (
                  <span
                    className="badge"
                    style={{ background: '#0071e3', display: 'grid' }}
                  >
                    {Math.min(5, contentsList.length)}
                  </span>
                )}
              </button>

              <button
                type="button"
                className="ic"
                aria-label="Needs attention"
                title="Needs attention"
                onClick={() => navigateTo('reviews')}
              >
                <SvgIcon name="bell" />
                {openHighBadgeCount > 0 && (
                  <span className="badge" id="bdg" style={{ display: 'grid' }}>
                    {openHighBadgeCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                className="ic"
                aria-label="Toggle theme"
                title={
                  darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'
                }
                onClick={() => setDarkMode((prev) => !prev)}
              >
                <SvgIcon name={darkMode ? 'sun' : 'moon'} />
              </button>

              <button
                type="button"
                className="ic"
                aria-label="Account"
                onClick={() => setAccountOpen((prev) => !prev)}
              >
                <SvgIcon name="user" />
              </button>

              <button
                type="button"
                className="ic menu"
                aria-label="Menu"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
              >
                <SvgIcon name="menu" />
              </button>

              <div className={`acct ${accountOpen ? 'on' : ''}`} id="acct">
                <div className="b">{user.name}</div>
                <div className="sm g">{user.email}</div>
                <div className="sm g" style={{ margin: '6px 0 12px' }}>
                  {ROLE_LABEL[user.role] || user.role} ·{' '}
                  {user.ws_name || 'Acme Pay'}
                </div>
                <button
                  type="button"
                  className="btn g2 sm"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setAccountOpen(false);
                    navigateTo('workspace');
                  }}
                >
                  Workspace &amp; Cloud Intelligence
                </button>
                <button
                  type="button"
                  className="btn s sm"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => handleSignOut(false)}
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="ic"
              aria-label="Toggle theme"
              onClick={() => setDarkMode((prev) => !prev)}
            >
              <SvgIcon name={darkMode ? 'sun' : 'moon'} />
            </button>
          )}
        </div>
      </header>

      {/* Search Overlay (#searchov) */}
      <div id="searchov" className={searchOpen ? 'on' : ''}>
        {searchOpen && (
          <div className="so">
            <div className="row">
              <span className="sp" />
              <button
                type="button"
                className="btn g2 sm"
                onClick={() => setSearchOpen(false)}
              >
                Close
              </button>
            </div>
            <input
              id="sq"
              placeholder="Search reviews, rules and pages"
              autoComplete="off"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="res" id="sres">
              {(() => {
                const q = searchQuery.toLowerCase().trim();
                const matchingReviews = contentsList
                  .filter((c) => !q || c.title.toLowerCase().includes(q))
                  .slice(0, 6);
                const matchingPages = visibleNavItems.filter(
                  ([k, l]) =>
                    k !== 'support' && (!q || l.toLowerCase().includes(q))
                );
                return (
                  <>
                    {matchingReviews.map((c, i) => (
                      <a
                        key={c.id}
                        style={{ '--i': i } as React.CSSProperties}
                        href={`#/review/${c.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigateTo('review', { reviewId: c.id });
                        }}
                      >
                        {c.title}
                      </a>
                    ))}
                    <h4>Quick links</h4>
                    {matchingPages.map(([k, l], i) => (
                      <a
                        key={k}
                        style={{ '--i': i } as React.CSSProperties}
                        href={`#/${k}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigateTo(k as typeof view);
                        }}
                      >
                        {l}
                      </a>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Container (#main) */}
      <main id="main" className="in flex-1">
        {!user ? (
          /* ================= AUTH VIEW (.auth) ================= */
          <div className="auth rv on">
            <div>
              <BrandLensWordmark />
            </div>
            <h1>
              {
                {
                  in: 'Sign in to Studio',
                  up: 'Create your workspace',
                  join: 'Join your team',
                }[authMode]
              }
            </h1>
            <p className="g">
              {
                {
                  in: '',
                  up: 'You will be the administrator of a private, isolated workspace.',
                  join: 'Enter the invite code from your administrator.',
                }[authMode]
              }
            </p>

            <form onSubmit={handleSubmitAuth}>
              {authMode === 'up' && (
                <>
                  <label htmlFor="a_workspace">Organisation name</label>
                  <input
                    id="a_workspace"
                    type="text"
                    required
                    value={authWorkspace}
                    onChange={(e) => setAuthWorkspace(e.target.value)}
                  />
                </>
              )}
              {authMode === 'join' && (
                <>
                  <label htmlFor="a_code">Invite code</label>
                  <input
                    id="a_code"
                    type="text"
                    required
                    placeholder="e.g. ACME2026"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                  />
                </>
              )}
              {(authMode === 'up' || authMode === 'join') && (
                <>
                  <label htmlFor="a_name">Your name</label>
                  <input
                    id="a_name"
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                  />
                </>
              )}
              <label htmlFor="a_email">Email</label>
              <input
                id="a_email"
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
              <label htmlFor="a_password">
                {authMode === 'in' ? 'Password' : 'Password (8+ characters)'}
              </label>
              <input
                id="a_password"
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
              <button
                type="submit"
                className="btn"
                id="ab"
                disabled={authBusy}
              >
                {
                  {
                    in: 'Sign in',
                    up: 'Create workspace',
                    join: 'Join workspace',
                  }[authMode]
                }
              </button>
            </form>

            <p className="sm" style={{ marginTop: 20 }}>
              {authMode !== 'in' ? (
                <a onClick={() => setAuthMode('in')}>Sign in instead</a>
              ) : (
                <>
                  <a onClick={() => setAuthMode('up')}>Create a workspace</a> ·{' '}
                  <a onClick={() => setAuthMode('join')}>
                    I have an invite code
                  </a>
                </>
              )}
            </p>

            {cfg?.demo && (
              <>
                <p className="sm g" style={{ marginTop: 30 }}>
                  Try the demo with one click
                </p>
                <div className="demo">
                  {cfg.demo_users.map((u) => (
                    <button
                      key={u.email}
                      type="button"
                      disabled={authBusy}
                      onClick={() => handleDemoLogin(u.email)}
                    >
                      {ROLE_LABEL[u.role] || u.role} ·{' '}
                      {u.email === 'ssmb71110@gmail.com'
                        ? 'ssmb71110@gmail.com'
                        : u.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : view === 'dashboard' ? (
          /* ================= DASHBOARD VIEW ================= */
          <>
            <div className="wrap">
              <section className="hero rv on">
                <h1>
                  Dashboard{' '}
                  <span className="g">
                    The best way to publish,{' '}
                    {user.name.split(' ')[0]}.
                  </span>
                </h1>
                <div className="shelf">
                  {[
                    ['new', 'new', 'New review'],
                    ['reviews', 'reviews', 'Reviews'],
                    ['kb', 'kb', 'Knowledge'],
                    ['kb_guideline', 'file', 'Import guideline', 'guideline'],
                    ['packs', 'packs', 'Brand packs', 'packs'],
                    ['insights', 'insights', 'Insights', 'insights'],
                    ['eval', 'eval', 'Evaluation', 'eval'],
                    ['workspace', 'workspace', 'Workspace', 'workspace'],
                  ]
                    .filter((s) => !s[3] || canAccess(s[3]))
                    .map(([target, icon, label]) => (
                      <a
                        key={target}
                        href={`#/${target}`}
                        onClick={(e) => {
                          e.preventDefault();
                          if (target === 'kb_guideline') {
                            navigateTo('kb', { kbTab: 'guideline' });
                          } else {
                            navigateTo(target as typeof view);
                          }
                        }}
                      >
                        <span className="ico">
                          <SvgIcon name={icon} />
                        </span>
                        {label}
                      </a>
                    ))}
                </div>
              </section>
            </div>

            <div className="wrap">
              <h2 className="sh rv on">
                <span>The latest</span>{' '}
                <span className="g">What needs your attention today.</span>
              </h2>
            </div>

            <ScrollerRow>
              <a
                className="tile dk"
                href="#/reviews"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('reviews');
                }}
              >
                <div className="eb t">Awaiting approval</div>
                <h3>Content waiting for a decision.</h3>
                <p className="g">
                  Routed by risk to a manager or an authorised reviewer.
                </p>
                <div className="big">{dashData?.awaiting ?? 0}</div>
                <div className="lk" style={{ color: '#2997ff' }}>
                  Open the queue <SvgIcon name="chev" />
                </div>
              </a>

              <a
                className="tile"
                href="#/reviews"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('reviews');
                }}
              >
                <div className="eb r">High risk</div>
                <h3>Open high-severity issues.</h3>
                <p className="g">
                  Unsupported claims and fact conflicts block approval.
                </p>
                <div className="big">{dashData?.open_high ?? 0}</div>
                <div className="lk">
                  See what is blocking <SvgIcon name="chev" />
                </div>
              </a>

              <div className="tile grad2">
                <div className="eb">Measured</div>
                <h3>Accuracy on labelled samples.</h3>
                <p className="g">
                  {dashData?.last_eval
                    ? `${dashData.last_eval.samples.length} samples · ${dashData.last_eval.provider}`
                    : 'Run the built-in evaluation.'}
                </p>
                <div className="big teal">
                  {dashData?.last_eval ? (
                    <>
                      {Math.round(dashData.last_eval.overall.f1 * 100)}
                      <span style={{ fontSize: '.4em' }}>%</span>
                    </>
                  ) : (
                    '-'
                  )}
                </div>
                {canAccess('eval') && (
                  <a
                    className="lk"
                    href="#/eval"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('eval');
                    }}
                  >
                    {dashData?.last_eval ? 'See the details' : 'Run evaluation'}{' '}
                    <SvgIcon name="chev" />
                  </a>
                )}
              </div>

              {(dashData?.attention || []).map((c) => (
                <a
                  key={c.id}
                  className={`tile ${c.open_high ? 'dk' : ''}`}
                  href={`#/review/${c.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('review', { reviewId: c.id });
                  }}
                >
                  <div className={`eb ${c.open_high ? 'r' : ''}`}>
                    {c.open_high ? 'High risk' : 'In review'}
                  </div>
                  <h3>{c.title}</h3>
                  <p className="g">
                    {c.channel} · {c.kind} · routed to {c.route}
                  </p>
                  <div className={`big ${c.open_findings ? '' : 'teal'}`}>
                    {c.open_findings ?? 0}
                  </div>
                  <div
                    className="lk"
                    style={{
                      color: c.open_high ? '#2997ff' : 'var(--link)',
                    }}
                  >
                    Open issues. Review <SvgIcon name="chev" />
                  </div>
                </a>
              ))}
            </ScrollerRow>

            <div className="wrap">
              <h2 className="sh rv on">
                <span>The BrandLens difference</span>{' '}
                <span className="g">
                  Reliable, explainable and in your control.
                </span>
              </h2>
            </div>

            <ScrollerRow>
              {[
                [
                  'check',
                  'Explainable',
                  'Every finding cites a rule, fact or evidence ID.',
                ],
                [
                  'ledger',
                  'Claim ledger',
                  'Promotions matched to evidence with expiry dates.',
                ],
                [
                  'fact',
                  'Facts check',
                  'Contradictions with approved facts are caught.',
                ],
                [
                  'image',
                  'Image intelligence',
                  'OCR, contrast on real text, logo and clear space.',
                ],
                [
                  'lock',
                  'Privacy',
                  'Optional redaction before text leaves your server.',
                ],
                [
                  'file',
                  'Guideline import',
                  'Upload a PDF; approve the rules Cloud Intelligence proposes.',
                ],
                [
                  'shield',
                  'Human approval',
                  'High-risk claims need an authorised reviewer.',
                ],
                [
                  'workspace',
                  'Isolated workspaces',
                  'Every organisation sees only its own data.',
                ],
              ].map(([icon, title, desc]) => (
                <div key={title} className="tile sm2">
                  <div className="eb t">{title}</div>
                  <h3>{desc}</h3>
                  <div className="ib">
                    <SvgIcon name={icon} />
                  </div>
                </div>
              ))}
            </ScrollerRow>

            <div className="wrap">
              <h2 className="sh rv on">
                <span>Start here.</span>{' '}
                <span className="g">Three ways to see BrandLens work.</span>
              </h2>
            </div>

            <ScrollerRow>
              <a
                className="tile wide grad1"
                href="#/new"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('new');
                }}
              >
                <div className="eb t">Try it</div>
                <h3>Check a sample post in seconds.</h3>
                <p className="g">
                  Pick a built-in sample or upload a poster. See highlighted
                  issues, sources and fixes.
                </p>
                <div className="ib">
                  <SvgIcon name="new" />
                </div>
                <div className="lk">
                  New review <SvgIcon name="chev" />
                </div>
              </a>

              {canAccess('guideline') && (
                <a
                  className="tile wide grad2"
                  href="#/kb/guideline"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('kb', { kbTab: 'guideline' });
                  }}
                >
                  <div className="eb">Bring your brand</div>
                  <h3>Turn a guideline PDF into rules.</h3>
                  <p className="g">
                    Cloud Intelligence proposes rules, terms and facts. You approve every one
                    before it is used.
                  </p>
                  <div className="ib">
                    <SvgIcon name="file" />
                  </div>
                  <div className="lk">
                    Import a guideline <SvgIcon name="chev" />
                  </div>
                </a>
              )}

              {canAccess('eval') && (
                <a
                  className="tile wide dk"
                  href="#/eval"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('eval');
                  }}
                >
                  <div className="eb t">Prove it</div>
                  <h3>Measure accuracy on 100 labelled samples.</h3>
                  <p className="g">
                    Text and images, with precision and recall per category.
                  </p>
                  <div className="ib">
                    <SvgIcon name="eval" />
                  </div>
                  <div className="lk" style={{ color: '#2997ff' }}>
                    Run evaluation <SvgIcon name="chev" />
                  </div>
                </a>
              )}
            </ScrollerRow>

            <div className="wrap">
              <h2 className="sh rv on">
                <span>Recent activity</span>{' '}
                <span className="g">Everything is logged.</span>
              </h2>
              <div className="list rv on">
                {(dashData?.recent || []).length > 0 ? (
                  dashData!.recent.map((a) => (
                    <a
                      key={a.id}
                      className="it"
                      href={`#/review/${a.content_id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (a.content_id > 0) {
                          navigateTo('review', { reviewId: a.content_id });
                        }
                      }}
                    >
                      <div className="sp">
                        <div className="t">
                          {a.title || `Review #${a.content_id}`}
                        </div>
                        <div className="m">
                          {a.who} · {a.action.replace('_', ' ')} ·{' '}
                          {ago(a.created_at)}
                        </div>
                      </div>
                      <SvgIcon name="chev" />
                    </a>
                  ))
                ) : (
                  <div className="card rv on g">
                    No activity yet. Submit your first review.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : view === 'reviews' ? (
          /* ================= REVIEWS LIST VIEW ================= */
          <div className="nar">
            <section className="hero sm1 rv on">
              <h1>
                Reviews{' '}
                <span className="g">
                  Every piece of content, from draft to approved.
                </span>
              </h1>
            </section>
            <div
              className="row rv on"
              style={{ padding: '26px 0 18px', flexWrap: 'wrap' }}
            >
              <div className="seg">
                {[
                  ['', 'All'],
                  ['in_review', 'In review'],
                  ['changes_requested', 'Changes requested'],
                  ['approved', 'Approved'],
                ].map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    className={reviewsFilter === k ? 'on' : ''}
                    onClick={() => setReviewsFilter(k)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <span className="sp" />
              <a
                className="btn"
                href="#/new"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('new');
                }}
              >
                New review
              </a>
            </div>
            <div className="list">
              {contentsList
                .filter((c) => !reviewsFilter || c.status === reviewsFilter)
                .map((c, i) => (
                  <a
                    key={c.id}
                    className="it rv on"
                    style={{ '--s': Math.min(i, 6) } as React.CSSProperties}
                    href={`#/review/${c.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('review', { reviewId: c.id });
                    }}
                  >
                    <span style={{ color: 'var(--tx2)' }}>
                      <SvgIcon name={c.kind === 'image' ? 'image' : 'file'} />
                    </span>
                    <div className="sp">
                      <div className="t">{c.title}</div>
                      <div className="m">
                        {c.channel} · {c.author} · {ago(c.updated_at)} · routed
                        to {c.route}
                      </div>
                    </div>
                    {c.open_findings ? (
                      <span
                        className={`pill ${c.open_high ? 'high' : 'medium'}`}
                      >
                        {c.open_findings} open
                        {c.open_high ? ` · ${c.open_high} high` : ''}
                      </span>
                    ) : (
                      <span className="pill approved">clear</span>
                    )}
                    <span className={`pill ${c.status}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                    <SvgIcon name="chev" />
                  </a>
                ))}
              {contentsList.filter(
                (c) => !reviewsFilter || c.status === reviewsFilter
              ).length === 0 && (
                <div className="card g rv on">
                  Nothing here yet. Start with a new review.
                </div>
              )}
            </div>
          </div>
        ) : view === 'new' ? (
          /* ================= NEW REVIEW VIEW ================= */
          <div className="nar">
            <section className="hero sm1 rv on">
              <h1>
                New review{' '}
                <span className="g">Check content before it goes public.</span>
              </h1>
            </section>
            <div className="g12" style={{ marginTop: 34 }}>
              <div className="card rv on">
                <h3>Your content</h3>
                <div className="grid2">
                  <div>
                    <label htmlFor="t">Title</label>
                    <input
                      id="t"
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="ch">Channel</label>
                    <select
                      id="ch"
                      value={newChannel}
                      onChange={(e) => setNewChannel(e.target.value)}
                    >
                      <option>LinkedIn</option>
                      <option>Website</option>
                      <option>Email</option>
                      <option>Poster</option>
                    </select>
                  </div>
                </div>

                <label htmlFor="tx">Text or caption</label>
                <textarea
                  id="tx"
                  rows={6}
                  placeholder="Paste your copy here"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                />

                <label>Or upload a file (txt, docx, pdf, png, jpg)</label>
                <div
                  className="drop"
                  id="dz"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('hv');
                  }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('hv')}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('hv');
                    handleFileChange(e.dataTransfer.files?.[0]);
                  }}
                >
                  <SvgIcon name="upload" />
                  <div>Drop a file here or click to choose</div>
                  {newFileName && (
                    <div className="xs" id="fn" style={{ marginTop: 4 }}>
                      Selected: <b>{newFileName}</b>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="fl"
                  hidden
                  accept=".txt,.md,.docx,.pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />

                {/* Dedicated Proper Uploaded Image Container */}
                {newImagePreview && (
                  <div className="uploaded-img-container">
                    <div className="uploaded-img-header">
                      <span>
                        <b>Uploaded Image Container</b> ·{' '}
                        {newFileName || 'Visual Creative'}
                      </span>
                      <button
                        type="button"
                        className="btn g2 sm"
                        onClick={() => {
                          setNewImagePreview(null);
                          setNewFileName('');
                          setNewVisionPresetId(undefined);
                        }}
                      >
                        Remove image
                      </button>
                    </div>
                    <div className="uploaded-img-stage">
                      <img src={newImagePreview} alt="Uploaded preview" />
                    </div>
                  </div>
                )}

                <label htmlFor="alt">Alt text (images)</label>
                <input
                  id="alt"
                  type="text"
                  placeholder="Describe the image for people who cannot see it"
                  value={newAlt}
                  onChange={(e) => setNewAlt(e.target.value)}
                />

                <button
                  type="button"
                  className="btn"
                  id="go"
                  style={{ marginTop: 22 }}
                  disabled={submittingNew}
                  onClick={handleSubmitNewReview}
                >
                  {submittingNew ? 'Analysing…' : 'Run brand review'}
                </button>
              </div>

              <div>
                <div
                  className="card rv on"
                  style={{ '--s': 1 } as React.CSSProperties}
                >
                  <h3>Built-in samples</h3>
                  <p className="sm g" style={{ marginBottom: 10 }}>
                    From the labelled dataset for this brand.
                  </p>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      if (!Number.isNaN(idx) && samplesList[idx]) {
                        const s = samplesList[idx];
                        setNewText(s.text);
                        setNewTitle(`Sample #${s.id} (${s.kind})`);
                        if (s.kind === 'image') {
                          setNewVisionPresetId(
                            s.visionPresetId || 'acme-banner-violation'
                          );
                          setNewChannel('Poster');
                        } else {
                          setNewVisionPresetId(undefined);
                        }
                      }
                    }}
                  >
                    <option value="">Choose a sample</option>
                    {samplesList.map((s, i) => (
                      <option key={s.id} value={i}>
                        {s.text.slice(0, 54)}
                        {s.text.length > 54 ? '…' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className="card rv on"
                  style={{ '--s': 2 } as React.CSSProperties}
                >
                  <h3>What is checked</h3>
                  <p className="sm">
                    Terminology and brand names
                    <br />
                    Claims against the evidence ledger
                    <br />
                    Tone and voice, and approved facts (Cloud Intelligence)
                    <br />
                    Text inside images (OCR) and its contrast
                    <br />
                    Logo presence and clear space
                    <br />
                    Alt text, readability and palette
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : view === 'review' && reviewDetail ? (
          /* ================= REVIEW DETAIL VIEW ================= */
          (() => {
            const c = reviewDetail.content;
            const canDecide = ['manager', 'reviewer', 'admin'].includes(
              user.role
            );
            const openFindings = reviewDetail.findings.filter(
              (f) => f.status === 'open'
            );
            const highCount = openFindings.filter(
              (f) => f.severity === 'high'
            ).length;
            const medCount = openFindings.filter(
              (f) => f.severity === 'medium'
            ).length;
            const lowCount = openFindings.filter(
              (f) => f.severity === 'low'
            ).length;
            const overallScore = Math.max(
              12,
              Math.min(100, 100 - highCount * 18 - medCount * 9 - lowCount * 4)
            );
            const matchingPercentage = Math.max(
              45,
              Math.min(99.8, 100 - openFindings.length * 6.4)
            ).toFixed(1);

            const categories = Array.from(
              new Set(reviewDetail.findings.map((f) => f.category))
            );
            const filteredFindings = reviewDetail.findings.filter(
              (f) => !findingCatFilter || f.category === findingCatFilter
            );
            const stage = c.status === 'approved' ? 3 : 2;
            const steps = [
              'Submitted',
              'Cloud Intelligence review',
              'Human review',
              'Approved',
            ];

            return (
              <div className="nar" style={{ paddingTop: 26 }}>
                <a
                  className="sm"
                  href="#/reviews"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('reviews');
                  }}
                >
                  <SvgIcon name="chevl" /> Reviews
                </a>

                <div
                  className="row rv on"
                  style={{ margin: '14px 0 4px', flexWrap: 'wrap' }}
                >
                  <h1
                    style={{
                      fontSize: 40,
                      lineHeight: 1.1,
                      fontWeight: 600,
                      letterSpacing: '-.03em',
                    }}
                  >
                    {c.title}
                  </h1>
                  <span className={`pill ${c.status}`}>
                    {c.status.replace('_', ' ')}
                  </span>
                  <span className="pill">v{reviewDetail.latest.n}</span>
                  <span className="sp" />
                  <button
                    type="button"
                    className="btn g2 sm"
                    onClick={() => handleExportReport('pdf')}
                  >
                    Export PDF
                  </button>
                  <button
                    type="button"
                    className="btn g2 sm"
                    onClick={() => handleExportReport('json')}
                  >
                    Export JSON
                  </button>
                  {openFindings.some((f) => f.replacement) && (
                    <button
                      type="button"
                      className="btn sm"
                      disabled={runningAutoFix}
                      onClick={handleAgenticAutoFix}
                    >
                      {runningAutoFix
                        ? 'Remediating…'
                        : 'Auto-Fix All'}
                    </button>
                  )}
                </div>

                <p className="g rv on">
                  {c.channel} · by {c.author} · routed to <b>{c.route}</b>
                </p>

                <div className="track rv on">
                  {steps.map((s, i) => (
                    <React.Fragment key={s}>
                      <div
                        className={`st ${
                          i < stage ? 'done' : i === stage ? 'now' : ''
                        }`}
                      >
                        <span className="dot" />
                        {s}
                      </div>
                      {i < 3 && (
                        <div className={`ln ${i < stage ? 'done' : ''}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <div className="g12" style={{ marginTop: 20 }}>
                  <div>
                    <div className="card rv on">
                      <div className="row" style={{ marginBottom: 14 }}>
                        <div className="seg">
                          {(
                            [
                              ['content', 'Content'],
                              ['edit', 'Edit'],
                              ['versions', 'Versions'],
                              ['audit', 'Audit log'],
                            ] as const
                          ).map(([k, l]) => (
                            <button
                              key={k}
                              type="button"
                              className={reviewTab === k ? 'on' : ''}
                              onClick={() => setReviewTab(k)}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {reviewTab === 'content' && (
                        <>
                          {(c.imageDataUrl ||
                            (c.kind === 'image' && c.visionSummary)) && (
                            <div className="uploaded-img-container">
                              <div className="uploaded-img-header">
                                <span>
                                  <b>Uploaded Image Container</b> ·{' '}
                                  {c.visionSummary
                                    ? `Contrast ${c.visionSummary.minContrastRatio}:1 · Clear space ${c.visionSummary.clearSpaceRatio}x`
                                    : 'Visual Creative'}
                                </span>
                                <div className="row" style={{ gap: 8 }}>
                                  <span className="pill">
                                    {c.alt_text ? 'Alt text present' : 'No alt text'}
                                  </span>
                                  <button
                                    type="button"
                                    className="img-zoom-btn"
                                    onClick={openImageZoom}
                                    title="Inspect visual in full-screen zoom view"
                                  >
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 16 16"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M10 2h4v4M6 14H2v-4M14 2L9.5 6.5M2 14l4.5-4.5" />
                                    </svg>
                                    Full-screen zoom
                                  </button>
                                </div>
                              </div>
                              <div
                                className="uploaded-img-stage zoomable"
                                onClick={openImageZoom}
                                role="button"
                                tabIndex={0}
                                aria-label="Open uploaded creative in full-screen zoom inspector"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openImageZoom();
                                  }
                                }}
                              >
                                {c.imageDataUrl ? (
                                  <img
                                    src={c.imageDataUrl}
                                    alt={c.alt_text || c.title}
                                  />
                                ) : (
                                  <div
                                    className="ocr-specimen-card"
                                    style={{
                                      width: '100%',
                                      maxWidth: 460,
                                      padding: 24,
                                      borderRadius: 14,
                                      background: '#1d1d1f',
                                      color: '#f5f5f7',
                                      textAlign: 'center',
                                      transition:
                                        'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
                                    }}
                                  >
                                    <div
                                      className="xs"
                                      style={{
                                        color: '#0071e3',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                      }}
                                    >
                                      OCR Visual Poster Specimen
                                    </div>
                                    <div
                                      style={{
                                        fontWeight: 600,
                                        fontSize: 18,
                                        marginTop: 10,
                                        lineHeight: 1.4,
                                      }}
                                    >
                                      {c.visionSummary?.ocrText}
                                    </div>
                                  </div>
                                )}
                                <div className="uploaded-img-zoom-hint">
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <circle cx="7" cy="7" r="4.5" />
                                    <path d="M10.5 10.5L14 14M7 5v4M5 7h4" />
                                  </svg>
                                  Click to inspect in full screen
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="body">
                            {renderHighlightedBody(
                              reviewDetail.latest.body,
                              reviewDetail.findings
                            )}
                          </div>
                          {c.kind === 'image' && (
                            <p className="xs g" style={{ marginTop: 8 }}>
                              Text above was read from the image with OCR. Alt
                              text: {c.alt_text ? c.alt_text : <i>none</i>}
                            </p>
                          )}
                        </>
                      )}

                      {reviewTab === 'edit' && (
                        <>
                          <textarea
                            id="rv"
                            rows={9}
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn"
                            style={{ marginTop: 12 }}
                            onClick={handleReviseNow}
                          >
                            Save as a new version and re-check
                          </button>
                        </>
                      )}

                      {reviewTab === 'versions' &&
                        reviewDetail.versions
                          .slice()
                          .reverse()
                          .map((v) => (
                            <details
                              key={v.id}
                              style={{ marginBottom: 10 }}
                              open={v.id === reviewDetail.latest.id}
                            >
                              <summary>
                                <b>v{v.n}</b> · {v.by_name} ·{' '}
                                {ago(v.created_at)}
                              </summary>
                              <div className="body" style={{ marginTop: 8 }}>
                                {v.body}
                              </div>
                            </details>
                          ))}

                      {reviewTab === 'audit' && (
                        <table>
                          <tbody>
                            {reviewDetail.audit.map((a) => (
                              <tr key={a.id}>
                                <td
                                  className="g sm"
                                  style={{ whiteSpace: 'nowrap' }}
                                >
                                  {ago(a.created_at)}
                                </td>
                                <td>{a.who}</td>
                                <td>
                                  <b>{a.action.replace('_', ' ')}</b>{' '}
                                  <span className="g">{a.detail}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    <div className="card rv on">
                      <h3>Discussion</h3>
                      {reviewDetail.comments.length > 0 ? (
                        reviewDetail.comments.map((m) => (
                          <div key={m.id} style={{ marginBottom: 12 }}>
                            <b>{m.who}</b>{' '}
                            <span className="pill">
                              {ROLE_LABEL[m.role] || m.role}
                            </span>{' '}
                            <span className="g sm">{ago(m.created_at)}</span>
                            <div>{m.text}</div>
                          </div>
                        ))
                      ) : (
                        <p className="g sm">No comments yet.</p>
                      )}
                      <div className="row" style={{ marginTop: 10 }}>
                        <input
                          id="cm"
                          type="text"
                          placeholder="Add a comment"
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handlePostComment();
                          }}
                        />
                        <button
                          type="button"
                          className="btn g2"
                          onClick={handlePostComment}
                        >
                          Post
                        </button>
                      </div>

                      {canDecide && (
                        <div
                          className="row"
                          style={{ marginTop: 18, flexWrap: 'wrap' }}
                        >
                          <span className="sm g">
                            Decision for{' '}
                            {c.route === 'reviewer' ? (
                              <>
                                <b>an authorised reviewer</b> (high-risk claims)
                              </>
                            ) : (
                              'a manager'
                            )}
                          </span>
                          <span className="sp" />
                          <button
                            type="button"
                            className="btn s"
                            onClick={() => {
                              setDecisionTarget('changes');
                              setDecisionNote('');
                              setModalType('decision');
                            }}
                          >
                            Request changes
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => {
                              setDecisionTarget('approve');
                              setDecisionNote('');
                              setModalType('decision');
                            }}
                          >
                            Approve
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div
                      className="card rv on"
                      style={{ '--s': 1 } as React.CSSProperties}
                    >
                      <div className="row" style={{ marginBottom: 14 }}>
                        <h3 style={{ margin: 0, whiteSpace: 'nowrap' }}>
                          Findings · {openFindings.length} open
                        </h3>
                        <span className="sp" />
                        <select
                          style={{
                            width: 130,
                            padding: '6px 10px',
                            fontSize: 14,
                          }}
                          value={findingCatFilter}
                          onChange={(e) => setFindingCatFilter(e.target.value)}
                        >
                          <option value="">All</option>
                          {categories.map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </select>
                      </div>

                      {filteredFindings.length > 0 ? (
                        filteredFindings.map((f, i) => (
                          <div
                            key={f.id}
                            id={`f${f.id}`}
                            style={{ '--i': i } as React.CSSProperties}
                            className={`fnd ${f.severity} ${
                              f.status !== 'open' ? 'done' : ''
                            }`}
                          >
                            <div className="row">
                              <span className={`pill ${f.severity}`}>
                                {f.severity}
                              </span>
                              <span className="pill">{f.category}</span>
                              <span className="sp" />
                              <span className="xs g">
                                {({
                                  ai: 'Cloud Intelligence',
                                  rule: 'Rule',
                                  ledger: 'Ledger',
                                  vision: 'Vision',
                                  semantic: 'Semantic',
                                } as Record<string, string>)[f.source] ||
                                  f.source}{' '}
                                · {Math.round(f.confidence * 100)}%
                              </span>
                            </div>
                            <div className="b" style={{ margin: '8px 0 2px' }}>
                              “{f.span}”
                            </div>
                            <div className="sm">{f.message}</div>
                            <div className="xs g" style={{ marginTop: 4 }}>
                              Source {f.rule_id}
                            </div>
                            {f.replacement ? (
                              <div className="diff">
                                <s>{f.span}</s> → <b>{f.replacement}</b>
                              </div>
                            ) : (
                              <div className="sm" style={{ marginTop: 8 }}>
                                {f.suggestion}
                              </div>
                            )}
                            {f.status === 'open' ? (
                              <div className="row" style={{ marginTop: 10 }}>
                                {f.replacement && (
                                  <button
                                    type="button"
                                    className="btn sm"
                                    onClick={() => handleApplyFix(f.id)}
                                  >
                                    Apply
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn g2 sm"
                                  onClick={() => {
                                    setDismissTargetId(f.id);
                                    setDismissReason('');
                                    setModalType('dismiss');
                                  }}
                                >
                                  Dismiss…
                                </button>
                              </div>
                            ) : (
                              <div className="xs g" style={{ marginTop: 8 }}>
                                Dismissed: {f.reason}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="g" style={{ padding: '12px 0' }}>
                          No issues found
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom of the Page: Supplementary Details */}
                <div className="bottom-metrics-bar rv on">
                  <div className="bottom-metric-item">
                    <span className="lbl">Accuracy / Rule Match</span>
                    <span className="val blue">{matchingPercentage}%</span>
                    <span className="xs g">Cite-or-Drop verified</span>
                  </div>
                  <div className="bottom-metric-item">
                    <span className="lbl">Overall Governance Score</span>
                    <span className="val">{overallScore} / 100</span>
                    <span className="xs g">
                      {openFindings.length} open ({highCount} high risk)
                    </span>
                  </div>
                  <div className="bottom-metric-item">
                    <span className="lbl">Approval Routing</span>
                    <span
                      className="val"
                      style={{ textTransform: 'capitalize' }}
                    >
                      {c.route}
                    </span>
                    <span className="xs g">
                      Version v{reviewDetail.latest.n} · {c.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="bottom-metric-item">
                    <span className="lbl">Privacy &amp; Redaction</span>
                    <span className="val">
                      {c.redactionSummary?.items.length || 0} Masked
                    </span>
                    <span className="xs g">
                      PII tokens redacted before analysis
                    </span>
                  </div>
                </div>
              </div>
            );
          })()
        ) : view === 'kb' && kbData ? (
          /* ================= KNOWLEDGE BASE VIEW ================= */
          <div className="nar">
            <section className="hero sm1 rv on">
              <h1>
                Knowledge{' '}
                <span className="g">
                  The rules, facts and evidence behind every finding.
                </span>
              </h1>
            </section>
            <div className="rv on" style={{ margin: '30px 0 18px' }}>
              <div className="seg">
                {[
                  ['rules', 'Rules'],
                  ['terms', 'Terminology'],
                  ['facts', 'Facts'],
                  ['claims', 'Claim ledger'],
                  ['palette', 'Palette'],
                  ['logos', 'Logos'],
                  ...(user.role === 'admin'
                    ? [['guideline', 'Import guideline']]
                    : []),
                ].map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    className={kbTab === k ? 'on' : ''}
                    onClick={() => setKbTab(k)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="card rv on"
              style={{ '--s': 1 } as React.CSSProperties}
            >
              {kbTab === 'rules' && (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Rule</th>
                      <th>Category</th>
                      <th>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kbData.rules.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <b>{r.id}</b>
                        </td>
                        <td>{r.text}</td>
                        <td>{r.category}</td>
                        <td>
                          <span className={`pill ${r.severity}`}>
                            {r.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {kbTab === 'terms' && (
                <table>
                  <thead>
                    <tr>
                      <th>Avoid</th>
                      <th>Use instead</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kbData.terms.map((t) => (
                      <tr key={t.id}>
                        <td>✗ {t.banned}</td>
                        <td>✓ {t.preferred}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {kbTab === 'facts' && (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Approved fact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kbData.facts.map((f) => (
                      <tr key={f.id}>
                        <td>
                          <b>{f.id}</b>
                        </td>
                        <td>{f.text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {kbTab === 'claims' && (
                <table>
                  <thead>
                    <tr>
                      <th>Evidence</th>
                      <th>Claim</th>
                      <th>Source</th>
                      <th>Owner</th>
                      <th>Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kbData.claims.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <b>E-{c.id}</b>
                        </td>
                        <td>{c.phrase}</td>
                        <td>{c.evidence}</td>
                        <td>{c.owner}</td>
                        <td>
                          {c.expires}{' '}
                          {c.expires < '2026-11-09' && (
                            <span className="pill high">expired</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {kbTab === 'palette' && (
                <div className="row" style={{ flexWrap: 'wrap', gap: 22 }}>
                  {kbData.palette.map((p) => (
                    <div key={p.id} style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          width: 84,
                          height: 84,
                          borderRadius: 24,
                          background: p.hex,
                          border: '1px solid var(--line)',
                        }}
                      />
                      <div className="sm b" style={{ marginTop: 6 }}>
                        {p.name}
                      </div>
                      <div className="xs g">{p.hex}</div>
                    </div>
                  ))}
                </div>
              )}

              {kbTab === 'logos' && (
                <>
                  <p className="sm g" style={{ marginBottom: 14 }}>
                    Logos are detected in uploaded images (template matching)
                    and their clear space is checked (minimum 1.5x logo height).
                  </p>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 18 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          width: 140,
                          height: 90,
                          borderRadius: 18,
                          border: '1px solid var(--line)',
                          background: 'var(--bg2)',
                          display: 'grid',
                          placeItems: 'center',
                          padding: 12,
                        }}
                      >
                        <BrandLensWordmark />
                      </div>
                      <div className="sm b" style={{ marginTop: 6 }}>
                        {kbData.pack.name} Primary Wordmark
                      </div>
                    </div>
                  </div>
                </>
              )}

              {kbTab === 'guideline' && (
                <>
                  <h3>Turn a guideline into rules</h3>
                  <p className="sm g" style={{ marginBottom: 6 }}>
                    Upload a brand guideline (PDF, DOCX or TXT) or paste text.
                    Cloud Intelligence proposes rules, terms and facts.{' '}
                    <b>Nothing is used until you approve it.</b>
                  </p>
                  <label htmlFor="gt">Guideline text</label>
                  <textarea
                    id="gt"
                    rows={5}
                    placeholder="Paste guideline text…"
                    value={guidelineText}
                    onChange={(e) => setGuidelineText(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn"
                    id="gb"
                    style={{ marginTop: 14 }}
                    disabled={guidelineAnalyzing}
                    onClick={handleAnalyzeGuideline}
                  >
                    {guidelineAnalyzing
                      ? 'Analysing…'
                      : guidelineProposal
                      ? 'Analyse again'
                      : 'Analyse guideline'}
                  </button>

                  {guidelineProposal && (
                    <div id="gres" style={{ marginTop: 20 }}>
                      <div className="alert o">
                        Proposed by Cloud Intelligence from {guidelineProposal.chars}{' '}
                        characters. Review, edit and untick anything you do not
                        want.
                      </div>
                      <h3>Rules ({guidelineProposal.rules.length})</h3>
                      {guidelineProposal.rules.map((r, i) => (
                        <div
                          key={r.id}
                          className="row"
                          style={{
                            alignItems: 'flex-start',
                            marginBottom: 10,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={r.on !== false}
                            style={{ marginTop: 12, width: 20, height: 20 }}
                            onChange={(e) => {
                              const next = [...guidelineProposal.rules];
                              next[i] = { ...next[i], on: e.target.checked };
                              setGuidelineProposal({
                                ...guidelineProposal,
                                rules: next,
                              });
                            }}
                          />
                          <div className="sp">
                            <span className="pill">{r.id}</span>{' '}
                            <span className="pill">{r.category}</span>{' '}
                            <span className={`pill ${r.severity}`}>
                              {r.severity}
                            </span>
                            <input
                              type="text"
                              value={r.text}
                              style={{
                                marginTop: 6,
                                padding: '9px 12px',
                                fontSize: 15,
                              }}
                              onChange={(e) => {
                                const next = [...guidelineProposal.rules];
                                next[i] = { ...next[i], text: e.target.value };
                                setGuidelineProposal({
                                  ...guidelineProposal,
                                  rules: next,
                                });
                              }}
                            />
                          </div>
                        </div>
                      ))}

                      <h3 style={{ marginTop: 18 }}>
                        Terminology ({guidelineProposal.terms.length})
                      </h3>
                      {guidelineProposal.terms.map((t, i) => (
                        <div
                          key={i}
                          className="row"
                          style={{ marginBottom: 6 }}
                        >
                          <input
                            type="checkbox"
                            checked={t.on !== false}
                            style={{ width: 20, height: 20 }}
                            onChange={(e) => {
                              const next = [...guidelineProposal.terms];
                              next[i] = { ...next[i], on: e.target.checked };
                              setGuidelineProposal({
                                ...guidelineProposal,
                                terms: next,
                              });
                            }}
                          />
                          <span>
                            ✗ {t.banned} → ✓ {t.preferred}
                          </span>
                        </div>
                      ))}

                      <h3 style={{ marginTop: 18 }}>
                        Approved facts ({guidelineProposal.facts.length})
                      </h3>
                      {guidelineProposal.facts.map((f, i) => (
                        <div
                          key={f.id}
                          className="row"
                          style={{ marginBottom: 6 }}
                        >
                          <input
                            type="checkbox"
                            checked={f.on !== false}
                            style={{ width: 20, height: 20 }}
                            onChange={(e) => {
                              const next = [...guidelineProposal.facts];
                              next[i] = { ...next[i], on: e.target.checked };
                              setGuidelineProposal({
                                ...guidelineProposal,
                                facts: next,
                              });
                            }}
                          />
                          <span className="sm">{f.text}</span>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="btn"
                        style={{ marginTop: 18 }}
                        onClick={handleApplyGuideline}
                      >
                        Add selected to the knowledge base
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : view === 'insights' && insightsData ? (
          /* ================= INSIGHTS VIEW ================= */
          (() => {
            const mx = Math.max(
              1,
              ...insightsData.by_rule.map((r) => r.total)
            );
            return (
              <div className="nar">
                <section className="hero sm1 rv on">
                  <h1>
                    Insights{' '}
                    <span className="g">
                      Where mistakes repeat and where guidelines are unclear.
                    </span>
                  </h1>
                </section>
                <div className="card rv on" style={{ marginTop: 34 }}>
                  <h3>Most frequently hit rules</h3>
                  {insightsData.by_rule.length > 0 ? (
                    insightsData.by_rule.map((r) => (
                      <div
                        key={r.rule_id}
                        className="row"
                        style={{ margin: '12px 0' }}
                      >
                        <b style={{ width: 64 }}>{r.rule_id}</b>
                        <div className="bar sp">
                          <i
                            style={{
                              width: `${Math.round((r.total / mx) * 100)}%`,
                            }}
                          />
                        </div>
                        <span style={{ width: 30, textAlign: 'right' }}>
                          {r.total}
                        </span>
                        {r.unclear && (
                          <span className="pill medium">may be unclear</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="g">No data yet.</p>
                  )}
                  <p className="xs g">
                    A rule is flagged “may be unclear” when creators dismiss at
                    least half of its findings, a sign its wording needs work.
                  </p>
                </div>

                <div className="grid2">
                  <div className="card rv on">
                    <h3>Claim ledger health</h3>
                    <table>
                      <tbody>
                        {insightsData.claims.map((c) => (
                          <tr key={c.id}>
                            <td>{c.phrase}</td>
                            <td>
                              {c.expired ? (
                                <span className="pill high">expired</span>
                              ) : (
                                <span className="pill approved">valid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div
                    className="card rv on"
                    style={{ '--s': 1 } as React.CSSProperties}
                  >
                    <h3>Where findings come from</h3>
                    {insightsData.by_source.map((s) => (
                      <div
                        key={s.source}
                        className="row"
                        style={{ margin: '8px 0' }}
                      >
                        <span className="pill">
                          {({
                            ai: 'Cloud Intelligence',
                            rule: 'Rule',
                            ledger: 'Ledger',
                            vision: 'Vision',
                            semantic: 'Semantic',
                          } as Record<string, string>)[s.source] || s.source}
                        </span>
                        <span className="sp" />
                        <b>{s.n}</b>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()
        ) : view === 'eval' ? (
          /* ================= EVALUATION VIEW ================= */
          <div className="nar">
            <section className="hero sm1 rv on">
              <h1>
                Evaluation{' '}
                <span className="g">
                  Measured accuracy on labelled text and images.
                </span>
              </h1>
              <p className="g rv on" style={{ marginTop: 14, fontSize: 19 }}>
                Runs the real pipeline over every sample of the active brand
                pack and compares findings with the expected labels.
              </p>
              <button
                type="button"
                className="btn"
                id="eb"
                style={{ marginTop: 22 }}
                disabled={runningEval}
                onClick={handleRunEval}
              >
                {runningEval
                  ? 'Running… this can take a moment'
                  : 'Run evaluation'}
              </button>
            </section>

            {evalData ? (
              <>
                <div className="grid2" style={{ marginTop: 34 }}>
                  <div className="tile dk rv on" style={{ height: 300 }}>
                    <div className="eb t">F1 score</div>
                    <div className="big">
                      {Math.round(evalData.overall.f1 * 100)}
                      <span style={{ fontSize: '.4em' }}>%</span>
                    </div>
                    <p className="g sm">
                      Precision {Math.round(evalData.overall.precision * 100)}%
                      · Recall {Math.round(evalData.overall.recall * 100)}%
                    </p>
                  </div>

                  <div
                    className="tile rv on"
                    style={{ height: 300, '--s': 1 } as React.CSSProperties}
                  >
                    <div className="eb">Coverage</div>
                    <h3>{evalData.samples.length} samples</h3>
                    {(['text', 'image'] as const).map((k) => {
                      const subset = evalData.samples.filter(
                        (s) => s.kind === k
                      );
                      const pct = subset.length
                        ? Math.round(
                            (subset.filter((s) => s.ok).length /
                              subset.length) *
                              100
                          )
                        : Math.round(evalData.overall.f1 * 100);
                      return (
                        <div
                          key={k}
                          className="row"
                          style={{ marginTop: 16 }}
                        >
                          <span className="pill">{k}</span>
                          <div className="bar t sp">
                            <i style={{ width: `${pct}%` }} />
                          </div>
                          <b>{pct}%</b>
                        </div>
                      );
                    })}
                    <p className="xs g" style={{ marginTop: 'auto' }}>
                      {evalData.pack} · {evalData.provider} · {evalData.model} ·{' '}
                      {ago(evalData.ran_at)}
                    </p>
                  </div>
                </div>

                <div className="card rv on" style={{ marginTop: 16 }}>
                  <h3>By category</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Precision</th>
                        <th>Recall</th>
                        <th>F1</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(evalData.categories).map(([k, v]) => (
                        <tr key={k}>
                          <td style={{ textTransform: 'capitalize' }}>{k}</td>
                          <td>{Math.round(v.precision * 100)}%</td>
                          <td>{Math.round(v.recall * 100)}%</td>
                          <td>
                            <b>{Math.round(v.f1 * 100)}%</b>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="card rv on">
                  <h3>
                    Samples needing a look (
                    {evalData.samples.filter((s) => !s.ok).length})
                  </h3>
                  {evalData.samples.filter((s) => !s.ok).length > 0 ? (
                    evalData.samples
                      .filter((s) => !s.ok)
                      .map((s) => (
                        <div key={s.id} style={{ marginBottom: 10 }}>
                          <span className="pill">{s.kind}</span>{' '}
                          <span className="sm">{s.text.slice(0, 80)}</span>
                        </div>
                      ))
                  ) : (
                    <p className="g">Every sample passed.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="card rv on" style={{ marginTop: 30 }}>
                <p className="g">
                  No evaluation has been run yet. Press Run evaluation.
                </p>
              </div>
            )}
          </div>
        ) : view === 'workspace' && workspaceData ? (
          /* ================= WORKSPACE & SETTINGS VIEW ================= */
          <div className="nar">
            <section className="hero sm1 rv on">
              <h1>
                Workspace &amp; Settings{' '}
                <span className="g">
                  {workspaceData.name}: people, privacy, Cloud Intelligence connection and
                  platform.
                </span>
              </h1>
            </section>

            {/* Cloud Intelligence Connection & Diagnostics Card */}
            <div className="card rv on" style={{ marginTop: 34 }}>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <div className="sp">
                  <div className="eb t">Cloud Intelligence Connection &amp; Diagnostics</div>
                  <h3 style={{ marginBottom: 4 }}>
                    {workspaceData.ai.enabled
                      ? `${workspaceData.ai.provider} is connected (${workspaceData.ai.connectedEmail || 'ssmb71110@gmail.com'}).`
                      : 'Cloud Intelligence is not connected.'}
                  </h3>
                  <p className="sm g">
                    {workspaceData.ai.enabled
                      ? `Model ${workspaceData.ai.model} · Bound to ${workspaceData.ai.connectedEmail || 'ssmb71110@gmail.com'} · Server-side API Key Placeholder (${workspaceData.ai.apiKeyEnvVar || 'CLOUD_INTELLIGENCE_API_KEY'}) configured for future deployment.`
                      : 'Rule-based checks and OCR still run.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn"
                  onClick={handleTestAI}
                >
                  Test connection
                </button>
              </div>
            </div>

            <div className="card rv on">
              <h3>Platform</h3>
              <div className="spec">
                <div>Active brand pack</div>
                <div>{workspaceData.pack || '-'}</div>
                <div>Cloud Intelligence provider</div>
                <div>
                  {workspaceData.ai.enabled
                    ? `${workspaceData.ai.provider} · ${workspaceData.ai.model}`
                    : 'Not configured'}
                </div>
                <div>Connected identity</div>
                <div>{workspaceData.ai.connectedEmail || 'ssmb71110@gmail.com'}</div>
                <div>API key configuration</div>
                <div>
                  {workspaceData.ai.apiKeyEnvVar || 'CLOUD_INTELLIGENCE_API_KEY'} (Server-side placeholder ready)
                </div>
                <div>Rule retrieval</div>
                <div>{workspaceData.retrieval}</div>
                <div>Image OCR</div>
                <div>{workspaceData.ocr ? 'On' : 'Off'}</div>
              </div>
              {user.role === 'admin' && (
                <button
                  type="button"
                  className="btn g2 sm"
                  style={{ marginTop: 14 }}
                  onClick={handleReindex}
                >
                  Rebuild the retrieval index
                </button>
              )}
            </div>

            <div className="card rv on">
              <div className="row">
                <div className="sp">
                  <h3 style={{ marginBottom: 4 }}>
                    Redact personal identifiers
                  </h3>
                  <p className="sm g">
                    Emails, phone numbers, links and @handles are replaced with
                    placeholders before text is sent to Cloud Intelligence, then
                    restored in the results.
                  </p>
                </div>
                <button
                  type="button"
                  className={`switch ${workspaceData.redact ? 'on' : ''}`}
                  disabled={user.role !== 'admin'}
                  aria-label="Toggle redaction"
                  onClick={() => handleToggleRedact(!workspaceData.redact)}
                />
              </div>
            </div>

            <div className="card rv on">
              <h3>Team</h3>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaceData.members.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td className="g">{m.email}</td>
                      <td>
                        <span className="pill">
                          {ROLE_LABEL[m.role] || m.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {user.role === 'admin' && (
              <div className="card rv on">
                <h3>Invite people</h3>
                <div className="row">
                  <select
                    id="ir"
                    style={{ maxWidth: 200 }}
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    {['creator', 'manager', 'reviewer', 'admin'].map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleMakeInvite}
                  >
                    Create invite code
                  </button>
                </div>
                <table style={{ marginTop: 14 }}>
                  <tbody>
                    {workspaceData.invites.map((i) => (
                      <tr key={i.code}>
                        <td>
                          <b
                            style={{
                              fontFamily: 'ui-monospace,monospace',
                              letterSpacing: '.1em',
                            }}
                          >
                            {i.code}
                          </b>
                        </td>
                        <td>{ROLE_LABEL[i.role] || i.role}</td>
                        <td>
                          {i.used ? (
                            <span className="pill">used</span>
                          ) : (
                            <span className="pill approved">available</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : view === 'packs' ? (
          /* ================= BRAND PACKS VIEW ================= */
          <div className="nar">
            <section className="hero sm1 rv on">
              <h1>
                Brand packs.{' '}
                <span className="g">
                  Pre-built knowledge bases to start from.
                </span>
              </h1>
            </section>
            <div className="grid2" style={{ marginTop: 34 }}>
              {packsData.map((p, i) => (
                <div
                  key={p.id}
                  className={`tile ${p.active ? 'grad1' : ''} rv on`}
                  style={
                    {
                      '--s': i,
                      height: 'auto',
                      minHeight: 340,
                    } as React.CSSProperties
                  }
                >
                  <div className={`eb ${p.active ? 't' : ''}`}>
                    {p.active ? 'Active' : p.industry}
                  </div>
                  <h3>{p.name}</h3>
                  <p className="g">{p.description}</p>
                  <p className="sm g" style={{ marginTop: 14 }}>
                    {p.rules} rules · {p.terms} terms · {p.facts} facts ·{' '}
                    {p.claims} claims
                    <br />
                    {p.samples} labelled samples ({p.images} images)
                  </p>
                  {!p.active && (
                    <button
                      type="button"
                      className="btn"
                      style={{ marginTop: 22, alignSelf: 'flex-start' }}
                      onClick={() => handleLoadPack(p.id)}
                    >
                      Load this pack
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="sm g rv on" style={{ marginTop: 18 }}>
              Loading a pack replaces the rules, terms, facts, claim ledger,
              palette and logo of this workspace. Existing reviews are kept.
            </p>
          </div>
        ) : null}

        {/* Frequently Asked Questions (FAQ) & Admin / Developer Client Contact Slots */}
        {user && (
          <section id="faq-section" className="faq-wrap rv on">
            <h2 className="sh" style={{ paddingTop: 24, paddingBottom: 18 }}>
              <span>Frequently Asked Questions</span>{' '}
              <span className="g">
                How BrandLens analyzes content and connects with your team.
              </span>
            </h2>

            <div className="faq-grid">
              <div className="faq-list">
                {FAQ_ITEMS.map((item, idx) => (
                  <details key={idx} open={idx === 0}>
                    <summary>
                      <span>{item.q}</span>
                      <SvgIcon name="chev" />
                    </summary>
                    <div className="faq-ans">{item.a}</div>
                  </details>
                ))}
              </div>

              <div className="admin-contact-card">
                <div
                  className="eb"
                  style={{ color: 'var(--blue)', marginBottom: 4 }}
                >
                  Developer Bridge
                </div>
                <h3 style={{ marginBottom: 6 }}>
                  Admin Contact
                </h3>
                <p className="sm g">
                  Dedicated contact slots for customer and client interaction
                  through the administrator or developer.
                   
                </p>

                <div className="admin-slot-box">
                  <div className="slot-tag">
                    Admin Email Slot (Customer / Client Inquiries)
                  </div>
                  <input
                    type="text"
                    aria-label="Admin Email Slot"
                    value={adminEmailSlot}
                    onChange={(e) =>
                      handleSaveAdminSlots(e.target.value, adminPhoneSlot)
                    }
                    placeholder="Enter real admin email address..."
                  />
                </div>

                <div className="admin-slot-box">
                  <div className="slot-tag">
                    Admin Phone Number Slot (Direct Support Line)
                  </div>
                  <input
                    type="text"
                    aria-label="Admin Phone Number Slot"
                    value={adminPhoneSlot}
                    onChange={(e) =>
                      handleSaveAdminSlots(adminEmailSlot, e.target.value)
                    }
                    placeholder="Enter real admin phone number..."
                  />
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Recent Analysis Sidebar Drawer (Last 5 Analysis Reports) */}
      <RecentAnalysisDrawer
        isOpen={recentDrawerOpen}
        onClose={() => setRecentDrawerOpen(false)}
        recentReports={contentsList}
        selectedContentId={view === 'review' ? reviewId : undefined}
        onSelectReport={(id) => navigateTo('review', { reviewId: id })}
      />

      {/* Modals */}
      {modalType && (
        <div
          className="modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalType(null);
          }}
        >
          <div>
            {modalType === 'support' && (
              <>
                <h3 style={{ fontSize: 24, marginBottom: 8 }}>
                  Help &amp; support
                </h3>
                <p className="g sm">
                  Quick navigation to workspace settings, evaluation metrics,
                  and client support.
                </p>
                <div
                  style={{
                    margin: '16px 0',
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    className="btn g2"
                    onClick={() => {
                      setModalType(null);
                      navigateTo('workspace');
                    }}
                  >
                    Open Workspace &amp; Cloud Intelligence Settings
                  </button>
                  <button
                    type="button"
                    className="btn g2"
                    onClick={() => {
                      setModalType(null);
                      navigateTo('eval');
                    }}
                  >
                    See measured accuracy
                  </button>
                  <button
                    type="button"
                    className="btn g2"
                    onClick={() => {
                      setModalType(null);
                      scrollToFaq();
                    }}
                  >
                    Frequently Asked Questions &amp; Admin Contact
                  </button>
                </div>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: 'var(--bg2)',
                    fontSize: 13,
                  }}
                >
                  <div>
                    <b>Admin Email Slot:</b> {adminEmailSlot}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <b>Admin Phone Slot:</b> {adminPhoneSlot}
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginTop: 14 }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setModalType(null)}
                  >
                    Done
                  </button>
                </div>
              </>
            )}

            {modalType === 'ai_status' && aiStatusModalData && (
              <>
                <h3 style={{ fontSize: 24, marginBottom: 8 }}>
                  {aiStatusModalData.ok
                    ? 'Cloud Intelligence connection works'
                    : 'Cloud Intelligence is not working'}
                </h3>
                <p>{aiStatusModalData.message}</p>
                <p className="sm g" style={{ marginTop: 8 }}>
                  Provider: {aiStatusModalData.provider} · model:{' '}
                  {aiStatusModalData.model}
                </p>
                <p className="xs g" style={{ marginTop: 6 }}>
                  Connected account:{' '}
                  <b>{aiStatusModalData.connectedEmail || 'ssmb71110@gmail.com'}</b>{' '}
                  · Env var:{' '}
                  <code>
                    {aiStatusModalData.apiKeyEnvVar || 'CLOUD_INTELLIGENCE_API_KEY'}
                  </code>
                </p>
                <div style={{ textAlign: 'right', marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setModalType(null)}
                  >
                    Close
                  </button>
                </div>
              </>
            )}

            {modalType === 'dismiss' && (
              <>
                <h3 style={{ fontSize: 24 }}>Dismiss this finding</h3>
                <p className="g sm" style={{ margin: '6px 0 12px' }}>
                  A reason is required and is kept in the audit log.
                </p>
                <textarea
                  id="dr"
                  rows={3}
                  placeholder="Why is this acceptable?"
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                />
                <div className="row" style={{ marginTop: 16 }}>
                  <span className="sp" />
                  <button
                    type="button"
                    className="btn g2"
                    onClick={() => setModalType(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleConfirmDismiss}
                  >
                    Dismiss
                  </button>
                </div>
              </>
            )}

            {modalType === 'decision' && (
              <>
                <h3 style={{ fontSize: 24 }}>
                  {decisionTarget === 'approve'
                    ? 'Approve this content'
                    : 'Request changes'}
                </h3>
                <textarea
                  id="nt"
                  rows={3}
                  style={{ marginTop: 12 }}
                  placeholder="Note for the creator (optional)"
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                />
                <div className="row" style={{ marginTop: 16 }}>
                  <span className="sp" />
                  <button
                    type="button"
                    className="btn g2"
                    onClick={() => setModalType(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleConfirmDecision}
                  >
                    Confirm
                  </button>
                </div>
              </>
            )}

            {modalType === 'invite_code' && (
              <>
                <h3 style={{ fontSize: 24 }}>Invite code</h3>
                <p className="g sm" style={{ margin: '6px 0 14px' }}>
                  Share this code. It works once.
                </p>
                <div
                  style={{
                    font: '600 36px ui-monospace,monospace',
                    letterSpacing: '.14em',
                    textAlign: 'center',
                    padding: 14,
                    background: 'var(--bg2)',
                    borderRadius: 16,
                  }}
                >
                  {generatedInviteCode}
                </div>
                <div style={{ textAlign: 'right', marginTop: 18 }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setModalType(null)}
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && <div className="toast">{toastMsg}</div>}

      {/* Modern Footer */}
      {user && (
        <footer id="foot" className="bl-modern-footer">
          <div className="bl-footer-inner">
            <div className="bl-footer-top">
              <div className="bl-footer-brand">
                <BrandLensWordmark />
                <p className="tagline">
                  Fast, Smart, and Explainable Brand Studio
                </p>

                <div className="bl-footer-admin-slots">
                  <div className="slot-row">
                    <span>Admin Email:</span>
                    <span className="slot-val">{adminEmailSlot}</span>
                  </div>
                  <div className="slot-row">
                    <span>Admin Phone:</span>
                    <span className="slot-val">{adminPhoneSlot}</span>
                  </div>
                </div>
              </div>

              <div className="bl-footer-col">
                <h5>Important Links</h5>
                <a
                  href="#/dashboard"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('dashboard');
                  }}
                >
                  Home
                </a>
                <a
                  href="#/reviews"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('reviews');
                  }}
                >
                  Reviews
                </a>
                <a
                  href="#/kb"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('kb');
                  }}
                >
                  Knowledge Base
                </a>
                <a
                  href="#/packs"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('packs');
                  }}
                >
                  Brand Packs
                </a>
                <a onClick={scrollToFaq}>How It Works</a>
                <a onClick={scrollToFaq}>Contact Admin</a>
              </div>

              <div className="bl-footer-col">
                <h5>Tools</h5>
                <a
                  href="#/new"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('new');
                  }}
                >
                  Model Testing
                </a>
                <a
                  href="#/new"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('new');
                  }}
                >
                  OCR &amp; Contrast Check
                </a>
                <a
                  href="#/kb"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('kb', { kbTab: 'claims' });
                  }}
                >
                  Claim Ledger Audit
                </a>
                <a
                  href="#/workspace"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('workspace');
                  }}
                >
                  PII Redaction
                </a>
                <a
                  href="#/kb"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('kb', { kbTab: 'guideline' });
                  }}
                >
                  Guideline Import
                </a>
              </div>

              <div className="bl-footer-col">
                <h5>Resources / Support</h5>
                <a onClick={() => setModalType('support')}>Help Center</a>
                <a onClick={scrollToFaq}>FAQ</a>
                <a
                  href="#/insights"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('insights');
                  }}
                >
                  Insights &amp; Feedback
                </a>
                <a
                  href="#/eval"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('eval');
                  }}
                >
                  Performance &amp; Accuracy
                </a>
                <a
                  href="#/workspace"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('workspace');
                  }}
                >
                  Cloud Intelligence Settings
                </a>
                <a
                  href="#/workspace"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('workspace');
                  }}
                >
                  Custom Integration
                </a>
              </div>

              <div className="bl-footer-col">
                <h5>Social Media / Community</h5>
                <a onClick={scrollToFaq}>LinkedIn</a>
                <a onClick={scrollToFaq}>X (Twitter)</a>
                <a onClick={scrollToFaq}>Instagram</a>
                <a onClick={scrollToFaq}>GitHub</a>
                <a onClick={scrollToFaq}>Join our governance community!</a>
              </div>
            </div>
          </div>

          <div className="bl-footer-watermark-stage">
            <div className="bl-footer-watermark" aria-hidden="true">
              <span className="wm-brand">Brand</span>
              <span className="wm-lens">Lens</span>
            </div>

            <div className="bl-footer-floating-bar">
              <div className="bl-footer-pill">
                <span>© 2026 BrandLens. All rights reserved</span>
              </div>

              <div className="bl-footer-pill">
                <a onClick={scrollToFaq}>• Terms &amp; Condition</a>
                <a onClick={scrollToFaq}>• Privacy &amp; Policy</a>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Full-Screen Visual Inspection & Zoom Lightbox for Review Detail */}
      {imageZoomOpen && view === 'review' && reviewDetail && (
        <div
          className={`img-zoom-lightbox${imageZoomLightBg ? ' light-surface' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen visual zoom inspector"
        >
          <div className="img-zoom-toolbar">
            <div className="img-zoom-meta">
              <span className="img-zoom-title">
                {reviewDetail.content.title}
              </span>
              <span className="pill bl">{reviewDetail.content.channel}</span>
              {reviewDetail.content.visionSummary && (
                <>
                  <span
                    className={`pill ${
                      reviewDetail.content.visionSummary.minContrastRatio >= 4.5
                        ? 'low'
                        : 'high'
                    }`}
                  >
                    WCAG Contrast {reviewDetail.content.visionSummary.minContrastRatio}
                    :1
                  </span>
                  <span
                    className={`pill ${
                      reviewDetail.content.visionSummary.clearSpaceRatio >= 1.5
                        ? 'low'
                        : 'medium'
                    }`}
                  >
                    Logo Clear Space {reviewDetail.content.visionSummary.clearSpaceRatio}
                    x
                  </span>
                  <span
                    className={`pill ${
                      reviewDetail.content.visionSummary.logoDetected
                        ? 'low'
                        : 'medium'
                    }`}
                  >
                    {reviewDetail.content.visionSummary.logoDetected
                      ? 'Brand Logo Detected'
                      : 'No Logo Detected'}
                  </span>
                </>
              )}
            </div>

            <div className="img-zoom-controls">
              <button
                type="button"
                className="img-zoom-ctrl-btn"
                onClick={() => adjustImageZoom(-0.25)}
                title="Zoom out (-)"
                aria-label="Zoom out"
              >
                − Zoom Out
              </button>
              <span className="img-zoom-readout">
                {Math.round(imageZoomScale * 100)}%
              </span>
              <button
                type="button"
                className="img-zoom-ctrl-btn"
                onClick={() => adjustImageZoom(0.25)}
                title="Zoom in (+)"
                aria-label="Zoom in"
              >
                + Zoom In
              </button>
              <button
                type="button"
                className="img-zoom-ctrl-btn"
                onClick={resetImageZoom}
                title="Reset zoom to 100% (0)"
              >
                Reset (100%)
              </button>
              <button
                type="button"
                className={`img-zoom-ctrl-btn${imageZoomSafeZone ? ' active' : ''}`}
                onClick={() => setImageZoomSafeZone((v) => !v)}
                title="Toggle brand safe-zone & clear-space inspection guide"
              >
                Safe-Zone Guide
              </button>
              <button
                type="button"
                className={`img-zoom-ctrl-btn${imageZoomLightBg ? ' active' : ''}`}
                onClick={() => setImageZoomLightBg((v) => !v)}
                title="Switch backdrop between dark and light surface"
              >
                {imageZoomLightBg ? 'Dark Surface' : 'Light Surface'}
              </button>
              <button
                type="button"
                className="img-zoom-ctrl-btn close-btn"
                onClick={() => setImageZoomOpen(false)}
                title="Exit full-screen zoom (Esc)"
              >
                ✕ Exit Full Screen
              </button>
            </div>
          </div>

          <div
            className="img-zoom-viewport"
            style={{
              cursor: imageZoomDragging
                ? 'grabbing'
                : imageZoomScale > 1
                ? 'grab'
                : 'zoom-in',
            }}
            onWheel={(e) => {
              e.preventDefault();
              adjustImageZoom(e.deltaY < 0 ? 0.2 : -0.2);
            }}
            onMouseDown={(e) => {
              if (imageZoomScale <= 1) return;
              setImageZoomDragging(true);
              setImageZoomDragStart({
                x: e.clientX - imageZoomPan.x,
                y: e.clientY - imageZoomPan.y,
              });
            }}
            onMouseMove={(e) => {
              if (!imageZoomDragging) return;
              setImageZoomPan({
                x: e.clientX - imageZoomDragStart.x,
                y: e.clientY - imageZoomDragStart.y,
              });
            }}
            onMouseUp={() => setImageZoomDragging(false)}
            onMouseLeave={() => setImageZoomDragging(false)}
            onDoubleClick={() => {
              if (imageZoomScale > 1) {
                resetImageZoom();
              } else {
                setImageZoomScale(2);
              }
            }}
          >
            <div
              className={`img-zoom-canvas${imageZoomDragging ? ' dragging' : ''}`}
              style={{
                transform: `translate(${imageZoomPan.x}px, ${imageZoomPan.y}px) scale(${imageZoomScale})`,
              }}
            >
              {reviewDetail.content.imageDataUrl ? (
                <img
                  src={reviewDetail.content.imageDataUrl}
                  alt={
                    reviewDetail.content.alt_text || reviewDetail.content.title
                  }
                />
              ) : (
                <div
                  style={{
                    width: 680,
                    maxWidth: '86vw',
                    padding: '48px 42px',
                    borderRadius: 22,
                    background: '#1d1d1f',
                    color: '#f5f5f7',
                    textAlign: 'center',
                    boxShadow: '0 24px 68px rgba(0, 0, 0, 0.48)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 12px',
                      borderRadius: 980,
                      background: 'rgba(0, 113, 227, 0.18)',
                      color: '#2997ff',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    OCR Visual Poster Specimen · High-Resolution Inspection
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 26,
                      marginTop: 18,
                      lineHeight: 1.38,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {reviewDetail.content.visionSummary?.ocrText ||
                      reviewDetail.latest.body}
                  </div>
                  <div
                    style={{
                      marginTop: 22,
                      paddingTop: 16,
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      justifyContent: 'center',
                      gap: 18,
                      fontSize: 12,
                      color: '#a1a1a6',
                    }}
                  >
                    <span>
                      Alt text:{' '}
                      <b style={{ color: '#f5f5f7' }}>
                        {reviewDetail.content.alt_text || 'Missing (WCAG G-5.1)'}
                      </b>
                    </span>
                    {reviewDetail.content.visionSummary && (
                      <span>
                        Contrast:{' '}
                        <b style={{ color: '#f5f5f7' }}>
                          {reviewDetail.content.visionSummary.minContrastRatio}:1
                        </b>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {imageZoomSafeZone && (
                <div className="img-zoom-safezone-overlay">
                  <span className="img-zoom-safezone-tag">
                    1.5x Brand Safe-Zone &amp; Clear-Space Boundary
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="img-zoom-footer">
            <div className="img-zoom-swatches">
              <span style={{ opacity: 0.72 }}>Reference Brand Palette:</span>
              {(['#1D1D1F', '#0071E3', '#F5F5F7'] as const).map((hex: string) => (
                <span key={hex} className="img-zoom-swatch-chip">
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: hex,
                      border: '1px solid rgba(255,255,255,0.35)',
                    }}
                  />
                  {hex}
                </span>
              ))}
              {reviewDetail.content.visionSummary && (
                <span className="img-zoom-swatch-chip">
                  Palette ΔE: {reviewDetail.content.visionSummary.paletteDistance}
                </span>
              )}
            </div>
            <div style={{ opacity: 0.72 }}>
              Scroll or press <b>+</b> / <b>−</b> to zoom · Double-click to toggle
              200% · Drag to pan when zoomed · Press <b>Esc</b> to exit
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
