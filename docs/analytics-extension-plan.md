# Analytics Extension Plan

## Executive Summary

The job application tracker has a **rich, well-designed data model** but **severely underutilized analytics**. Key findings:

- ✅ **Strong foundation**: Comprehensive tracking of applications, contacts, interviews, job boards, and detailed status history
- ❌ **Major gaps**: Contact data (0% analytics coverage) and Interview data (0% analytics coverage) despite full tracking
- ⚠️ **Opportunity**: The existing data can support 15+ new analytics metrics with no schema changes required

## Current State Assessment

### What Works Well
- 6 core metrics with professional Chart.js visualizations
- Clean date range filtering
- Status distribution and time-in-status analysis
- Source effectiveness tracking

### Critical Gaps

1. **Contact Analytics**: Full contact tracking (channel, role, response, outreach date) but zero analytics
2. **Interview Analytics**: Complete interview pipeline data but no metrics
3. **Relationship Analytics**: No correlation between contacts/interviews and success rates
4. **Funnel Analytics**: No conversion rate tracking through the application pipeline
5. **Remote Work Analysis**: `isRemote` field unused in analytics
6. **Job Board Granularity**: Only analyzing `sourceType`, not specific job boards

## Data Model Analysis

### Current Entities

**JobApplication** (`src/domain/entities/job-application.ts`)
- Identity: `id`, `createdAt`, `updatedAt`
- Core: `company`, `positionTitle`, `applicationDate`, `interestRating`, `nextEventDate`
- Source: `sourceType`, `jobBoardId`, `sourceNotes`, `isRemote`
- Status: `statusLog` (array of [timestamp, ApplicationStatus] tuples)
- Notes: `notes` (array of [NoteId, Note] tuples)

**Contact** (`src/domain/entities/contact.ts`)
- Identity: `id`, `jobApplicationId`, `createdAt`, `updatedAt`
- Info: `contactName`, `contactEmail`, `linkedInUrl`, `role`
- Outreach: `channel`, `outreachDate`, `responseReceived`, `notes`

**InterviewStage** (`src/domain/entities/interview-stage.ts`)
- Identity: `id`, `jobApplicationId`, `createdAt`, `updatedAt`
- Details: `round`, `interviewType`, `isFinalRound`
- Timeline: `scheduledDate`, `completedDate`
- Content: `notes`, `questions` (array of Question objects)

**JobBoard** (`src/domain/entities/job-board.ts`)
- Identity: `id`, `createdAt`
- Info: `name`, `rootDomain`, `domains`

### Data Underutilization

**Contact Data (ZERO analytics):**
- `responseReceived` boolean - Could track contact effectiveness
- `channel` - Could analyze which contact channels work best
- `role` - Could correlate role contacted with outcomes
- `outreachDate` - Could track time from outreach to response/offer
- Contact count per application - Could measure networking effort

**Interview Data (ZERO analytics):**
- `round` - Could track average rounds to offer
- `interviewType` - Could analyze which types lead to offers
- `isFinalRound` - Could track success rate after final rounds
- `scheduledDate` vs `completedDate` - Could track completion rates
- Time between rounds - Could identify process bottlenecks

**Application Data Underutilized:**
- `isRemote` - Could compare remote vs on-site success rates
- `jobBoardId` - Only sourceType analyzed, not specific boards
- `sourceNotes` - Not analyzed (qualitative data)
- Note count - Could indicate engagement level

---

## Phase 1: Contact & Interview Analytics (HIGH VALUE, LOW EFFORT)

### 1.1 Contact Effectiveness Dashboard

**New Metrics:**

```typescript
ContactAnalytics {
  totalContacts: number
  averageContactsPerApplication: number
  responseRateByChannel: {
    channel: ContactChannel
    total: number
    responses: number
    responseRate: number
  }[]
  responseRateByRole: {
    role: ContactRole
    total: number
    responses: number
    responseRate: number
  }[]
  averageDaysToResponse: number
  medianDaysToResponse: number
  applicationsWithContacts: number
  applicationsWithoutContacts: number
  contactCountCorrelation: {
    contactCount: number  // 0, 1, 2, 3+
    applications: number
    activeRate: number
    offerRate: number
    rejectionRate: number
  }[]
}
```

