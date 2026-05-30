import { openai } from '@/lib/openai';
import { supabase } from '@/lib/supabase';

export interface ExtractedSignals {
  techStack: string[];
  recentNews: string;
}

export async function runExtractionStep(jobId: string, companyName: string, rawText: string): Promise<ExtractedSignals> {
  const startTime = Date.now();

  try {
    // 1. Log the initiation of the AI processing step
    await supabase.from('pipeline_telemetry').insert([
      {
        job_id: jobId,
        step_name: 'EXTRACTION',
        log_level: 'INFO',
        message: `Deploying OpenAI NLP processing node to extract structured data signatures...`,
        execution_time_ms: 0
      }
    ]);

    // 2. Call OpenAI utilizing explicit JSON structural enforcement
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert enterprise systems architect. Analyze the provided company text and extract key technological data signatures. You must return your response strictly as a clean JSON object.`
        },
        {
          role: 'user',
          content: `Extract the technological profile for ${companyName} from this raw data source:\n\n${rawText}`
        }
      ],
      response_format: { type: "json_object" }
    });

    // Add the [0] array index tracker right after choices
const rawJsonString = response.choices[0]?.message?.content;


    if (!rawJsonString) {
      throw new Error('OpenAI downstream node returned an empty execution envelope.');
    }

    // 3. Parse and validate the structure
    const parsedData = JSON.parse(rawJsonString);
    
    // Fallbacks to guarantee data compliance with our Postgres JSONB schemas
    const techStack = Array.isArray(parsedData.techStack) ? parsedData.techStack : ['Unknown'];
    const recentNews = parsedData.recentNews || 'No significant news signals extracted.';

    const executionTime = Date.now() - startTime;

    // 4. Log the successful processing checkpoint
    await supabase.from('pipeline_telemetry').insert([
      {
        job_id: jobId,
        step_name: 'EXTRACTION',
        log_level: 'INFO',
        message: `AI processing complete. Successfully mapped ${techStack.length} architectural tags into data pipeline.`,
        execution_time_ms: executionTime
      }
    ]);

    return {
      techStack,
      recentNews
    };

  } catch (error: any) {
    const executionTime = Date.now() - startTime;

    // 5. Catch and document specific API or JSON parsing runtime errors
    await supabase.from('pipeline_telemetry').insert([
      {
        job_id: jobId,
        step_name: 'EXTRACTION',
        log_level: 'ERROR',
        message: `AI node extraction failed: ${error?.message || 'JSON schema parsing conflict'}`,
        execution_time_ms: executionTime
      }
    ]);

    throw error;
  }
}