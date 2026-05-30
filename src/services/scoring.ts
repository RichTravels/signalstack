import { supabase } from '@/lib/supabase';

export interface ScoringResult {
  leadScore: number;
  confidencePercentage: number;
}

export async function runScoringStep(jobId: string, companyName: string, techStack: string[]): Promise<ScoringResult> {
  const startTime = Date.now();

  try {
    await supabase.from('pipeline_telemetry').insert([
      {
        job_id: jobId,
        step_name: 'SCORING',
        log_level: 'INFO',
        message: `Analyzing technological stack compatibility against operational scoring vectors...`,
        execution_time_ms: 0
      }
    ]);

    // 1. Establish core base parameters
    let leadScore = 30; 
    const targetKeywords = ['next.js', 'typescript', 'postgresql', 'react', 'supabase', 'ios', 'swift', 'cloud'];
    const premiumEntities = ['apple', 'stripe', 'vercel', 'google', 'microsoft', 'amazon'];

    // 2. High-Value Global Firm Multiplier Check
    if (premiumEntities.includes(companyName.toLowerCase().trim())) {
      leadScore += 40; // Give automatic baseline premium credit to tier-1 targets
    }
    
    // 3. Match array technology variables cleanly
    techStack.forEach((tech) => {
      const cleanTech = tech.toLowerCase().trim();
      if (targetKeywords.includes(cleanTech)) {
        leadScore += 15; 
      }
    });

    // 4. Operational limits safeguard caps
    if (leadScore > 100) leadScore = 100;

    const confidencePercentage = 0.95; 
    const executionTime = Date.now() - startTime;

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