**Visualizations:**
- Bar chart: Response Rate by Channel (email, linkedin, phone, etc.)
- Bar chart: Response Rate by Contact Role (recruiter, hiring manager, etc.)
- Scatter plot: Contact Count vs Success Rate correlation
- Summary cards: Total contacts, Avg contacts per app, Avg response time

**Data Source:** `src/domain/ports/contact-repository.ts`

**Implementation Files:**
- Domain: `src/domain/use-cases/analytics-contacts.ts`
- Presentation: `src/presentation/pages/analytics-contacts.ts`
- Scripts: `src/presentation/scripts/contact-charts.js`
- Tests: `src/domain/use-cases/analytics-contacts.test.ts`

### 1.2 Interview Pipeline Analytics

**New Metrics:**

```typescript
InterviewAnalytics {
  totalInterviews: number
  averageRoundsToOffer: number
  medianRoundsToOffer: number
  interviewConversionRate: number  // apps with interviews → offers
  interviewTypeEffectiveness: {
    type: InterviewType
    total: number
    offers: number
    rejected: number
    successRate: number
  }[]
  roundAnalysis: {
    round: number
    total: number
    offers: number
    rejected: number
    stillActive: number
    successRate: number
  }[]
  finalRoundSuccess: {
    totalFinalRounds: number
    offers: number
    rejections: number
    conversionRate: number
  }
  averageDaysFromApplicationToFirstInterview: number
  medianDaysFromApplicationToFirstInterview: number
  averageDaysBetweenRounds: number
  interviewCompletionRate: {
    scheduled: number
    completed: number
    completionRate: number
  }
}
```

**Visualizations:**
- Funnel chart: Interview rounds → Offer conversion by round number
- Bar chart: Success Rate by Interview Type
- Line chart: Avg Days Between Interview Rounds
- Summary cards: Total interviews, Avg rounds to offer, Final round conversion

**Data Source:** `src/domain/ports/interview-stage-repository.ts`

**Implementation Files:**
- Domain: `src/domain/use-cases/analytics-interviews.ts`
- Presentation: `src/presentation/pages/analytics-interviews.ts`
- Scripts: `src/presentation/scripts/interview-charts.js`
- Tests: `src/domain/use-cases/analytics-interviews.test.ts`

---

## Phase 2: Relationship & Funnel Analytics (HIGH VALUE, MEDIUM EFFORT)

### 2.1 Application Funnel Analysis

**New Metrics:**

```typescript
FunnelAnalytics {
  stages: {
    stage: 'applied' | 'contacted' | 'responded' | 'interviewed' | 'final_round' | 'offered'
    count: number
    percentage: number  // % of total applications
    conversionFromPrevious: number  // % that made it from previous stage
  }[]
  dropoffPoints: {
    from: string
    to: string
    dropoffCount: number
    dropoffRate: number
  }[]
  averageTimePerStage: {
    stage: string
    avgDays: number
    medianDays: number
  }[]
}
```

**Visualizations:**
- Sankey/Funnel chart showing progression through stages
- Bar chart: Conversion rates between stages
- Heatmap: Drop-off points in the pipeline

### 2.2 Multi-Dimensional Correlation Analysis

**New Metrics:**

```typescript
CorrelationAnalytics {
  contactsVsOutcome: {
    contactRange: '0' | '1-2' | '3-5' | '6+'
    applications: number
    offerRate: number
    avgDaysToOffer: number
  }[]
  interviewsVsOutcome: {
    interviewCount: number
    applications: number
    offerRate: number
  }[]
  interestRatingVsEngagement: {
    rating: number
    avgContacts: number
    avgInterviews: number
    avgNotes: number
  }[]
  remoteVsOnsite: {
    isRemote: boolean
    total: number
    active: number
    offers: number
    offerRate: number
    avgTimeToOffer: number
  }
}
```

