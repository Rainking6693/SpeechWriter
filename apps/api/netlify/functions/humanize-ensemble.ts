import { Handler } from '@netlify/functions'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import {
  getUserPersona,
  getSpeechWithSections,
  db
} from './lib/humanization-utils'

const ensembleSchema = z.object({
  speechId: z.string().uuid(),
  inputText: z.string().min(1),
  runPassA: z.boolean().optional().default(true),
  runPassB: z.boolean().optional().default(true),
  runCritics: z.boolean().optional().default(true),
  timeBudgetSeconds: z.number().int().positive().optional().default(120)
})

// JWT verification for auth
const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.NEXTAUTH_SECRET!)
  } catch {
    return null
  }
}

// Helper function to call internal functions
async function callInternalFunction(functionName: string, payload: any, authToken: string) {
  const baseUrl = process.env.URL || 'https://aispeechwriter.netlify.app'
  const response = await fetch(`${baseUrl}/.netlify/functions/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(payload)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Function ${functionName} failed: ${response.status} ${errorText}`)
  }
  
  return await response.json()
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  const startTime = Date.now()

  try {
    // Verify authentication
    const authHeader = event.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = verifyToken(token) as any
    if (!decoded?.sub) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token' })
      }
    }

    const userId = decoded.sub
    
    // Parse request
    const body = JSON.parse(event.body || '{}')
    const { speechId, inputText, runPassA, runPassB, runCritics, timeBudgetSeconds } = ensembleSchema.parse(body)

    // Verify speech ownership
    const { speech, sections } = await getSpeechWithSections(speechId)
    if (!speech || speech.userId !== userId) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Speech not found' })
      }
    }

    const results = {
      originalText: inputText,
      passAResult: null,
      passBResult: null,
      critic1Result: null,
      critic2Result: null,
      refereeResult: null,
      finalText: inputText,
      pipeline: [],
      metrics: {},
      errors: []
    }

    let currentText = inputText
    let currentPassId: string | null = null

    try {
      // PASS A: Rhetoric & Specificity
      if (runPassA) {
        console.log('Running Pass A: Rhetoric & Specificity')
        results.pipeline.push({ step: 'Pass A', status: 'running', startTime: Date.now() })
        
        const passAResult = await callInternalFunction('passA', {
          speechId,
          inputText: currentText,
          passOrder: 1
        }, token)
        
        if (passAResult.success) {
          results.passAResult = passAResult
          currentText = passAResult.enhancedText
          currentPassId = passAResult.passId
          results.pipeline[results.pipeline.length - 1].status = 'completed'
          results.pipeline[results.pipeline.length - 1].endTime = Date.now()
          console.log('Pass A completed successfully')
        } else {
          throw new Error('Pass A failed: ' + JSON.stringify(passAResult))
        }
      }

      // PASS B: Persona Harmonizer
      if (runPassB) {
        console.log('Running Pass B: Persona Harmonizer')
        results.pipeline.push({ step: 'Pass B', status: 'running', startTime: Date.now() })
        
        const passBResult = await callInternalFunction('passB', {
          speechId,
          inputText: currentText,
          passOrder: 2
        }, token)
        
        if (passBResult.success) {
          results.passBResult = passBResult
          currentText = passBResult.harmonizedText
          currentPassId = passBResult.passId
          results.pipeline[results.pipeline.length - 1].status = 'completed'
          results.pipeline[results.pipeline.length - 1].endTime = Date.now()
          console.log('Pass B completed successfully')
        } else {
          throw new Error('Pass B failed: ' + JSON.stringify(passBResult))
        }
      }

      // PASS C: Critics and Referee
      if (runCritics && currentPassId) {
        console.log('Running Critics and Referee')
        results.pipeline.push({ step: 'Critics', status: 'running', startTime: Date.now() })
        
        // Run both critics in parallel
        const [critic1Result, critic2Result] = await Promise.all([
          callInternalFunction('critic1', {
            speechId,
            humanizationPassId: currentPassId,
            inputText: currentText
          }, token),
          callInternalFunction('critic2', {
            speechId,
            humanizationPassId: currentPassId,
            inputText: currentText
          }, token)
        ])
        
        if (critic1Result.success && critic2Result.success) {
          results.critic1Result = critic1Result
          results.critic2Result = critic2Result
          results.pipeline[results.pipeline.length - 1].status = 'completed'
          results.pipeline[results.pipeline.length - 1].endTime = Date.now()
          
          // Run referee to synthesize feedback
          console.log('Running Referee')
          results.pipeline.push({ step: 'Referee', status: 'running', startTime: Date.now() })
          
          const refereeResult = await callInternalFunction('referee', {
            speechId,
            inputText: currentText,
            critic1Id: critic1Result.criticId,
            critic2Id: critic2Result.criticId,
            timeBudgetSeconds,
            passOrder: 3
          }, token)
          
          if (refereeResult.success) {
            results.refereeResult = refereeResult
            currentText = refereeResult.finalText
            results.pipeline[results.pipeline.length - 1].status = 'completed'
            results.pipeline[results.pipeline.length - 1].endTime = Date.now()
            console.log('Referee completed successfully')
          } else {
            throw new Error('Referee failed: ' + JSON.stringify(refereeResult))
          }
        } else {
          throw new Error('Critics failed: ' + JSON.stringify({ critic1Result, critic2Result }))
        }
      }

      results.finalText = currentText

      // Calculate overall metrics
      const totalProcessingTime = Date.now() - startTime
      results.metrics = {
        totalProcessingTimeMs: totalProcessingTime,
        stepsCompleted: results.pipeline.filter(p => p.status === 'completed').length,
        totalSteps: results.pipeline.length,
        improvementLayers: {
          passA: results.passAResult?.metrics || null,
          passB: results.passBResult?.metrics || null,
          critics: results.critic1Result && results.critic2Result ? {
            critic1Score: results.critic1Result.scores.overall,
            critic2Score: results.critic2Result.scores.overall,
            consensusLevel: Math.abs(results.critic1Result.scores.overall - results.critic2Result.scores.overall)
          } : null,
          referee: results.refereeResult?.metrics || null
        },
        qualityGains: {
          textLengthChange: currentText.length - inputText.length,
          estimatedReadabilityImprovement: results.refereeResult?.analysis?.qualityMetrics?.overallImprovement || 1.0,
          clicheReduction: results.passAResult?.analysis?.clicheAnalysis?.improvement || 0,
          personaAlignment: results.passBResult?.analysis?.stylometryAnalysis?.improvement || 0
        }
      }

      // Success response
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: JSON.stringify({
          success: true,
          ...results,
          summary: {
            originalLength: inputText.length,
            finalLength: currentText.length,
            improvementLayers: results.pipeline.length,
            totalTimeMs: totalProcessingTime,
            qualityScore: results.refereeResult?.analysis?.qualityMetrics?.overallImprovement || 
                         (results.passBResult?.metrics?.overallScore || 1.0),
            recommendation: generateRecommendation(results)
          }
        })
      }

    } catch (stepError) {
      console.error('Pipeline step error:', stepError)
      results.errors.push({
        step: results.pipeline[results.pipeline.length - 1]?.step || 'unknown',
        error: stepError.message,
        timestamp: new Date().toISOString()
      })
      
      // Mark current step as failed
      if (results.pipeline.length > 0) {
        results.pipeline[results.pipeline.length - 1].status = 'failed'
        results.pipeline[results.pipeline.length - 1].error = stepError.message
        results.pipeline[results.pipeline.length - 1].endTime = Date.now()
      }

      // Return partial results
      return {
        statusCode: 206, // Partial content
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: JSON.stringify({
          success: false,
          partialSuccess: true,
          ...results,
          finalText: currentText, // Return the best we have so far
          summary: {
            originalLength: inputText.length,
            finalLength: currentText.length,
            completedSteps: results.pipeline.filter(p => p.status === 'completed').length,
            totalSteps: results.pipeline.length,
            errors: results.errors.length
          }
        })
      }
    }

  } catch (error) {
    console.error('Error in humanization ensemble:', error)
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to run humanization ensemble',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

function generateRecommendation(results: any): string {
  const completedSteps = results.pipeline.filter(p => p.status === 'completed').length
  
  if (completedSteps === 0) {
    return "No improvements were applied. Please check your input and try again."
  }
  
  if (completedSteps === 1 && results.passAResult) {
    return "Rhetoric and specificity improvements applied. Consider running persona harmonization for better style alignment."
  }
  
  if (completedSteps === 2 && results.passBResult) {
    return "Content enhanced with rhetoric and persona alignment. Consider running the full critic review for maximum quality."
  }
  
  if (completedSteps >= 3) {
    const qualityScore = results.refereeResult?.analysis?.qualityMetrics?.overallImprovement || 1.0
    if (qualityScore > 1.2) {
      return "Excellent! Your speech has been significantly improved across all dimensions."
    } else if (qualityScore > 1.1) {
      return "Good improvements made. Your speech is more engaging and better aligned with your persona."
    } else {
      return "Some improvements applied. Consider revising your persona or providing more specific feedback."
    }
  }
  
  return "Humanization process completed with mixed results."
}

export { handler }