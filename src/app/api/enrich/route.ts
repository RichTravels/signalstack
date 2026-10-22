import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSignedInClient } from '@/lib/auth';
import {
  ENRICH_LIMIT,
  ENRICH_WINDOW_MS,
  checkAndRecordLocalLimit,
} from '@/lib/rate-limit';
import { processEnrichmentPipeline } from '@/services/queue';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
    }

    const company =
      typeof body === 'object' && body !== null && 'company' in body
        ? (body as { company: unknown }).company
        : undefined;

    if (!company || typeof company !== 'string' || company.trim() === '') {
      return NextResponse.json({ error: 'Company parameter is required' }, { status: 400 });
    }

    const cleanCompany = company.trim();

    const auth = await requireSignedInClient(request);
    if (!auth) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    const { supabase, userId } = auth;
    const limited = await rateLimitResponse(supabase, userId);
    if (limited) return limited;

    const { data: job, error: jobError } = await supabase
      .from('enrichment_jobs')
      .insert({ company_name: cleanCompany, status: 'pending', user_id: userId })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Job Ingestion Fault:', jobError);
      return NextResponse.json({ error: 'Failed to initialize ingestion queue' }, { status: 500 });
    }

    await supabase.from('pipeline_telemetry').insert({
      job_id: job.id,
      step_name: 'INGESTION',
      log_level: 'INFO',
      message: `Background worker started for "${cleanCompany}". Research in this demo is simulated.`,
      execution_time_ms: 0,
    });

    waitUntil(
      processEnrichmentPipeline(supabase, job.id, cleanCompany, userId).catch((err) => {
        console.error(`Uncaught background worker failure on Job ${job.id}:`, err);
      })
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Processing sequence safely queued',
        jobId: job.id,
        company: cleanCompany,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('API Orchestration Crash:', error);
    return NextResponse.json({ error: 'Internal system fault occurred' }, { status: 500 });
  }
}

async function rateLimitResponse(supabase: SupabaseClient, userId: string) {
  const since = new Date(Date.now() - ENRICH_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from('enrichment_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);

  if (error || count === null) {
    console.error('Rate limit check failed:', error);
    return NextResponse.json(
      { error: 'Could not check the request limit.' },
      { status: 500 }
    );
  }

  if (count >= ENRICH_LIMIT) {
    return tooMany(Math.ceil(ENRICH_WINDOW_MS / 1000));
  }

  const local = checkAndRecordLocalLimit(userId);
  if (!local.allowed) {
    return tooMany(local.retryAfterSeconds);
  }

  return null;
}

function tooMany(retryAfterSeconds: number) {
  const minutes = ENRICH_WINDOW_MS / 60000;
  return NextResponse.json(
    {
      error: `Too many enrichment runs. Limit is ${ENRICH_LIMIT} every ${minutes} minutes.`,
    },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    }
  );
}