**Visualizations:**
- Grouped bar chart: Offer rate by contact count
- Grouped bar chart: Remote vs On-site success rates
- Correlation matrix showing relationships between variables

---

## Phase 3: Advanced Temporal & Predictive Analytics (MEDIUM VALUE, MEDIUM EFFORT)

### 3.1 Velocity & Trend Metrics

**New Metrics:**

```typescript
TrendAnalytics {
  applicationVelocity: {
    week: string  // ISO week
    count: number
    movingAverage: number
  }[]
  monthlyComparison: {
    month: string
    applications: number
    responses: number
    interviews: number
    offers: number
    responseRate: number
  }[]
  dayOfWeekPatterns: {
    dayOfWeek: string
    applications: number
    avgSuccessRate: number
  }[]
  seasonalTrends: {
    quarter: string
    applications: number
    offerRate: number
  }[]
}
```

**Visualizations:**
- Line chart: Application velocity with moving average
- Bar chart: Monthly metrics comparison
- Heatmap: Day of week application patterns

### 3.2 Predictive Indicators

**New Metrics:**

```typescript
PredictiveAnalytics {
  currentActiveApplications: {
    id: UUID
    company: string
    daysSinceApplication: number
    currentStatus: string
    daysInCurrentStatus: number
    expectedOutcomeDate: Date  // Based on historical medians
    likelyOutcome: 'offer' | 'rejection' | 'no_response'
    confidenceScore: number  // Based on historical patterns
  }[]
  stalledApplications: {
    id: UUID
    company: string
    status: string
    daysInStatus: number
    historicalMedianDays: number
    percentOverMedian: number
  }[]
  optimalFollowUpTiming: {
    status: string
    recommendedDaysToWait: number
    basedOnSampleSize: number
  }[]
}
```

**Visualizations:**
- Table: Active applications with predicted outcomes
- Alert cards: Stalled applications needing follow-up
- Timeline: Recommended follow-up schedule

---

## Phase 4: Job Board & Quality Analytics (LOW VALUE, LOW EFFORT)

### 4.1 Job Board Effectiveness

**New Metrics:**

```typescript
JobBoardAnalytics {
  byBoard: {
    boardName: string
    total: number
    active: number
    offers: number
    offerRate: number
    avgDaysToOffer: number
  }[]
  sourceTypeVsJobBoard: {
    sourceType: SourceType
    jobBoardBreakdown: {
      boardName: string
      count: number
      offerRate: number
    }[]
  }
}
```

**Visualizations:**
- Bar chart: Success rate by job board
- Stacked bar chart: Source type with job board breakdown

### 4.2 Application Quality Indicators

**New Metrics:**

```typescript
QualityAnalytics {
  withJobDescription: {
    total: number
    offerRate: number
  }
  withoutJobDescription: {
    total: number
    offerRate: number
  }
  withJobUrl: {
    total: number
    offerRate: number
  }
  noteEngagement: {
    noteCountRange: string  // '0', '1-2', '3-5', '6+'
    applications: number
    offerRate: number
  }
  dataEntryTimeliness: {
    sameDay: number
    within3Days: number
    moreThan3Days: number
    avgSuccessRateBucket: number
  }
}
```

---

## Database Optimizations

### Recommended Indexes

```sql
-- Application analytics indexes
CREATE INDEX IF NOT EXISTS idx_applications_remote ON job_applications(isRemote);
CREATE INDEX IF NOT EXISTS idx_applications_source ON job_applications(sourceType);
CREATE INDEX IF NOT EXISTS idx_applications_date_range
  ON job_applications(applicationDate, updatedAt);

-- Contact analytics indexes
CREATE INDEX IF NOT EXISTS idx_contacts_channel ON contacts(channel);
CREATE INDEX IF NOT EXISTS idx_contacts_role ON contacts(role);
CREATE INDEX IF NOT EXISTS idx_contacts_response
  ON contacts(responseReceived, outreachDate);

-- Interview analytics indexes
CREATE INDEX IF NOT EXISTS idx_interview_type ON interview_stages(interviewType);
CREATE INDEX IF NOT EXISTS idx_interview_round ON interview_stages(round);
CREATE INDEX IF NOT EXISTS idx_interview_final ON interview_stages(isFinalRound);
```

