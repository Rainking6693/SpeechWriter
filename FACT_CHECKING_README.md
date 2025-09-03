# Fact Checking & Risk Assessment System

## 🎯 Overview

This implementation completes **Section 6** of the SpeechWriter project plan, providing comprehensive fact checking, risk assessment, and content quality tools to ensure speech safety and quality.

## 📋 Implemented Features

### ✅ 6.1 Named Entity Recognition & Quote Source
- **Named Entity Detection**: Identifies people, organizations, locations, dates, money amounts, percentages, and other entities
- **Quote Detection**: Finds quotes, statements, and claims that need attribution
- **Link-out Suggestions**: Provides verification URLs for Wikipedia, Google, IMDb, Crunchbase, etc.
- **Confidence Scoring**: AI-powered confidence levels for each detection
- **Source Prompts**: Intelligent suggestions for quote attribution and fact verification

### ✅ 6.2 High-Risk Claims & Sensitive Topics  
- **Risk Classification**: Identifies medical, legal, financial, and unsubstantiated claims
- **Sensitive Lexicon**: Comprehensive database covering political, religious, controversial, medical, financial, and legal topics
- **Verification Panel**: Interactive UI for acknowledging and addressing flagged content
- **Export Blocking**: Prevents export until critical issues are acknowledged
- **Risk Scoring**: Multi-level risk assessment (LOW, MEDIUM, HIGH, CRITICAL)

### ✅ 6.3 Cliché Detection & Plagiarism Prevention
- **Advanced Cliché Detection**: Trie-based phrase matching + AI contextual analysis
- **Comprehensive Database**: 100+ clichés organized by category (business, motivational, general, redundant)
- **Density Calculation**: Precise metrics with 0.8/100 token threshold
- **Rewrite Suggestions**: AI-powered alternatives for flagged phrases
- **Plagiarism Scanning**: Similarity detection against common patterns
- **Quality Scoring**: Combined freshness, originality, and factual safety metrics

## 🔧 Technical Architecture

### API Endpoints

#### 1. `/api/fact-check-ner` - Named Entity Recognition
```typescript
POST /api/fact-check-ner
{
  "text": "speech content",
  "speechId": "optional-id",
  "options": {}
}
```

**Response**: Entities, quotes, verification links, recommendations

#### 2. `/api/risk-assessment` - Content Risk Analysis
```typescript
POST /api/risk-assessment
{
  "text": "speech content", 
  "speechId": "optional-id",
  "options": {}
}
```

**Response**: Risk level, flagged claims, sensitive topics, verification panel data

#### 3. `/api/cliche-plagiarism-scan` - Content Quality Check
```typescript
POST /api/cliche-plagiarism-scan
{
  "text": "speech content",
  "speechId": "optional-id", 
  "options": {}
}
```

**Response**: Cliché analysis, plagiarism results, rewrite suggestions, quality metrics

#### 4. `/api/comprehensive-fact-check` - Complete Analysis
```typescript
POST /api/comprehensive-fact-check
{
  "text": "speech content",
  "speechId": "optional-id",
  "options": {}
}
```

**Response**: Combined analysis, export readiness, verification panel, action plan

### Core Utilities

#### `fact-checking-utils.ts`
- Named Entity Recognition using OpenAI GPT-4
- Quote detection and attribution suggestions  
- Risk assessment with pattern matching + AI analysis
- Sensitive topic detection using lexicon
- Database integration for analysis storage

#### `cliche-detection-utils.ts`
- Trie data structure for efficient phrase matching
- Comprehensive cliché database (100+ phrases)
- AI-powered contextual cliché detection
- Similarity analysis for plagiarism detection
- Rewrite suggestion generation

#### `humanization-utils.ts` (Enhanced)
- Extended with fact checking analysis storage
- Integration with existing stylometry and critic systems
- Consistent database schema usage

### Frontend Components

#### `VerificationPanel.tsx`
- Interactive verification workflow UI
- Section-based organization (Risk, Facts, Quality)
- Progress tracking and acknowledgment system
- Export blocking enforcement
- Link integration for external verification

## 🎯 Quality Gates & Thresholds

### Export Blocking Conditions
- **CRITICAL Risk Level**: Medical, legal, or financial claims
- **Unacknowledged High-Risk Content**: Requires user acknowledgment
- **Extreme Plagiarism**: Similarity score > 80%

### Quality Thresholds  
- **Cliché Density**: Must be ≤ 0.8 per 100 tokens
- **Plagiarism Similarity**: Should be < 70% 
- **Entity Confidence**: Low confidence entities flagged for verification
- **Quote Attribution**: All quotes requiring sources identified

### Scoring System
- **Overall Quality Score**: Weighted average of freshness (35%), originality (25%), factual safety (40%)
- **Risk Score**: 1-10 scale based on claim types and sensitive content
- **Grade Assignment**: A+ to F based on combined metrics

## 🚀 Usage Examples

### Basic Fact Checking
```javascript
const response = await fetch('/api/fact-check-ner', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "As Einstein said, 'Innovation is key to success.'",
    speechId: 'speech-123'
  })
})

const { data } = await response.json()
// data.entities: [{ text: "Einstein", type: "PERSON", suggestedLinks: [...] }]
// data.quotes: [{ text: "Innovation is key...", needsAttribution: true }]
```

### Risk Assessment
```javascript
const riskResponse = await fetch('/api/risk-assessment', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "Our supplement cures depression in 30 days guaranteed.",
    speechId: 'speech-123'
  })
})

const { data } = await riskResponse.json()
// data.riskAssessment.riskLevel: "CRITICAL"
// data.exportBlocked: true
// data.verificationPanel: { sections: [...] }
```

