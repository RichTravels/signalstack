import type { SupabaseClient } from '@supabase/supabase-js';

export interface ScoringResult {
  leadScore: number;
}

export async function runScoringStep(
  supabase: SupabaseClient,
  jobId: string,
  companyName: string,
  techStack: string[]
): Promise<ScoringResult> {
  const startTime = Date.now();

  try {
    await supabase.from('pipeline_telemetry').insert([
      {
        job_id: jobId,
        step_name: 'SCORING',
        log_level: 'INFO',
        message: `Scoring tech tags taken from the simulated sample for "${companyName}".`,
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

    const executionTime = Date.now() - startTime;

    await supabase.from('pipeline_telemetry').insert([
      {
        job_id: jobId,
        step_name: 'SCORING',
        log_level: 'INFO',
        message: `Lead score ${leadScore}/100, calculated from the simulated sample.`,
        execution_time_ms: executionTime
      }
    ]);

    return {
      leadScore,
    };

  } catch (error: unknown) {
    const executionTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Mathematical overflow error';
    await supabase.from('pipeline_telemetry').insert([
      {
        job_id: jobId,
        step_name: 'SCORING',
        log_level: 'ERROR',
        message: `Scoring routine calculation failed: ${errorMessage}`,
        execution_time_ms: executionTime
      }
    ]);
    throw error;
  }
}