### Optional: Denormalized Computed Properties

```typescript
// Add to JobApplication entity (computed on read)
interface JobApplicationWithAnalytics extends JobApplication {
  readonly daysSinceApplication: number
  readonly daysInCurrentStatus: number
  readonly contactCount: number
  readonly interviewCount: number
  readonly noteCount: number
  readonly hasJobDescription: boolean
  readonly hasJobUrl: boolean
}
```

---

## UI/UX Improvements

### 1. Multi-Tab Analytics Dashboard

**Current:** Single page with all charts
**Proposed:** Tabbed interface with logical grouping

```
┌─────────────────────────────────────────────────────┐
│ [Overview] [Contact] [Interview] [Funnel] [Trends]  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Tab-specific content with focused visualizations   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Tabs:**
- **Overview**: Current 6 metrics (status, time, source, interest, response rate, timeline)
- **Contact Analysis**: Contact effectiveness, channel/role analysis, correlation
- **Interview Pipeline**: Round analysis, type effectiveness, timeline, funnel
- **Funnel & Conversion**: Application → Offer funnel, drop-off analysis
- **Trends & Predictions**: Velocity, monthly trends, predicted outcomes, stalled apps

### 2. Interactive Filtering

**Add filters:**
- ✅ Date range (exists)
- 🆕 Status category (active/inactive/all)
- 🆕 Source type multi-select
- 🆕 Job board multi-select
- 🆕 Remote/On-site/Both
- 🆕 Interest rating range
- 🆕 "Has contacts" / "Has interviews" toggles

### 3. Drill-Down Capability

**Enable clicking chart elements to see details:**
- Click status in pie chart → list of applications with that status
- Click source in bar chart → applications from that source
- Click interview round → applications at that round

### 4. Export & Reporting

**Add export options:**
- Export analytics data as JSON/CSV
- Generate PDF report
- Email scheduled analytics digest

### 5. Comparison Mode

**Add period comparison:**
- Compare current period vs previous period
- Show delta indicators (↑ +15%, ↓ -5%)
- Overlay previous period on charts

---

## Implementation Architecture

### File Organization

```
src/domain/use-cases/
├── analytics.ts                    # Core analytics (existing)
├── analytics-contacts.ts           # NEW: Contact analytics
├── analytics-interviews.ts         # NEW: Interview analytics
├── analytics-funnel.ts            # NEW: Funnel analytics
├── analytics-trends.ts            # NEW: Trend analytics
├── analytics-predictions.ts       # NEW: Predictive analytics
└── analytics-aggregator.ts        # NEW: Orchestrates all analytics

src/presentation/
├── pages/
│   ├── analytics-overview.ts      # Renamed from analytics.ts
│   ├── analytics-contacts.ts      # NEW: Contact tab
│   ├── analytics-interviews.ts    # NEW: Interview tab
│   ├── analytics-funnel.ts       # NEW: Funnel tab
│   └── analytics-trends.ts       # NEW: Trends tab
├── scripts/
│   ├── analytics-charts.js        # Existing
│   ├── contact-charts.js          # NEW
│   ├── interview-charts.js        # NEW
│   ├── funnel-charts.js          # NEW
│   └── trend-charts.js           # NEW
└── components/
    ├── analytics-tab-nav.ts       # NEW: Tab navigation
    ├── analytics-filters.ts       # NEW: Enhanced filters
    └── analytics-export.ts        # NEW: Export functionality

