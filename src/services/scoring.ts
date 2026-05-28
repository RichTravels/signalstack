import { supabase } from '@/lib/supabase';

export interface ScoringResult {
  leadScore: number;
  confidencePercentage: number;
}

export async function runScoringStep(jobId: string, companyName: string, techStack: string[]): Promise<ScoringResult> {
  const startTime = Date.now();

  try {
    // 1. Log the initiation of our business logic calculation step
    await supabase.from('pipeline_telemetry').insert([
      {
        job_id: jobId,
        step_name: 'SCORING',
        log_level: 'INFO',
        message: `Analyzing technological stack compatibility against operational scoring vectors...`,
        execution_time_ms: 0
      }
    ]);

    // 2. Execute concrete business logic scoring rules (No AI hallucination here!)
    let leadScore = 30; // Base score for any operational entity
    
    // Higher scores given to companies using modern technical infrastructure matching our target profiles
    const targetKeywords = ['next.js', 'typescript', 'postgresql', 'react', 'supabase'];
    
    techStack.forEach((tech) => {
      if (targetKeywords.includes(tech.toLowerCase())) {
        leadScore += 12; // Boost score for highly compatible tech stack items
      }
    });

    // Enforce an absolute operational ceiling score of 100
    if (leadScore > 100) leadScore = 100;

    const confidencePercentage = 0.95; // 95% certainty based on explicit rule evaluation
    const executionTime = Date.now() - startTime;

    // 3. Log successful metric generation
    await supabase.from('pipeline_telemetry').insert([
      {
        job_id: jobId,
        step_name: 'SCORING',
        log_level: 'INFO',
        message: `Metrics calculated smoothly. Final Score: ${leadScore}/100. Confidence: 95%.`,
        execution_time_ms: executionTime
      }
    ]);

    return {
      leadScore,
      confidencePercentage
    };

  } catch (error: any) {
    const executionTime = Date.now() - startTime;

    await supabase.from('pipeline_telemetry').insert([
      {
        job_id: jobId,
        step_name: 'SCORING',
        log_level: 'ERROR',
        message: `Scoring routine calculation failed: ${error?.message || 'Mathematical overflow error'}`,
        execution_time_ms: executionTime
      }
    ]);

    throw error;
  }
}
