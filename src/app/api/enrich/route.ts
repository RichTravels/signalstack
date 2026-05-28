import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { processEnrichmentPipeline } from '@/services/queue';

export async function POST(request: Request) {
  try {
    const { company } = await request.json();

    // 1. Strict Fail-Fast Validation
    if (!company || typeof company !== 'string' || company.trim() === '') {
      return NextResponse.json({ error: 'Company parameter is required' }, { status: 400 });
    }

    const cleanCompany = company.trim();

    // 2. Initialize the asynchronous job state inside Postgres
    const { data: job, error: jobError } = await supabase
      .from('enrichment_jobs')
      .insert([{ company_name: cleanCompany, status: 'pending' }])
      .select()
      .single();

    if (jobError || !job) {
      console.error('Job Ingestion Fault:', jobError);
      return NextResponse.json({ error: 'Failed to initialize ingestion queue' }, { status: 500 });
    }

    // 3. Write our first primary system telemetry log
    await supabase.from('pipeline_telemetry').insert([
      {
        job_id: job.id,
        step_name: 'INGESTION',
        log_level: 'INFO',
        message: `Asynchronous background worker initialized for company: "${cleanCompany}"`,
        execution_time_ms: 0
      }
    ]);

    // 4. FIRE THE PIPELINE ASYNCHRONOUSLY
    // By intentional design, we do not use 'await' here. 
    // This allows the background workers to execute completely in the background 
    // while we instantly return a response to the user's dashboard interface.
    processEnrichmentPipeline(job.id, cleanCompany).catch((err) => {
      console.error(`Uncaught background worker failure on Job ${job.id}:`, err);
    });

    // 5. Return instant 202 Accepted status containing tracking details
    return NextResponse.json({
      success: true,
      message: 'Processing sequence safely queued',
      jobId: job.id,
      company: cleanCompany
    }, { status: 202 });

  } catch (error) {
    console.error('API Orchestration Crash:', error);
    return NextResponse.json({ error: 'Internal system fault occurred' }, { status: 500 });
  }
}
