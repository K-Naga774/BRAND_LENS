import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BRAND_PACKS,
  redactPII,
  runBrandGovernancePipeline,
  wcagContrastRatio,
} from '../src/engine/governanceEngine.ts';
import {
  CLOUD_INTELLIGENCE_API_KEY_PLACEHOLDER,
  CLOUD_INTELLIGENCE_CONNECTED_EMAIL,
  resolveCloudIntelligenceConfig,
  verifyCloudIntelligenceConnection,
} from '../src/engine/cloudIntelligence.ts';

test('Cloud Intelligence config binds to ssmb71110@gmail.com and exposes API key placeholder', async () => {
  const cfg = resolveCloudIntelligenceConfig();
  assert.equal(cfg.connectedEmail, 'ssmb71110@gmail.com');
  assert.equal(CLOUD_INTELLIGENCE_CONNECTED_EMAIL, 'ssmb71110@gmail.com');
  assert.equal(cfg.apiKeyEnvVar, 'CLOUD_INTELLIGENCE_API_KEY');
  assert.equal(cfg.placeholderConfigured, true);
  assert.ok(CLOUD_INTELLIGENCE_API_KEY_PLACEHOLDER.includes('PLACEHOLDER'));

  const status = await verifyCloudIntelligenceConnection('ssmb71110@gmail.com');
  assert.equal(status.ok, true);
  assert.equal(status.connectedEmail, 'ssmb71110@gmail.com');
  assert.ok(status.message.includes('ssmb71110@gmail.com'));
});

test('redactPII masks emails and phone numbers before Cloud Intelligence analysis', () => {
  const summary = redactPII(
    'Reach out to ssmb71110@gmail.com or +91 98765 43210 for onboarding.'
  );
  assert.ok(!summary.redactedText.includes('ssmb71110@gmail.com'));
  assert.ok(summary.redactedText.includes('[REDACTED_EMAIL_1]'));
  assert.equal(summary.items.length, 2);
});

test('wcagContrastRatio computes accurate luminance contrast ratios', () => {
  const bw = wcagContrastRatio('#000000', '#FFFFFF');
  assert.equal(bw, 21);
  const low = wcagContrastRatio('#FDE047', '#FFFFFF');
  assert.ok(low < 4.5);
});

test('runBrandGovernancePipeline detects terminology, claim ledger, fact, and tone violations with Cite-or-Drop', () => {
  const pack = BRAND_PACKS['acme-pay'];
  const result = runBrandGovernancePipeline({
    pack,
    text: 'AcmePay is the #1 fastest in India and costs 40% less! Now accepting Bitcoin with REVOLUTIONARY speed!',
    kind: 'text',
    useSemanticAI: true,
    redactBeforeAI: true,
  });

  assert.equal(result.route, 'reviewer');
  assert.ok(result.findings.length >= 3);
  assert.ok(result.findings.some((f) => f.rule_id === 'G-1.1'));
  assert.ok(result.findings.some((f) => f.rule_id === 'E-2'));
  assert.ok(result.findings.some((f) => f.rule_id === 'G-2.1'));
  assert.ok(result.findings.some((f) => f.rule_id === 'F-2'));
});
