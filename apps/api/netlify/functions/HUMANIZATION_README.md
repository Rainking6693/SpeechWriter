# Speech Humanization Triple-Check Ensemble

A sophisticated AI-powered system that refines speech content through multiple specialized passes, ensuring higher quality, better engagement, and improved alignment with speaker personas.

## 🎯 Overview

The humanization system implements a three-pass ensemble approach:

1. **Pass A - Rhetoric & Specificity**: Adds rhetorical devices and concrete examples
2. **Pass B - Persona Harmonizer**: Aligns content with speaker's style and constraints  
3. **Pass C - Critics & Referee**: Multi-perspective evaluation and optimization

## 🏗️ Architecture

### Core Functions

- **`passA.ts`** - Rhetoric & Specificity enhancement
- **`passB.ts`** - Persona harmonization
- **`critic1.ts`** - Specificity & freshness evaluation
- **`critic2.ts`** - Audience engagement & delivery evaluation
- **`referee.ts`** - Synthesizes critic feedback into optimal improvements
- **`humanize-ensemble.ts`** - Orchestrates the complete pipeline
- **`ab-test-humanization.ts`** - A/B testing framework for quality validation

### Utilities

- **`lib/humanization-utils.ts`** - Shared functions and AI integration

## 🔧 API Endpoints

### Pass A - Rhetoric & Specificity
```
POST /.netlify/functions/passA
```

**Purpose**: Enhance content with rhetorical devices and concrete specificity

**Request Body**:
```json
{
  "speechId": "uuid",
  "inputText": "speech content to enhance",
  "passOrder": 1
}
```

**Features**:
- Adds anaphora, triads, and callbacks
- Replaces vague claims with specific examples
- Measures and reduces cliché density
- Generates quotable closing lines

**Response**:
```json
{
  "success": true,
  "enhancedText": "improved content",
  "changes": [...],
  "metrics": {
    "clicheDensityBefore": 2.5,
    "clicheDensityAfter": 0.8,
    "rhetoricalDevicesAdded": 3,
    "specificityUpgrades": 5
  },
  "analysis": {
    "rhetoricalDevices": {...},
    "quotableLines": [...]
  }
}
```

### Pass B - Persona Harmonizer
```
POST /.netlify/functions/passB
```

**Purpose**: Align content with user's persona and style preferences

**Request Body**:
```json
{
  "speechId": "uuid", 
  "inputText": "content to harmonize",
  "passOrder": 2
}
```

**Features**:
- Adjusts sentence length to match style card
- Enforces tone slider preferences
- Applies DO/DON'T constraints
- Calculates stylometry distance

**Response**:
```json
{
  "success": true,
  "harmonizedText": "persona-aligned content",
  "changes": [...],
  "metrics": {
    "stylometry": {
      "before": {...},
      "after": {...},
      "improvement": 0.3
    }
  }
}
```

### Critic 1 - Specificity & Freshness Focus
```
POST /.netlify/functions/critic1
```

**Purpose**: Evaluate content for specificity and language freshness

**Request Body**:
```json
{
  "speechId": "uuid",
  "humanizationPassId": "uuid",
  "inputText": "content to evaluate"
}
```

**Response**:
```json
{
  "success": true,
  "scores": {
    "specificity": 7.5,
    "freshness": 8.0,
    "performability": 6.5,
    "personaFit": 7.0,
    "overall": 7.25
  },
  "suggestions": [...],
  "strengths": [...],
  "weaknesses": [...]
}
```

### Critic 2 - Audience Engagement Focus
```
POST /.netlify/functions/critic2
```

**Purpose**: Evaluate from audience engagement and delivery perspective

**Features**:
- Audience connection assessment
- Vocal delivery optimization
- Surprise factor and memorability
- Authentic voice consistency

### Referee - Synthesis & Optimization
```
POST /.netlify/functions/referee
```

**Purpose**: Merge critic feedback into optimal improvements

**Request Body**:
```json
{
  "speechId": "uuid",
  "inputText": "content to optimize",
  "critic1Id": "uuid", 
  "critic2Id": "uuid",
  "timeBudgetSeconds": 120
}
```

**Features**:
- Resolves conflicts between critics
- Prioritizes highest-impact edits
- Respects time budget constraints
- Maintains speech coherence

### Complete Ensemble Pipeline
```
POST /.netlify/functions/humanize-ensemble
```

**Purpose**: Run the complete humanization pipeline

**Request Body**:
```json
{
  "speechId": "uuid",
  "inputText": "original speech content",
  "runPassA": true,
  "runPassB": true,
  "runCritics": true,
  "timeBudgetSeconds": 120
}
```

