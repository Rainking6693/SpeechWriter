#!/usr/bin/env node

/**
 * Quality Threshold Validation Script
 * 
 * This script validates that our quality detection algorithms are meeting
 * their expected thresholds and haven't regressed.
 */

const { analyzeClichesAdvanced } = require('../../../apps/api/netlify/functions/lib/cliche-detection-utils');
const { calculateStylemetryDistance } = require('../../../apps/api/netlify/functions/lib/cliche-detection-utils');

// Quality thresholds that must be maintained
const THRESHOLDS = {
  clicheDensity: {
    low: 0.3,
    medium: 0.8,
    high: 1.5,
  },
  stylometryDistance: {
    acceptable: 0.3,
    warning: 0.5,
    poor: 1.0,
  }
};

// Test samples
const TEST_SAMPLES = {
  highClicheText: `
    At the end of the day, we need to think outside the box and push the envelope.
    It's not rocket science - we just need to hit the ground running and move the needle.
    When push comes to shove, we'll give 110% and go the extra mile to achieve our goals.
  `,
  lowClicheText: `
    The quarterly analysis reveals several important trends in consumer behavior. 
    Digital adoption rates increased by 23% compared to the previous period, 
    with mobile engagement showing the strongest growth trajectory.
  `,
};

async function validateThresholds() {
  console.log('🔍 Validating quality thresholds...');
  
  let failureCount = 0;
  const results = {};

  try {
    // Test cliché density thresholds
    console.log('\n📊 Testing cliché density thresholds...');
    
    const highClicheResult = await analyzeClichesAdvanced(TEST_SAMPLES.highClicheText);
    const lowClicheResult = await analyzeClichesAdvanced(TEST_SAMPLES.lowClicheText);
    
    results.clicheDensity = {
      highClicheText: highClicheResult.density,
      lowClicheText: lowClicheResult.density,
    };

    console.log(`High cliché text density: ${highClicheResult.density.toFixed(3)}`);
    console.log(`Low cliché text density: ${lowClicheResult.density.toFixed(3)}`);

    // Validate high cliché detection
    if (highClicheResult.density <= THRESHOLDS.clicheDensity.high) {
      console.error(`❌ THRESHOLD FAILURE: High cliché text density (${highClicheResult.density.toFixed(3)}) should be > ${THRESHOLDS.clicheDensity.high}`);
      failureCount++;
    } else {
      console.log(`✅ High cliché text properly detected`);
    }

    // Validate low cliché detection  
    if (lowClicheResult.density >= THRESHOLDS.clicheDensity.medium) {
      console.error(`❌ THRESHOLD FAILURE: Low cliché text density (${lowClicheResult.density.toFixed(3)}) should be < ${THRESHOLDS.clicheDensity.medium}`);
      failureCount++;
    } else {
      console.log(`✅ Low cliché text properly classified`);
    }

    // Test stylometry distance calculations
    console.log('\n📏 Testing stylometry distance calculations...');
    
    const formalStyle = {
      avgSentenceLength: 18.5,
      complexityScore: 0.75,
      vocabularyRange: 0.85,
      passiveVoiceRatio: 0.3,
    };
    
    const casualStyle = {
      avgSentenceLength: 12.2, 
      complexityScore: 0.45,
      vocabularyRange: 0.65,
      passiveVoiceRatio: 0.1,
    };
    
    const identicalDistance = calculateStylemetryDistance(formalStyle, formalStyle);
    const differentDistance = calculateStylemetryDistance(formalStyle, casualStyle);
    
    results.stylometry = {
      identicalDistance,
      differentDistance,
    };

    console.log(`Identical styles distance: ${identicalDistance.toFixed(3)}`);
    console.log(`Different styles distance: ${differentDistance.toFixed(3)}`);

    // Validate identical styles should be very close
    if (identicalDistance > 0.1) {
      console.error(`❌ THRESHOLD FAILURE: Identical styles distance (${identicalDistance.toFixed(3)}) should be < 0.1`);
      failureCount++;
    } else {
      console.log(`✅ Identical styles properly matched`);
    }

    // Validate different styles should be detectable
    if (differentDistance < THRESHOLDS.stylometryDistance.warning) {
      console.error(`❌ THRESHOLD FAILURE: Different styles distance (${differentDistance.toFixed(3)}) should be >= ${THRESHOLDS.stylometryDistance.warning}`);
      failureCount++;
    } else {
      console.log(`✅ Different styles properly detected`);
    }

    // Performance validation
    console.log('\n⚡ Testing performance thresholds...');
    
    const startTime = Date.now();
    await analyzeClichesAdvanced(TEST_SAMPLES.highClicheText.repeat(5));
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    results.performance = {
      clicheAnalysisDuration: duration,
    };

    console.log(`Cliché analysis duration: ${duration}ms`);
    
    if (duration > 3000) {  // 3 second threshold
      console.error(`❌ PERFORMANCE FAILURE: Cliché analysis took ${duration}ms, should be < 3000ms`);
      failureCount++;
    } else {
      console.log(`✅ Performance within acceptable limits`);
    }

  } catch (error) {
    console.error(`❌ ERROR during threshold validation:`, error);
    failureCount++;
  }

  // Save results for baseline comparison
  const fs = require('fs');
  const path = require('path');
  
  const resultsDir = path.join(__dirname, '..', 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const resultsPath = path.join(resultsDir, `threshold-validation-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    thresholds: THRESHOLDS,
    results,
    failureCount,
    status: failureCount === 0 ? 'PASS' : 'FAIL',
  }, null, 2));

  console.log(`\n📄 Results saved to: ${resultsPath}`);

  // Summary
  console.log('\n' + '='.repeat(50));
  if (failureCount === 0) {
    console.log('🎉 ALL QUALITY THRESHOLDS PASSED!');
    console.log('Quality detection algorithms are performing within expected parameters.');
  } else {
    console.log(`❌ QUALITY THRESHOLD FAILURES: ${failureCount}`);
    console.log('Quality detection algorithms have regressed and need attention.');
  }
  console.log('='.repeat(50));

  // Exit with appropriate code for CI
  process.exit(failureCount > 0 ? 1 : 0);
}

// Run the validation
if (require.main === module) {
  validateThresholds().catch(error => {
    console.error('Fatal error during threshold validation:', error);
    process.exit(1);
  });
}

module.exports = { validateThresholds, THRESHOLDS };