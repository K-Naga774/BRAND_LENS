import {
  ContentItem,
  ContentVersion,
  Finding,
  WorkspaceUser,
} from '../engine/types';

export interface AnalysisReportPayload {
  reportTitle: string;
  generatedAt: string;
  workspace: string;
  evaluatedBy: {
    name: string;
    email: string;
    role: string;
  };
  metrics: {
    overallScore: number;
    matchingPercentage: string;
    openFindingsCount: number;
    highSeverityCount: number;
    mediumSeverityCount: number;
    lowSeverityCount: number;
    routingTarget: string;
    piiTokensRedacted: number;
  };
  content: {
    id: number;
    title: string;
    channel: string;
    kind: string;
    version: number;
    body: string;
    redactedBody: string;
    visionSummary?: ContentItem['visionSummary'];
  };
  engine: {
    provider: string;
    model: string;
  };
  findings: Array<{
    id: number;
    ruleId: string;
    category: string;
    severity: string;
    status: string;
    span: string;
    confidence: number;
    semanticScore?: number;
    message: string;
    suggestion: string;
    replacement?: string;
  }>;
}

export function buildAnalysisReportPayload(params: {
  workspaceName: string;
  currentUser: WorkspaceUser;
  overallScore: number;
  matchingPercentage: string;
  content: ContentItem;
  latest: ContentVersion;
  provider: string;
  model: string;
  findings: Finding[];
}): AnalysisReportPayload {
  const openFindings = params.findings.filter((f) => f.status === 'open');
  return {
    reportTitle: `BrandLens Analysis Report — ${params.content.title}`,
    generatedAt:
      new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC',
    workspace: params.workspaceName,
    evaluatedBy: {
      name: params.currentUser.name,
      email: params.currentUser.email,
      role: params.currentUser.role,
    },
    metrics: {
      overallScore: params.overallScore,
      matchingPercentage: `${params.matchingPercentage}%`,
      openFindingsCount: openFindings.length,
      highSeverityCount: openFindings.filter((f) => f.severity === 'high')
        .length,
      mediumSeverityCount: openFindings.filter((f) => f.severity === 'medium')
        .length,
      lowSeverityCount: openFindings.filter((f) => f.severity === 'low').length,
      routingTarget: params.content.route,
      piiTokensRedacted: params.content.redactionSummary?.items.length || 0,
    },
    content: {
      id: params.content.id,
      title: params.content.title,
      channel: params.content.channel,
      kind: params.content.kind,
      version: params.latest.n,
      body: params.latest.body,
      redactedBody: params.latest.redacted_body,
      visionSummary: params.content.visionSummary,
    },
    engine: {
      provider: params.provider,
      model: params.model,
    },
    findings: params.findings.map((f) => ({
      id: f.id,
      ruleId: f.rule_id,
      category: f.category,
      severity: f.severity,
      status: f.status,
      span: f.span,
      confidence: Number((f.confidence * 100).toFixed(1)),
      semanticScore: f.semanticScore
        ? Number((f.semanticScore * 100).toFixed(1))
        : undefined,
      message: f.message,
      suggestion: f.suggestion,
      replacement: f.replacement,
    })),
  };
}