**Response**:
```json
{
  "success": true,
  "originalText": "...",
  "finalText": "...",
  "pipeline": [
    {"step": "Pass A", "status": "completed", "startTime": 1234567890},
    {"step": "Pass B", "status": "completed", "startTime": 1234567891}
  ],
  "metrics": {...},
  "summary": {
    "qualityScore": 1.2,
    "recommendation": "Excellent improvements..."
  }
}
```

### A/B Testing Framework
```
POST /.netlify/functions/ab-test-humanization
```

**Purpose**: Compare original vs humanized content quality

**Features**:
- AI-based comparative analysis
- User feedback collection
- Quality metrics tracking
- Improvement recommendations

## 📊 Quality Metrics

### Cliché Density Scoring
- Measures overused phrases per 100 tokens
- Target: < 1.0 clichés per 100 tokens
- Baseline common clichés list included

### Stylometry Distance
- Calculates alignment with user's style card
- Measures sentence length, punctuation density, complexity
- Target: distance < 0.3 for good alignment

### Critic Scoring Dimensions
1. **Specificity** (0-10): Concrete details and examples
2. **Freshness** (0-10): Original language and memorability  
3. **Performability** (0-10): Live delivery optimization
4. **Persona-Fit** (0-10): Alignment with speaker's voice

## 🗄️ Database Schema

The system uses these tables from `packages/database/src/schema/humanization.ts`:

- **`humanizationPasses`** - Tracks each pass execution
- **`criticFeedback`** - Stores critic evaluations and suggestions
- **`clicheAnalysis`** - Detailed cliché detection results
- **`culturalSensitivityChecks`** - Cultural sensitivity analysis

## 🎚️ Configuration

### Environment Variables
```bash
OPENAI_API_KEY=your_openai_key
DATABASE_URL=your_postgres_url
NEXTAUTH_SECRET=your_auth_secret
```

### Persona Requirements
- Pass B requires a user persona with style card
- Tone sliders, DO/DON'T lists, and sentence length preferences
- Automatically falls back gracefully if no persona exists

## 🚀 Usage Examples

### Basic Enhancement
```javascript
// Enhance with rhetoric and specificity only
const result = await fetch('/.netlify/functions/passA', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    speechId: 'speech-uuid',
    inputText: 'Your speech content here...'
  })
});
```

### Full Pipeline
```javascript
// Run complete humanization ensemble
const result = await fetch('/.netlify/functions/humanize-ensemble', {
  method: 'POST', 
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    speechId: 'speech-uuid',
    inputText: 'Your speech content...',
    timeBudgetSeconds: 120
  })
});
```

### A/B Testing
```javascript
// Compare original vs improved versions
const comparison = await fetch('/.netlify/functions/ab-test-humanization', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({
    speechId: 'speech-uuid',
    originalText: 'original version...',
    humanizedText: 'improved version...'
  })
});
```

## 🎯 Performance & Reliability

### Processing Times
- Pass A: ~10-15 seconds
- Pass B: ~8-12 seconds  
- Critics: ~5-8 seconds each (run in parallel)
- Referee: ~15-20 seconds
- **Total Pipeline**: ~45-60 seconds

### Error Handling
- Graceful degradation if passes fail
- Partial results returned on pipeline errors
- Comprehensive error logging and user feedback

### Rate Limiting
- Respects OpenAI API rate limits
- Implements exponential backoff for retries
- Time budget enforcement prevents runaway processing

## 🔄 Integration Points

### With Existing Systems
- Uses existing auth system (JWT tokens)
- Integrates with persona and style card data
- Connects to speech drafting workflow
- Stores results in established database schema

### UI Integration Points
- Real-time progress updates during processing
- Side-by-side diff viewers for before/after
- Interactive A/B testing interface
- Manual override and review capabilities

## 🏆 Quality Assurance

### Acceptance Criteria Met
✅ **Pass A**: Cliché density reduced, quotable lines generated
✅ **Pass B**: Stylometry distance under threshold, persona alignment  
✅ **Pass C**: Critics provide scored feedback, referee synthesizes optimally
✅ **A/B Testing**: Framework validates improvements over baseline

### Success Metrics
- **Cliché Reduction**: Target 50%+ improvement
- **Persona Alignment**: Stylometry distance < 0.3
- **User Satisfaction**: A/B tests show preference for humanized content
- **Processing Efficiency**: Complete pipeline under 60 seconds

## 🔮 Future Enhancements

### Planned Improvements
- [ ] Cultural sensitivity pass (Pass D)
- [ ] Real-time streaming responses
- [ ] Custom critic configurations
- [ ] Advanced metaphor domain matching
- [ ] Multi-language support

### Performance Optimizations
- [ ] Parallel processing where possible
- [ ] Caching for common improvements
- [ ] Model fine-tuning based on user feedback
- [ ] Reduced token usage through prompt optimization

---

*This humanization system represents a sophisticated approach to AI-assisted speech improvement, balancing automation with human oversight and maintaining authentic voice throughout the enhancement process.*