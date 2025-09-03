/**
 * Test script for fact checking and risk assessment APIs
 * Run with: node test-fact-checking-apis.js
 */

const testSpeechText = `
Good evening, everyone. Thank you for being here tonight.

As Albert Einstein once said, "The definition of insanity is doing the same time over and over again and expecting different results." This quote perfectly captures what we're seeing in our industry today.

Studies show that 90% of companies fail to adapt to change. Research proves that innovative thinking is what separates the winners from the losers. At the end of the day, we need to think outside the box and move the needle on our core competencies.

Our revolutionary new product will cure the problems that have plagued our industry for years. It's a game changer that will deliver synergy across all our touchpoints. This is low hanging fruit that we simply cannot ignore.

According to Dr. Sarah Johnson from Harvard Medical School, our solution reduces stress by 85% and improves productivity by 200%. These aren't just numbers - they're guaranteed results that will change your life forever.

Going forward, we must push the envelope and take it to the next level. The sky's the limit when we leverage our bandwidth to drill down on best practices and circle back on actionable insights.

Thank you for your time tonight. Let's make every moment count and seize the day!
`

async function testFactCheckingApis() {
  console.log('🧪 Testing Fact Checking and Risk Assessment APIs')
  console.log('=' * 60)
  
  const testData = {
    text: testSpeechText.trim(),
    speechId: 'test-speech-001',
    options: {}
  }
  
  try {
    // Test 1: NER and Quote Detection
    console.log('\n📍 Test 1: Named Entity Recognition & Quote Detection')
    console.log('- Should detect: Einstein, Harvard Medical School, Dr. Sarah Johnson')
    console.log('- Should flag quotes needing attribution')
    console.log('- Should provide verification links')
    
    // Test 2: Risk Assessment
    console.log('\n⚠️  Test 2: Risk Assessment')
    console.log('- Should flag medical claims (stress reduction, productivity)')
    console.log('- Should detect unsubstantiated statistics (90%, 85%, 200%)')
    console.log('- Should identify absolute statements ("guaranteed results")')
    console.log('- Should require acknowledgment before export')
    
    // Test 3: Cliché Detection
    console.log('\n🎭 Test 3: Cliché and Plagiarism Detection')
    console.log('- Should detect multiple clichés:')
    console.log('  • "at the end of the day"')
    console.log('  • "think outside the box"')
    console.log('  • "move the needle"')
    console.log('  • "game changer"')
    console.log('  • "low hanging fruit"')
    console.log('  • "push the envelope"')
    console.log('  • "take it to the next level"')
    console.log('  • "the sky\'s the limit"')
    console.log('- Should calculate high cliché density (likely > 2%)')
    console.log('- Should provide rewrite suggestions')
    console.log('- Should fail density threshold (> 0.8%)')
    
    // Test 4: Comprehensive Analysis
    console.log('\n🔍 Test 4: Comprehensive Analysis')
    console.log('- Should combine all analyses')
    console.log('- Should block export due to critical issues')
    console.log('- Should provide verification panel with multiple sections')
    console.log('- Should generate action plan with HIGH priority items')
    console.log('- Should calculate low overall quality score')
    
    console.log('\n' + '=' * 60)
    console.log('🎯 Expected Results Summary:')
    console.log('- Export Status: BLOCKED (due to medical claims)')
    console.log('- Risk Level: HIGH or CRITICAL')
    console.log('- Cliché Density: > 2% (failing threshold)')
    console.log('- Entities: 3+ detected (Einstein, Johnson, Harvard)')
    console.log('- Quotes: 1+ needing attribution')
    console.log('- Verification Panel: 3 sections (Risk, Fact, Quality)')
    console.log('- Action Plan: Multiple HIGH priority items')
    
    console.log('\n🚀 To test the APIs manually:')
    console.log('1. Start the development server: npm run dev')
    console.log('2. POST to these endpoints with the test data:')
    console.log('   - /api/fact-check-ner')
    console.log('   - /api/risk-assessment') 
    console.log('   - /api/cliche-plagiarism-scan')
    console.log('   - /api/comprehensive-fact-check')
    console.log('\n📝 Test Data (JSON):')
    console.log(JSON.stringify(testData, null, 2))
    
  } catch (error) {
    console.error('❌ Test setup error:', error)
  }
}

// Additional test cases for edge cases
const edgeCases = {
  empty: {
    description: 'Empty text',
    text: '',
    expectedResult: 'Should return validation error'
  },
  
  clean: {
    description: 'Clean, high-quality text',
    text: 'Welcome everyone. Tonight I want to share three specific insights from our recent customer research. First, 47% of respondents cited speed as their primary concern, based on our survey of 1,247 customers conducted by Nielsen Research in March 2024. Second, our engineering team discovered that optimizing database queries reduced response times by 23% in controlled testing. Third, implementing automated workflows increased team productivity by 31% according to our Q2 internal metrics. These findings suggest concrete opportunities for improvement.',
    expectedResult: 'Should pass all checks with minimal issues'
  },
  
  medical: {
    description: 'Medical claims requiring disclaimers',
    text: 'Our new supplement cures depression and eliminates anxiety in just 30 days. Clinical studies prove it works 100% of the time with no side effects.',
    expectedResult: 'Should trigger CRITICAL risk level and block export'
  },
  
  political: {
    description: 'Politically sensitive content',
    text: 'The Democrats have ruined our economy while Republicans offer the only real solutions. Every liberal policy has failed completely.',
    expectedResult: 'Should detect political sensitivity and absolute statements'
  }
}

async function runEdgeCaseTests() {
  console.log('\n🧩 Edge Case Analysis:')
  console.log('=' * 40)
  
  Object.entries(edgeCases).forEach(([key, testCase]) => {
    console.log(`\n${key.toUpperCase()}: ${testCase.description}`)
    console.log(`Expected: ${testCase.expectedResult}`)
    console.log(`Text length: ${testCase.text.length} characters`)
  })
}

// Run tests
testFactCheckingApis().then(() => {
  runEdgeCaseTests()
  console.log('\n✅ Test documentation complete!')
  console.log('Use this information to validate the API implementations.')
})