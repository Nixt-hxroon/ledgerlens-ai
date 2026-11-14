import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting LedgerLens AI Automated API Integration Test Suite...\n');

  let testUserToken = '';
  let testUserId = '';
  let validInvoiceId = '';
  let purchaseOrderId = '';
  let discrepancyInvoiceId = '';

  // TEST 1: Health check
  console.log('Test 1: Health Check Endpoint');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = await healthRes.json();
  assert.strictEqual(healthRes.status, 200, 'Health check should return 200');
  assert.strictEqual(healthData.status, 'healthy');
  console.log('✅ Health check passed.\n');

  // TEST 2: User Registration
  console.log('Test 2: User Registration');
  const testEmail = `tester_${Date.now()}@ledgerlens.ai`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Lead AI Auditor',
      email: testEmail,
      password: 'AuditSecurePassword123!',
    }),
  });
  const regData = await regRes.json();
  assert.strictEqual(regRes.status, 201, 'Registration should return 201 Created');
  assert.ok(regData.data.tokens.accessToken, 'Access token must be returned');
  testUserToken = regData.data.tokens.accessToken;
  testUserId = regData.data.user.id;
  console.log(`✅ User registered successfully (${testEmail}).\n`);

  // TEST 3: User Login
  console.log('Test 3: User Login');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'AuditSecurePassword123!',
    }),
  });
  const loginData = await loginRes.json();
  assert.strictEqual(loginRes.status, 200, 'Login should return 200');
  assert.ok(loginData.data.tokens.accessToken);
  console.log('✅ User login succeeded with JWT.\n');

  // TEST 4: Reject Invalid Credentials
  console.log('Test 4: Reject Invalid Credentials');
  const badLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'WrongPassword!',
    }),
  });
  assert.strictEqual(badLogin.status, 401, 'Invalid password should return 401');
  console.log('✅ Rejected invalid credentials properly.\n');

  // Helper for authenticated requests
  const authHeaders = { Authorization: `Bearer ${testUserToken}` };

  // TEST 5: Upload Valid Invoice Document
  console.log('Test 5: Ingest & Process Valid Invoice');
  const invoicePdfPath = path.resolve(__dirname, '../sample_data/sample_invoice_valid.pdf');
  const invoiceBuffer = fs.readFileSync(invoicePdfPath);

  const form1 = new FormData();
  form1.append('file', new Blob([invoiceBuffer], { type: 'application/pdf' }), 'sample_invoice_valid.pdf');

  const uploadInvRes = await fetch(`${BASE_URL}/documents`, {
    method: 'POST',
    headers: authHeaders,
    body: form1,
  });
  const uploadInvData = await uploadInvRes.json();
  assert.strictEqual(uploadInvRes.status, 201, 'Upload should return 201');
  assert.strictEqual(uploadInvData.data.document_type, 'Invoice');
  validInvoiceId = uploadInvData.data.id;
  console.log(`✅ Valid invoice ingested and classified as "${uploadInvData.data.document_type}" (ID: ${validInvoiceId}).\n`);

  // TEST 6: Upload Matching Purchase Order
  console.log('Test 6: Ingest & Process Matching Purchase Order');
  const poPdfPath = path.resolve(__dirname, '../sample_data/sample_purchase_order.pdf');
  const poBuffer = fs.readFileSync(poPdfPath);

  const form2 = new FormData();
  form2.append('file', new Blob([poBuffer], { type: 'application/pdf' }), 'sample_purchase_order.pdf');

  const uploadPoRes = await fetch(`${BASE_URL}/documents`, {
    method: 'POST',
    headers: authHeaders,
    body: form2,
  });
  const uploadPoData = await uploadPoRes.json();
  assert.strictEqual(uploadPoRes.status, 201);
  assert.strictEqual(uploadPoData.data.document_type, 'Purchase Order');
  purchaseOrderId = uploadPoData.data.id;
  console.log(`✅ Purchase Order ingested and classified as "${uploadPoData.data.document_type}" (ID: ${purchaseOrderId}).\n`);

  // TEST 7: Upload Discrepancy Invoice to test Validation Anomaly Engine
  console.log('Test 7: Ingest Invoice with Calculation & Due Date Discrepancies');
  const discPdfPath = path.resolve(__dirname, '../sample_data/sample_invoice_discrepancy.pdf');
  const discBuffer = fs.readFileSync(discPdfPath);

  const form3 = new FormData();
  form3.append('file', new Blob([discBuffer], { type: 'application/pdf' }), 'sample_invoice_discrepancy.pdf');

  const uploadDiscRes = await fetch(`${BASE_URL}/documents`, {
    method: 'POST',
    headers: authHeaders,
    body: form3,
  });
  const uploadDiscData = await uploadDiscRes.json();
  assert.strictEqual(uploadDiscRes.status, 201);
  discrepancyInvoiceId = uploadDiscData.data.id;
  console.log(`✅ Discrepancy invoice ingested (Status: ${uploadDiscData.data.validation_status}).\n`);

  // TEST 8: Check Validation Center findings
  console.log('Test 8: Query Validation Center Issues');
  const valIssuesRes = await fetch(`${BASE_URL}/validation`, { headers: authHeaders });
  const valIssuesData = await valIssuesRes.json();
  assert.strictEqual(valIssuesRes.status, 200);
  assert.ok(valIssuesData.data.totalIssues > 0, 'Validation issues should be detected for discrepancy file');
  console.log(`✅ Validation Center successfully flagged ${valIssuesData.data.totalIssues} anomaly alert(s).\n`);

  // TEST 9: Cross-Document Reconciliation (Invoice vs PO)
  console.log('Test 9: Cross-Document Intelligence Reconciliation');
  const compRes = await fetch(`${BASE_URL}/comparisons`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoice_id: validInvoiceId,
      purchase_order_id: purchaseOrderId,
    }),
  });
  const compData = await compRes.json();
  assert.strictEqual(compRes.status, 201);
  const compSummary = compData.data.comparison_result.summary;
  console.log(`✅ Cross-document reconciliation result: "${compSummary.match_status}"`);
  console.log(`   Vendor matches: ${compSummary.vendor.matches}`);
  console.log(`   Totals difference: $${compSummary.totals.difference}\n`);

  // TEST 10: Grounded AI Natural Language Q&A
  console.log('Test 10: Grounded Natural Language Q&A');
  const askRes = await fetch(`${BASE_URL}/insights/ask`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: 'What is the total value of all uploaded invoices?',
    }),
  });
  const askData = await askRes.json();
  assert.strictEqual(askRes.status, 200);
  assert.ok(askData.data.answer.length > 10);
  console.log(`✅ Q&A Output: "${askData.data.answer}"\n`);

  // TEST 11: Dashboard Metrics API
  console.log('Test 11: Dashboard Aggregated Analytics API');
  const dashRes = await fetch(`${BASE_URL}/analytics/dashboard`, { headers: authHeaders });
  const dashData = await dashRes.json();
  assert.strictEqual(dashRes.status, 200);
  assert.ok(dashData.data.summary.totalDocuments >= 3);
  console.log(`✅ Dashboard verified: ${dashData.data.summary.totalDocuments} docs, Total Value: $${dashData.data.summary.totalInvoiceValue}\n`);

  console.log('🎉 ALL 11 END-TO-END INTEGRATION TESTS PASSED CLEANLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
