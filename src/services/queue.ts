import type { SupabaseClient } from '@supabase/supabase-js';
import { runResearchStep } from './research';
import { runExtractionStep } from './extraction';
import { runScoringStep } from './scoring';

export async function processEnrichmentPipeline(
  supabase: SupabaseClient,
  jobId: string,
  companyName: string,
  userId: string
) {
  try {
    // 1. Update primary job status to 'processing'
    await supabase
      .from('enrichment_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    // 2. Step 1: Research & Scraping
    const researchData = await runResearchStep(supabase, jobId, companyName);

    // 3. Step 2: AI Natural Language Processing Extraction
    const extractedSignals = await runExtractionStep(
      supabase,
      jobId,
      companyName,
      researchData.rawScrapedText
    );

    // 4. Step 3: Algorithmic Scoring Computation
    const scores = await runScoringStep(supabase, jobId, companyName, extractedSignals.techStack);

    // 5. Final Step: Save the completely enriched lead record to Postgres
    const { error: upsertError } = await supabase
      .from('enriched_leads')
      .upsert({
        job_id: jobId,
        company_name: companyName,
        tech_stack: extractedSignals.techStack,
        recent_news: `Demo sample: ${extractedSignals.recentNews}`,
        lead_score: scores.leadScore,
        confidence_percentage: null,
        user_id: userId,
        processed_at: new Date().toISOString()
      }, { onConflict: 'user_id,company_name' });

    if (upsertError) throw upsertError;

    // 6. Mark the primary job status as completely 'completed'
    await supabase
      .from('enrichment_jobs')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    // 7. Write the final telemetry event log
    await supabase.from('pipeline_telemetry').insert([
      {
        job_id: jobId,
        step_name: 'ORCHESTRATION',
        log_level: 'INFO',
        message: `Pipeline finished. Saved a lead scored from the simulated research sample.`,
        execution_time_ms: 0
      }
    ]);

  } catch (error: unknown) {
    console.error(`Pipeline execution crash on Job ${jobId}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal logic error';

    // Critical Fallback: Ensure the job is marked as 'failed' in the database so the UI stops spinning
    await supabase
      .from('enrichment_jobs')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    await supabase.from('pipeline_telemetry').insert([
      {
        job_id: jobId,
        step_name: 'ORCHESTRATION',
        log_level: 'CRITICAL',
        message: `Pipeline aborted due to unhandled crash: ${errorMessage}`,
        execution_time_ms: 0
      }
    ]);
  }
}
