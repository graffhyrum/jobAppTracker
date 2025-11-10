# Test Failure Root Cause Analysis

## Executive Summary

**Total Expected Failures:** ~35-40 tests
**Implementation Errors:** 4 critical bugs
**Test Errors:** 1 critical environment issue

---

## 🔴 CRITICAL: Content Script Tests (All ~30 tests BLOCKED)

### Issue #1: Chrome API Undefined in Test Environment

**Category:** TEST ERROR
**Severity:** CRITICAL
**Impact:** All content script tests fail immediately
**Location:** `extension/content/extractor.test.ts` (lines 15-49, all tests affected)

**Problem:**
```javascript
// extractor.js line 168-174
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractJobData') {
    const data = extractJobData();
    sendResponse({ success: true, data });
  }
  return true;
});
```

When the test uses `eval()` to load `extractor.js`, this listener code executes immediately. The `chrome` global doesn't exist in happy-dom/Node environment.

**Expected Error:**
```
ReferenceError: chrome is not defined
  at eval (extractor.js:168)
  at beforeEach (extractor.test.ts:41)
```

**Fix Required:**
- Wrap Chrome API call in conditional: `if (typeof chrome !== 'undefined')`
- OR: Extract testable functions to separate module
- OR: Mock `chrome` global in test setup

---

## 🔴 CRITICAL: API Implementation Bugs

### Issue #2: Field Name Mismatch - "position" vs "positionTitle"

**Category:** IMPLEMENTATION ERROR
**Severity:** CRITICAL
**Impact:** All API tests expecting "position" field will fail (10+ tests)
**Location:** `src/application/server/plugins/extension-api.plugin.ts:86`

**Problem:**
```typescript
// Line 86 - WRONG
const applicationData = {
  company: body.company,
  position: body.position,  // ❌ Domain schema expects 'positionTitle'
  ...
```

**Domain Schema Requirement:**
```typescript
// job-application.ts:35-36
RequiredBaseProps: {
  company: "string > 0",
  positionTitle: "string > 0",  // ✅ Must be 'positionTitle'
  ...
```

**Affected Tests:**
- ✅ "should create application with valid API key"
- ✅ "should create application with minimal required fields"
- ✅ "should create application with all optional fields"
- ✅ All tests sending valid data

**Expected Error:**
```
ArkType validation error: positionTitle must be defined (string > 0)
```

**Fix:**
```typescript
positionTitle: body.position,  // Map 'position' to 'positionTitle'
```

---

### Issue #3: Missing Required Field - "sourceType"

**Category:** IMPLEMENTATION ERROR
**Severity:** CRITICAL
**Impact:** All API creation tests fail (20+ tests)
**Location:** `src/application/server/plugins/extension-api.plugin.ts:84-98`

**Problem:**
```typescript
// Missing required field
const applicationData = {
  company: body.company,
  position: body.position,
  // ❌ sourceType is REQUIRED but not provided
  ...
```

**Domain Schema Requirement:**
```typescript
// job-application.ts:48
BaseProps: {
  sourceType: "SourceType",  // ✅ REQUIRED (no ? optional marker)
  ...
```

**Expected Error:**
```
ArkType validation error: sourceType must be defined ('job_board'|'referral'|'company_website'|'recruiter'|'networking'|'other')
```

**Fix:**
```typescript
const applicationData = {
  company: body.company,
  positionTitle: body.position,
  sourceType: 'job_board' as const,  // Default for browser extension
  ...
```

---

### Issue #4: Missing Required Field - "isRemote"

**Category:** IMPLEMENTATION ERROR
**Severity:** CRITICAL
**Impact:** All API creation tests fail (20+ tests)
**Location:** `src/application/server/plugins/extension-api.plugin.ts:84-98`

**Problem:**
```typescript
// Missing required field
const applicationData = {
  company: body.company,
  position: body.position,
  // ❌ isRemote is REQUIRED but not provided
  ...
```

**Domain Schema Requirement:**
```typescript
// job-application.ts:51
BaseProps: {
  isRemote: "boolean",  // ✅ REQUIRED (no ? optional marker)
  ...
```

**Expected Error:**
```
ArkType validation error: isRemote must be defined (boolean)
```

**Fix:**
```typescript
const applicationData = {
  company: body.company,
  positionTitle: body.position,
  sourceType: 'job_board' as const,
  isRemote: false,  // Default assumption, or extract from job posting
  ...
```

---

### Issue #5: Incorrect Method Name - "forCreation" vs "forCreate"

**Category:** IMPLEMENTATION ERROR
**Severity:** CRITICAL
**Impact:** All API tests fail with TypeScript/runtime error
**Location:** `src/application/server/plugins/extension-api.plugin.ts:102`

**Problem:**
```typescript
// Line 102 - WRONG
const validationResult =
  jobApplicationModule.forCreation(applicationData);  // ❌ No such method
```

