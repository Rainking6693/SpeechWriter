/**
 * Quality Regression Tests
 * 
 * These tests ensure that our quality thresholds and detection algorithms
 * maintain their accuracy over time. Any regression in these tests should
 * fail the CI pipeline.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { analyzeClichesAdvanced, calculateStylemetryDistance } from '../../apps/api/netlify/functions/lib/cliche-detection-utils';
import { assessRisk } from '../../apps/api/netlify/functions/lib/fact-checking-utils';

// Quality thresholds that must be maintained
const QUALITY_THRESHOLDS = {
  clicheDensity: {
    low: 0.3,      // 0.3 clichés per 100 tokens or less = low
    medium: 0.8,   // 0.8 clichés per 100 tokens or less = medium  
    high: 1.5,     // Above 1.5 clichés per 100 tokens = high
  },
  stylometryDistance: {
    acceptable: 0.3,  // Distance of 0.3 or less = acceptable match
    warning: 0.5,     // Distance 0.3-0.5 = warning
    poor: 1.0,        // Distance above 0.5 = poor match
  },
  riskAssessment: {
    factualClaims: {
      highRisk: 0.7,     // Confidence above 0.7 = high risk claim
      mediumRisk: 0.4,   // Confidence 0.4-0.7 = medium risk
    }
  }
};

// Test data sets with known quality scores
const TEST_SAMPLES = {
  lowClicheText: `
    In today's competitive business environment, we must leverage synergies 
    to create sustainable value propositions. Our innovative solutions will 
    revolutionize the industry through cutting-edge technology and 
    customer-centric approaches.
  `,
  
  highClicheText: `
    At the end of the day, we need to think outside the box and push the envelope.
    It's not rocket science - we just need to hit the ground running and move the needle.
    When push comes to shove, we'll give 110% and go the extra mile to achieve our goals.
    Time is money, and we can't afford to miss the boat or drop the ball.
  `,
  
  neutralText: `
    The quarterly analysis reveals several important trends in consumer behavior. 
    Digital adoption rates increased by 23% compared to the previous period, 
    with mobile engagement showing the strongest growth trajectory. Our research 
    indicates that personalized experiences drive higher satisfaction scores.
  `,
  
  // Sample style characteristics for testing stylometry
  formalStyle: {
    avgSentenceLength: 18.5,
    complexityScore: 0.75,
    vocabularyRange: 0.85,
    passiveVoiceRatio: 0.3,
  },
  
  casualStyle: {
    avgSentenceLength: 12.2,
    complexityScore: 0.45,
    vocabularyRange: 0.65,
    passiveVoiceRatio: 0.1,
  },
};

// High-risk factual claims for testing
const RISK_TEST_CLAIMS = {
  highRisk: [
    'Studies show that 95% of startups fail within their first year',
    'Scientists have proven that artificial intelligence will replace all jobs by 2030',
    'Research indicates that this supplement can cure cancer',
  ],
  
  lowRisk: [
    'Many entrepreneurs face challenges when starting new businesses',
    'Technology continues to evolve and impact various industries', 
    'Health and wellness are important considerations for most people',
  ],
  
  factualNeutral: [
    'The company was founded in 1995',
    'Our headquarters are located in San Francisco',
    'The meeting is scheduled for 3 PM',
  ],
};

describe('Quality Regression Tests', () => {
  
  describe('Cliché Density Detection', () => {
    test('should maintain low cliché detection accuracy', async () => {
      const result = await analyzeClichesAdvanced(TEST_SAMPLES.lowClicheText);
      const clicheDensity = result.density;
      
      expect(clicheDensity).toBeLessThan(QUALITY_THRESHOLDS.clicheDensity.low);
      expect(result.cliches.length).toBeLessThan(2);
    });

    test('should detect high cliché content accurately', async () => {
      const result = await analyzeClichesAdvanced(TEST_SAMPLES.highClicheText);
      const clicheDensity = result.density;
      
      expect(clicheDensity).toBeGreaterThan(QUALITY_THRESHOLDS.clicheDensity.high);
      expect(result.cliches.length).toBeGreaterThan(8); // Should detect most clichés
    });

    test('should handle neutral content appropriately', async () => {
      const result = await analyzeClichesAdvanced(TEST_SAMPLES.neutralText);
      const clicheDensity = result.density;
      
      expect(clicheDensity).toBeLessThan(QUALITY_THRESHOLDS.clicheDensity.medium);
      expect(clicheDensity).toBeGreaterThan(0); // Some business language might be flagged
    });

    test('cliché detection performance should be consistent', async () => {
      const results = [];
      const iterations = 5;
      
      // Run multiple times to ensure consistency
      for (let i = 0; i < iterations; i++) {
        const result = await analyzeClichesAdvanced(TEST_SAMPLES.highClicheText);
        results.push(result.density);
      }
      
      const avgDensity = results.reduce((sum, d) => sum + d, 0) / results.length;
      const variance = results.reduce((sum, d) => sum + Math.pow(d - avgDensity, 2), 0) / results.length;
      
      // Variance should be low (consistent results)
      expect(variance).toBeLessThan(0.01);
      expect(avgDensity).toBeGreaterThan(QUALITY_THRESHOLDS.clicheDensity.high);
    });
  });

  describe('Stylometry Distance Calculation', () => {
    test('should detect similar styles accurately', async () => {
      // Test with identical style characteristics
      const distance = calculateStylemetryDistance(
        TEST_SAMPLES.formalStyle, 
        TEST_SAMPLES.formalStyle
      );
      
      expect(distance).toBeLessThan(0.1); // Should be very close to 0
    });

    test('should detect different styles accurately', async () => {
      const distance = calculateStylemetryDistance(
        TEST_SAMPLES.formalStyle,
        TEST_SAMPLES.casualStyle  
      );
      
      expect(distance).toBeGreaterThan(QUALITY_THRESHOLDS.stylometryDistance.warning);
    });

    test('should maintain stylometry threshold accuracy', async () => {
      // Create slightly different style (should be in warning range)
      const slightlyDifferentStyle = {
        ...TEST_SAMPLES.formalStyle,
        avgSentenceLength: TEST_SAMPLES.formalStyle.avgSentenceLength + 2,
        complexityScore: TEST_SAMPLES.formalStyle.complexityScore + 0.05,
      };
      
      const distance = calculateStylemetryDistance(
        TEST_SAMPLES.formalStyle,
        slightlyDifferentStyle
      );
      
      expect(distance).toBeGreaterThan(QUALITY_THRESHOLDS.stylometryDistance.acceptable);
      expect(distance).toBeLessThan(QUALITY_THRESHOLDS.stylometryDistance.warning);
    });
  });

  describe('Risk Assessment Accuracy', () => {
    test('should identify high-risk claims', async () => {
      for (const claim of RISK_TEST_CLAIMS.highRisk) {
        const riskAssessment = await assessRisk(claim);
        
        expect(riskAssessment.confidence).toBeGreaterThan(
          QUALITY_THRESHOLDS.riskAssessment.factualClaims.highRisk
        );
        expect(riskAssessment.risk_level).toBe('high');
      }
    });

    test('should correctly assess low-risk content', async () => {
      for (const claim of RISK_TEST_CLAIMS.lowRisk) {
        const riskAssessment = await assessRisk(claim);
        
        expect(riskAssessment.confidence).toBeLessThan(
          QUALITY_THRESHOLDS.riskAssessment.factualClaims.mediumRisk
        );
      }
    });

    test('should handle factual neutral statements appropriately', async () => {
      for (const claim of RISK_TEST_CLAIMS.factualNeutral) {
        const riskAssessment = await assessRisk(claim);
        
        // Factual statements should have low risk scores
        expect(riskAssessment.risk_level).toBeOneOf(['low', 'medium']);
        expect(riskAssessment.confidence).toBeLessThan(
          QUALITY_THRESHOLDS.riskAssessment.factualClaims.highRisk
        );
      }
    });
  });

  describe('Performance Regression Tests', () => {
    test('cliché analysis should complete within performance threshold', async () => {
      const startTime = Date.now();
      await analyzeClichesAdvanced(TEST_SAMPLES.highClicheText.repeat(10)); // Longer text
      const endTime = Date.now();
      
      // Should complete within 5 seconds for reasonable text length
      expect(endTime - startTime).toBeLessThan(5000);
    });

    test('stylometry calculation should be performant', async () => {
      const iterations = 100;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        calculateStylemetryDistance(
          TEST_SAMPLES.formalStyle,
          TEST_SAMPLES.casualStyle
        );
      }
      
      const endTime = Date.now();
      const avgTime = (endTime - startTime) / iterations;
      
      // Should average less than 10ms per calculation
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty text gracefully', async () => {
      const result = await analyzeClichesAdvanced('');
      expect(result.density).toBe(0);
      expect(result.cliches).toHaveLength(0);
    });

    test('should handle very short text', async () => {
      const result = await analyzeClichesAdvanced('Hello world.');
      expect(result).toBeDefined();
      expect(typeof result.density).toBe('number');
    });

    test('should handle special characters and formatting', async () => {
      const textWithFormatting = `
        <h1>Title</h1>
        <p>Paragraph with **bold** and *italic* text.</p>
        [STAGE DIRECTION] More content here.
      `;
      
      const result = await analyzeClichesAdvanced(textWithFormatting);
      expect(result).toBeDefined();
      expect(result.density).toBeGreaterThanOrEqual(0);
    });
  });
});

// Helper function for test readability
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});

// Type augmentation for the custom matcher
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}