function escapePdfString(input: string): string {
  return input
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapTextLines(text: string, maxChars = 84): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

export function generateBrandLensPdfString(
  payload: AnalysisReportPayload
): string {
  const ops: string[] = [];
  ops.push('0 0.443 0.890 rg');
  ops.push('48 776 516 3 re f');

  let y = 752;
  const drawText = (
    text: string,
    x: number,
    yPos: number,
    font = 'F1',
    size = 10,
    rgb: [number, number, number] = [0.114, 0.114, 0.122]
  ) => {
    ops.push(`${rgb[0]} ${rgb[1]} ${rgb[2]} rg`);
    ops.push(
      `BT /${font} ${size} Tf ${x} ${yPos} Td (${escapePdfString(text)}) Tj ET`
    );
  };

  drawText('Brand', 48, y, 'F2', 14, [0.114, 0.114, 0.122]);
  drawText('Lens', 89, y, 'F2', 14, [0, 0.443, 0.89]);
  drawText('— REAL ANALYSIS REPORT', 128, y, 'F2', 10, [0.43, 0.43, 0.45]);
  y -= 22;

  drawText(payload.content.title.slice(0, 72), 48, y, 'F2', 16, [
    0.114, 0.114, 0.122,
  ]);
  y -= 14;
  drawText(
    `Channel: ${payload.content.channel}   |   Content Type: ${payload.content.kind.toUpperCase()}`,
    48,
    y,
    'F1',
    9,
    [0.43, 0.43, 0.45]
  );
  y -= 12;
  ops.push(`0.88 0.88 0.90 RG 0.8 w 48 ${y} m 564 ${y} l S`);
  y -= 18;

  drawText('1. ANALYZED CONTENT', 48, y, 'F2', 10, [0.114, 0.114, 0.122]);
  y -= 14;
  const bodyLines = wrapTextLines(payload.content.body, 88).slice(0, 7);
  for (const line of bodyLines) {
    drawText(line, 48, y, 'F1', 9.5, [0.18, 0.18, 0.2]);
    y -= 13;
  }

  y -= 8;
  ops.push(`0.88 0.88 0.90 RG 0.8 w 48 ${y} m 564 ${y} l S`);
  y -= 18;
  drawText(
    `2. ANALYSIS FINDINGS & RECOMMENDED FIXES (${payload.findings.length})`,
    48,
    y,
    'F2',
    10,
    [0.114, 0.114, 0.122]
  );
  y -= 16;

  if (payload.findings.length === 0) {
    drawText(
      '100% Brand Compliant — Zero violations detected across rules, facts, and claim ledger.',
      48,
      y,
      'F1',
      9.5,
      [0.02, 0.58, 0.4]
    );
  } else {
    for (const f of payload.findings.slice(0, 9)) {
      if (y < 140) break;
      drawText(
        `[${f.severity.toUpperCase()}] Rule ${f.ruleId} (${f.category}) — Flagged Span: "${f.span}"`.slice(
          0,
          94
        ),
        48,
        y,
        'F2',
        9.5,
        [0.114, 0.114, 0.122]
      );
      y -= 12;
      const fixLines = wrapTextLines(
        `Issue: ${f.message} | Fix: ${
          f.replacement ? `"${f.span}" -> "${f.replacement}"` : f.suggestion
        }`,
        92
      ).slice(0, 2);
      for (const line of fixLines) {
        drawText(line, 56, y, 'F1', 8.5, [0.35, 0.35, 0.38]);
        y -= 11;
      }
      y -= 7;
    }
  }

  ops.push('0.96 0.96 0.97 rg');
  ops.push('48 52 516 64 re f');
  ops.push('0.82 0.82 0.85 RG 0.8 w');
  ops.push('48 52 516 64 re S');
  drawText('SUPPLEMENTARY METRICS & ACCURACY SUMMARY', 58, 100, 'F2', 8, [
    0, 0.443, 0.89,
  ]);
  drawText(
    `Accuracy / Rule Match: ${payload.metrics.matchingPercentage}     |     Overall Score: ${payload.metrics.overallScore} / 100     |     Open Issues: ${payload.metrics.openFindingsCount} (${payload.metrics.highSeverityCount} High)`,
    58,
    84,
    'F2',
    9.5,
    [0.114, 0.114, 0.122]
  );
  drawText(
    `Workspace: ${payload.workspace}   |   Approval Route: ${payload.metrics.routingTarget.toUpperCase()}   |   Version: v${payload.content.version}   |   Generated: ${payload.generatedAt}`,
    58,
    66,
    'F1',
    8,
    [0.43, 0.43, 0.45]
  );

  const streamContent = ops.join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj',
    `6 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return pdf;
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