**Actual Schema Export:**
```typescript
// job-application.ts:61
forCreate: "BaseProps",  // ✅ Correct name
```

**Expected Error:**
```
TypeError: jobApplicationModule.forCreation is not a function
```

**Fix:**
```typescript
const validationResult =
  jobApplicationModule.forCreate(applicationData);  // ✅
```

---

### Issue #6: Status Field Type Mismatch

**Category:** IMPLEMENTATION ERROR
**Severity:** MEDIUM
**Impact:** Tests passing status will fail validation
**Location:** `src/application/server/plugins/extension-api.plugin.ts:87`

**Problem:**
```typescript
// Line 87 - WRONG TYPE
status: body.status || "applied",  // ❌ String, but schema expects object
```

**Domain Schema Requirement:**
```typescript
// job-application.ts:24
ApplicationStatus: "(ActiveState|InactiveState) & ApplicationStatusProps"

// Where ActiveState is:
{
  category: "'active'",
  label: "ActiveLabels"
}
```

**Expected Error:**
```
ArkType validation error: ApplicationStatus must be an object with category and label
```

**Fix:**
Status should not be in the `forCreate` data - it's managed internally via `createJobApplicationWithInitialStatus`. Remove this field entirely from extension API.

---

## 📊 Test Failure Triage

### Category: BLOCKED (Cannot Run)
**Count:** ~30 tests
**Files:** `extension/content/extractor.test.ts`
**Fix Priority:** P0 - Must fix before any tests can run
**Owner:** Test infrastructure
**Estimated Fix Time:** 30 minutes

### Category: IMPLEMENTATION BUGS
**Count:** 20+ tests (all API tests)
**Files:** `src/application/server/plugins/extension-api.plugin.test.ts`
**Fix Priority:** P0 - Core functionality broken
**Owner:** API implementation
**Estimated Fix Time:** 2 hours (includes testing)

**Specific Tests Expected to Fail:**
1. ✅ "should create application with valid API key" - Missing fields + wrong method
2. ✅ "should create application with minimal required fields" - Missing fields
3. ✅ "should create application with all optional fields" - Field name mismatch
4. ✅ "should default status to 'applied' when not provided" - Status type mismatch
5. ✅ "should accept different valid status values" - Status type mismatch
6. ✅ "should handle empty company name validation" - May work, depends on ArkType
7. ✅ "should handle empty position name validation" - Field name mismatch
8. ✅ "should handle invalid interest rating" - Missing required fields mask this
9. ✅ "should handle invalid status value" - Status type mismatch
10. ✅ "should preserve special characters" - Field name + missing fields
11. ✅ "should handle very long job descriptions" - Missing required fields
12. ✅ "should handle URLs with query parameters" - Missing required fields
13. ✅ "should handle concurrent requests" - All will fail due to missing fields

**Tests That May Pass:**
- ✅ "GET /api/health" - No dependencies on broken code
- ✅ "should reject request without API key" - Fails auth before validation
- ✅ "should reject request with invalid API key" - Fails auth before validation
- ⚠️  "should not allow CORS from non-extension origins" - Depends on CORS middleware
- ⚠️  "should use default dev-api-key when environment variable not set" - Auth-only test

---

## 🛠️ Recommended Fix Order

### Phase 1: Unblock Tests (30 min)
1. Fix Chrome API issue in extractor.js
   ```javascript
   // Add conditional check
   if (typeof chrome !== 'undefined') {
     chrome.runtime.onMessage.addListener(...);
   }
   ```

### Phase 2: Fix API Implementation (2 hours)
1. Fix field name: `position` → `positionTitle`
2. Add required field: `sourceType: 'job_board'`
3. Add required field: `isRemote: false`
4. Fix method name: `forCreation()` → `forCreate()`
5. Remove status field handling (not needed for creation)

### Phase 3: Update Extension Schema (30 min)
1. Update `extensionCreateApplicationSchema` to match fixed implementation
2. Add validation tests for new required fields

### Phase 4: Verify (1 hour)
1. Run all tests
2. Fix any remaining edge cases
3. Update documentation

**Total Estimated Fix Time:** 4 hours

---

## 📝 Additional Notes

### Schema Incompatibility
The extension API schema accepts:
```typescript
{
  company: string,
  position: string,
  status?: string,
  ...
}
```

But the domain requires:
```typescript
{
  company: string,
  positionTitle: string,
  sourceType: 'job_board' | ...,
  isRemote: boolean,
  applicationDate: Date,
  // NO status field for creation
}
```

This mismatch needs to be bridged in the API handler with proper transformation and defaults.

### Test Coverage Impact
Once fixed, test coverage should be excellent:
- 30+ content script extraction tests
- 20+ API endpoint tests
- Edge cases for validation, CORS, auth
- Concurrent request handling

All major code paths will be tested.