### Content Quality Analysis
```javascript
const qualityResponse = await fetch('/api/cliche-plagiarism-scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "At the end of the day, we need to think outside the box.",
    speechId: 'speech-123'
  })
})

const { data } = await qualityResponse.json()
// data.clicheAnalysis.density: 15.38 (above 0.8 threshold)
// data.clicheAnalysis.suggestions: [{ originalText: "think outside the box", alternatives: [...] }]
```

## 🧪 Testing

### Test Script Usage
```bash
node test-fact-checking-apis.js
```

The test script provides:
- **Comprehensive test case** with multiple issues
- **Edge case scenarios** (empty, clean, medical, political content)
- **Expected results documentation**
- **Manual testing instructions**

### Test Coverage
- ✅ NER with multiple entity types
- ✅ Quote detection and attribution
- ✅ High-risk medical/legal claims
- ✅ Sensitive topic detection
- ✅ Cliché density calculation
- ✅ Plagiarism similarity scoring
- ✅ Verification panel generation
- ✅ Export blocking logic
- ✅ Quality scoring algorithms

## 📊 Performance Metrics

### Processing Times (Estimated)
- **NER Analysis**: ~2-3 seconds for 1000 words
- **Risk Assessment**: ~1-2 seconds for 1000 words  
- **Cliché Detection**: ~0.5-1 seconds for 1000 words
- **Comprehensive Analysis**: ~4-6 seconds for 1000 words (parallel processing)

### Accuracy Targets
- **Entity Detection**: >90% precision for high-confidence entities
- **Cliché Detection**: >95% precision with trie + AI validation
- **Risk Classification**: Conservative approach prioritizing safety
- **Quote Detection**: >85% recall for attribution-requiring content

## 🔐 Security & Privacy

### Content Handling
- **No persistent storage** of speech content in logs
- **Anonymized processing** when speechId not provided
- **Secure API communication** with CORS protection
- **Rate limiting ready** for production deployment

### Risk Mitigation
- **Conservative flagging** to avoid false negatives on safety
- **Multiple validation layers** for critical decisions
- **Graceful degradation** when AI services unavailable
- **Export blocking** for unresolved critical issues

## 🚀 Integration Points

### Existing Systems
- **Database Schema**: Integrates with existing `humanizationPasses`, `criticFeedback`, and `clicheAnalysis` tables
- **AI Infrastructure**: Uses established OpenAI integration patterns
- **Stylometry System**: Compatible with existing persona and style analysis
- **Humanization Pipeline**: Can be integrated as additional passes

### Frontend Integration
```typescript
// In your speech editor component
import VerificationPanel from '@/components/VerificationPanel'

const [verificationData, setVerificationData] = useState(null)
const [showVerification, setShowVerification] = useState(false)

const runFactCheck = async () => {
  const response = await fetch('/api/comprehensive-fact-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: speechText, speechId })
  })
  
  const { data } = await response.json()
  setVerificationData(data.verificationPanel)
  setShowVerification(true)
}

return (
  <>
    <button onClick={runFactCheck}>Run Fact Check</button>
    {showVerification && (
      <VerificationPanel
        title={verificationData.title}
        requiresAction={verificationData.requiresAction}
        sections={verificationData.sections}
        onItemAcknowledge={handleAcknowledge}
        onClose={() => setShowVerification(false)}
        exportBlocked={verificationData.exportBlocked}
      />
    )}
  </>
)
```

## 📈 Future Enhancements

### Potential Improvements
1. **External API Integration**: Google Fact Check Tools, PolitiFact API
2. **Machine Learning Models**: Custom trained models for domain-specific detection
3. **Real-time Analysis**: WebSocket-based live checking during editing
4. **Batch Processing**: Bulk analysis for multiple speeches
5. **Analytics Dashboard**: Admin insights into common issues and trends

### Database Enhancements
```sql
-- Suggested additional tables for comprehensive tracking
CREATE TABLE fact_check_analyses (
  id UUID PRIMARY KEY,
  speech_id UUID REFERENCES speeches(id),
  analysis_type VARCHAR(50),
  entities JSONB,
  quotes JSONB,
  risk_assessment JSONB,
  quality_metrics JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE verification_acknowledgments (
  id UUID PRIMARY KEY,
  analysis_id UUID REFERENCES fact_check_analyses(id),
  item_id VARCHAR(255),
  acknowledged BOOLEAN,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  notes TEXT
);
```

## ✅ Project Plan Status

**Section 6.1 - NER & Quote Source**: ✅ **COMPLETE**
- [x] Named entity detection with link-out suggestions
- [x] Quote detection with source prompts  
- [x] Fact-checking API integration ready
- [x] Report lists entities/quotes with suggested URLs

**Section 6.2 - Claiminess & Sensitive Topics**: ✅ **COMPLETE**  
- [x] Classifier for high-risk claims and sensitive lexicon flags
- [x] Verification panel for acknowledging/revising flagged lines
- [x] Export blocked until red flags acknowledged

**Section 6.3 - Cliché/Plagiarism Scan**: ✅ **COMPLETE**
- [x] Cliché phrase index with trie data structure
- [x] Similarity checker and rewrite suggestions  
- [x] Density threshold enforcement (< 0.8/100 tokens)

---

🎉 **All Section 6 requirements successfully implemented and ready for integration!**