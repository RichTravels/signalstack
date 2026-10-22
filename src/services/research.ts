import type { SupabaseClient } from '@supabase/supabase-js';

export interface ResearchResult {
  companyName: string;
  rawScrapedText: string;
  simulated: true;
}

const SAMPLE_PARAGRAPH = `
  This company is an enterprise technology provider specializing in cloud infrastructure, B2B software solutions, and automated workflows.
  Recent corporate filings indicate an active tech stack conversion migrating heavily toward Next.js frameworks, TypeScript microservices, and PostgreSQL backends.
  Industry press releases confirm they recently secured an expansion round to scale operations globally and are aggressively hiring technical staff to automate internal operational workflows.
`.trim();

export async function runResearchStep(
  supabase: SupabaseClient,
  jobId: string,
  companyName: string
): Promise<ResearchResult> {
  const startTime = Date.now();
  
  try {
    await supabase.from('pipeline_telemetry').insert([
      {
        job_id: jobId,
        step_name: 'RESEARCH',
        log_level: 'INFO',
        message: `Demo research for "${companyName}": waiting 1.5s, then returning the shared sample paragraph. No website or dataset is queried.`,
        execution_time_ms: 0
      }
    ]);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockScrapedPayload = `Demo sample for ${companyName}. ${SAMPLE_PARAGRAPH}`;

    const executionTime = Date.now() - startTime;

    // 4. Log the successful step completion
    await supabase.from('pipeline_telemetry').insert([
      {
        job_id: jobId,
        step_name: 'RESEARCH',
        log_level: 'INFO',
        message: `Demo research finished for "${companyName}". The paragraph is a fixed sample and is the same for every company.`,
        execution_time_ms: executionTime
      }
    ]);

    return {
      companyName,
      rawScrapedText: mockScrapedPayload,
      simulated: true,
    };

  } catch (error: unknown) {
    const executionTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown network anomaly';
    
    // 5. System level failure monitoring log
    await supabase.from('pipeline_telemetry').insert([
      {
        job_id: jobId,
        step_name: 'RESEARCH',
        log_level: 'ERROR',
        message: `Demo research step failed: ${errorMessage}`,
        execution_time_ms: executionTime
      }
    ]);
    
    throw error;
  }
}