src/application/server/plugins/
└── analytics.plugin.ts            # Update routes for tabs
```

### New Routes

```typescript
GET /analytics                     # Overview tab (existing)
GET /analytics/contacts            # Contact analytics tab
GET /analytics/interviews          # Interview analytics tab
GET /analytics/funnel             # Funnel analytics tab
GET /analytics/trends             # Trends analytics tab
POST /analytics/export            # Export analytics data
```

### Architectural Principles

✅ **Hexagonal Architecture**: Keep analytics in domain layer
✅ **Dependency Inversion**: Inject repositories into use cases
✅ **Pure Functions**: Analytics computations remain side-effect-free
✅ **Result Types**: Continue using NeverThrow for error handling

---

## Testing Strategy

### Unit Tests (Domain Layer)

```typescript
// tests/domain/use-cases/analytics-contacts.test.ts
describe("computeContactAnalytics", () => {
  it("calculates response rate by channel correctly")
  it("correlates contact count with success rate")
  it("handles applications with no contacts")
  it("calculates average days to response")
})

// tests/domain/use-cases/analytics-interviews.test.ts
describe("computeInterviewAnalytics", () => {
  it("calculates average rounds to offer")
  it("computes interview type effectiveness")
  it("handles applications with no interviews")
  it("tracks interview completion rates")
})
```

### E2E Tests (Presentation Layer)

```typescript
// tests/e2e/analytics-contacts.test.ts
test("displays contact analytics tab", async ({ page }) => {
  await page.goto("/analytics/contacts")
  await expect(page.locator("#response-by-channel-chart")).toBeVisible()
})

// tests/e2e/analytics-interviews.test.ts
test("displays interview analytics tab", async ({ page }) => {
  await page.goto("/analytics/interviews")
  await expect(page.locator("#interview-funnel-chart")).toBeVisible()
})
```

---

## Implementation Timeline

### Phase 1: Foundation & Contact/Interview Analytics (2-3 weeks)
- [ ] Week 1: Add database indexes, create analytics aggregator, implement tab navigation
- [ ] Week 2: Implement contact analytics (domain + UI + tests)
- [ ] Week 3: Implement interview analytics (domain + UI + tests)

### Phase 2: Funnel & Correlation Analytics (2 weeks)
- [ ] Week 4: Implement funnel analytics (domain + UI + tests)
- [ ] Week 5: Implement correlation analytics (domain + UI + tests)

### Phase 3: Trends & Predictions (2 weeks)
- [ ] Week 6: Implement trend analytics (domain + UI + tests)
- [ ] Week 7: Implement predictive analytics (domain + UI + tests)

### Phase 4: Job Board & Quality Analytics (1 week)
- [ ] Week 8: Implement job board and quality analytics

### Phase 5: Polish & Export (1 week)
- [ ] Week 9: Enhanced filtering, export functionality, drill-down, comparison mode

**Total: 8-9 weeks for complete implementation**

---

## Success Metrics

**Measure success by:**
1. **Coverage**: Analytics utilizing 90%+ of stored data fields
2. **Actionability**: At least 3 new actionable insights per user
3. **Performance**: Analytics page loads in <500ms
4. **Test Coverage**: Maintain 95%+ test coverage
5. **User Value**: Enable data-driven job search optimization

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance degradation with large datasets | High | Add database indexes, implement pagination, add caching layer |
| Chart.js bundle size increase | Medium | Use tree-shaking, lazy-load chart types, consider alternatives |
| Breaking existing analytics | High | Comprehensive test coverage, feature flags for new analytics |
| Complex calculations slow page load | Medium | Move heavy calculations to background job, show loading states |
| UI becomes cluttered | Medium | Thoughtful tab organization, progressive disclosure |

---

## Conclusion

This plan extends the job application tracker from **basic metrics** to a **comprehensive analytics platform** that:

- ✅ Utilizes 90%+ of the existing data model
- ✅ Adds 15+ new analytics dimensions
- ✅ Requires no breaking schema changes
- ✅ Maintains hexagonal architecture principles
- ✅ Provides actionable insights for job seekers

**The data is already there—let's unlock its value!** 🚀
